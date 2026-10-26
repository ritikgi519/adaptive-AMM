// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MockERC20.sol";

/**
 * @title AdaptiveAMM
 * @notice A fully onchain, self-adjusting automated market maker (AMM).
 *         Computes dynamic fees inside the smart contract on every single swap,
 *         based entirely on onchain signals (Realized Volatility + Inventory Skew)
 *         without external oracles or offchain keeper bots.
 *
 * Fee Formula:
 *   fee_bps = clamp(
 *       BASE_FEE_BPS (30 bps / 0.30%)
 *       + min(volatility_bps, MAX_VOL_COMPONENT_BPS) (up to +40 bps)
 *       ± skew_component_bps (+25 bps surcharge / -20 bps discount),
 *       MIN_FEE_BPS (5 bps),
 *       MAX_FEE_BPS (100 bps)
 *   )
 */
contract AdaptiveAMM {
    address public immutable token0;
    address public immutable token1;

    uint256 public reserve0;
    uint256 public reserve1;

    // LP Share accounting
    string public constant name = "Adaptive AMM LP Token";
    string public constant symbol = "A-LP";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    // Exact Protocol Fee Constants (in basis points: 100 bps = 1.00%)
    uint256 public constant BASE_FEE_BPS = 30;           // 0.30%
    uint256 public constant MAX_VOL_COMPONENT_BPS = 40;  // Up to +40 bps (+0.40%)
    uint256 public constant MAX_SKEW_SURCHARGE_BPS = 25; // Up to +25 bps surcharge (+0.25%)
    uint256 public constant MAX_SKEW_DISCOUNT_BPS = 20;  // Up to -20 bps discount (-0.20%)
    uint256 public constant MIN_FEE_BPS = 5;             // Floor: 0.05%
    uint256 public constant MAX_FEE_BPS = 100;           // Ceiling: 1.00%

    // Volatility tracking
    uint256 public lastSpotPrice;           // Price scaled by 1e18 (token1 per token0)
    uint256 public volatilityAccumulator;   // Rolling EWMA volatility in BPS
    uint256 public lastTimestamp;           // Timestamp of last interaction
    uint256 public constant DECAY_HALF_LIFE = 180; // 3 minutes decay half-life

    // Initial equilibrium price reference (marked at entry)
    uint256 public initialPrice; // Scaled by 1e18 (token1 per token0)

    // Cumulative stats
    uint256 public totalVolumeUSD;
    uint256 public totalFeesAccruedUSD;
    uint256 public swapCount;

    // Events
    event Mint(address indexed sender, uint256 amount0, uint256 amount1, uint256 liquidity);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, uint256 liquidity);
    event Swap(
        address indexed sender,
        address indexed tokenIn,
        uint256 amountIn,
        uint256 amountOut,
        uint256 feeBps
    );

    modifier nonReentrant() {
        require(!_locked, "ReentrancyGuard: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }
    bool private _locked;

    constructor(address _token0, address _token1) {
        require(_token0 != address(0) && _token1 != address(0), "Zero address");
        require(_token0 != _token1, "Identical tokens");
        token0 = _token0;
        token1 = _token1;
        lastTimestamp = block.timestamp;
    }

    /**
     * @notice Adds initial or subsequent liquidity to the pool.
     */
    function addLiquidity(
        uint256 amount0Desired,
        uint256 amount1Desired,
        address to
    ) external nonReentrant returns (uint256 liquidity) {
        require(amount0Desired > 0 && amount1Desired > 0, "Zero amounts");
        require(to != address(0), "Zero address to");

        uint256 _reserve0 = reserve0;
        uint256 _reserve1 = reserve1;

        uint256 amount0;
        uint256 amount1;

        if (_reserve0 == 0 && _reserve1 == 0) {
            amount0 = amount0Desired;
            amount1 = amount1Desired;
            liquidity = sqrt(amount0 * amount1);
            require(liquidity > 1000, "Insufficient initial liquidity");

            // Mark entry equilibrium price
            initialPrice = (amount1 * 1e18) / amount0;
            lastSpotPrice = initialPrice;
            lastTimestamp = block.timestamp;
        } else {
            uint256 amount1Optimal = (amount0Desired * _reserve1) / _reserve0;
            if (amount1Optimal <= amount1Desired) {
                amount0 = amount0Desired;
                amount1 = amount1Optimal;
            } else {
                uint256 amount0Optimal = (amount1Desired * _reserve0) / _reserve1;
                require(amount0Optimal <= amount0Desired, "Optimal amount exceeds desired");
                amount0 = amount0Optimal;
                amount1 = amount1Desired;
            }

            uint256 liquidity0 = (amount0 * totalSupply) / _reserve0;
            uint256 liquidity1 = (amount1 * totalSupply) / _reserve1;
            liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
            require(liquidity > 0, "Zero liquidity minted");
        }

        MockERC20(token0).transferFrom(msg.sender, address(this), amount0);
        MockERC20(token1).transferFrom(msg.sender, address(this), amount1);

        reserve0 = _reserve0 + amount0;
        reserve1 = _reserve1 + amount1;

        balanceOf[to] += liquidity;
        totalSupply += liquidity;

        emit Mint(to, amount0, amount1, liquidity);
    }

    /**
     * @notice Burns LP tokens to redeem underlying reserves.
     */
    function removeLiquidity(
        uint256 liquidity,
        address to
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        require(liquidity > 0, "Zero liquidity");
        require(balanceOf[msg.sender] >= liquidity, "Insufficient LP balance");

        amount0 = (liquidity * reserve0) / totalSupply;
        amount1 = (liquidity * reserve1) / totalSupply;

        require(amount0 > 0 && amount1 > 0, "Zero output reserves");

        balanceOf[msg.sender] -= liquidity;
        totalSupply -= liquidity;

        reserve0 -= amount0;
        reserve1 -= amount1;

        MockERC20(token0).transfer(to, amount0);
        MockERC20(token1).transfer(to, amount1);

        emit Burn(msg.sender, amount0, amount1, liquidity);
    }

    /**
     * @notice Returns rolling realized volatility decayed over elapsed time.
     */
    function getDecayedVolatility() public view returns (uint256) {
        if (volatilityAccumulator == 0) return 0;
        uint256 timePassed = block.timestamp > lastTimestamp ? block.timestamp - lastTimestamp : 0;
        if (timePassed == 0) return volatilityAccumulator;

        // Exponential decay approximation: 1 / (1 + timePassed / halfLife)
        uint256 decayFactor = 1e18 / (1e18 + (timePassed * 1e18) / DECAY_HALF_LIFE);
        return (volatilityAccumulator * decayFactor) / 1e18;
    }

    /**
     * @notice Returns the realized volatility fee component, capped at MAX_VOL_COMPONENT_BPS (40 bps).
     */
    function getVolatilityComponent() public view returns (uint256) {
        uint256 vol = getDecayedVolatility();
        uint256 scaledVol = (vol * 20) / 100;
        return scaledVol > MAX_VOL_COMPONENT_BPS ? MAX_VOL_COMPONENT_BPS : scaledVol;
    }

    /**
     * @notice Measures inventory skew relative to initial 50/50 balance.
     *         Trades that rebalance the pool receive a discount (up to -20 bps).
     *         Trades that worsen the skew pay a surcharge (up to +25 bps).
     */
    function getInventorySkew(address tokenIn) public view returns (
        int256 skewComponent,
        bool isRebalancing,
        uint256 driftBps
    ) {
        if (reserve0 == 0 || reserve1 == 0 || initialPrice == 0) {
            return (0, false, 0);
        }

        uint256 value0 = (reserve0 * initialPrice) / 1e18;
        uint256 value1 = reserve1;
        uint256 totalVal = value0 + value1;
        if (totalVal == 0) return (0, false, 0);

        if (value0 > value1) {
            driftBps = ((value0 - value1) * 10000) / totalVal;
        } else {
            driftBps = ((value1 - value0) * 10000) / totalVal;
        }

        bool token0IsOverweight = value0 > value1;
        bool isToken0In = tokenIn == token0;

        if (token0IsOverweight) {
            if (isToken0In) {
                // Worsening skew -> surcharge
                isRebalancing = false;
                uint256 surcharge = (driftBps * MAX_SKEW_SURCHARGE_BPS) / 2000;
                if (surcharge > MAX_SKEW_SURCHARGE_BPS) surcharge = MAX_SKEW_SURCHARGE_BPS;
                skewComponent = int256(surcharge);
            } else {
                // Rebalancing pool -> discount
                isRebalancing = true;
                uint256 discount = (driftBps * MAX_SKEW_DISCOUNT_BPS) / 2000;
                if (discount > MAX_SKEW_DISCOUNT_BPS) discount = MAX_SKEW_DISCOUNT_BPS;
                skewComponent = -int256(discount);
            }
        } else {
            if (!isToken0In) {
                // Worsening skew -> surcharge
                isRebalancing = false;
                uint256 surcharge = (driftBps * MAX_SKEW_SURCHARGE_BPS) / 2000;
                if (surcharge > MAX_SKEW_SURCHARGE_BPS) surcharge = MAX_SKEW_SURCHARGE_BPS;
                skewComponent = int256(surcharge);
            } else {
                // Rebalancing pool -> discount
                isRebalancing = true;
                uint256 discount = (driftBps * MAX_SKEW_DISCOUNT_BPS) / 2000;
                if (discount > MAX_SKEW_DISCOUNT_BPS) discount = MAX_SKEW_DISCOUNT_BPS;
                skewComponent = -int256(discount);
            }
        }
    }

    /**
     * @notice Computes exact dynamic fee for a trade.
     * Formula:
     *   fee_bps = clamp(
     *       BASE_FEE_BPS (30) + min(volatility_bps, 40) ± skew_component_bps,
     *       MIN_FEE_BPS (5),
     *       MAX_FEE_BPS (100)
     *   )
     */
    function calculateFee(address tokenIn) public view returns (
        uint256 feeBps,
        uint256 volComponent,
        int256 skewComponent,
        bool isRebalancing
    ) {
        volComponent = getVolatilityComponent();
        (skewComponent, isRebalancing, ) = getInventorySkew(tokenIn);

        int256 computedFee = int256(BASE_FEE_BPS) + int256(volComponent) + skewComponent;

        if (computedFee < int256(MIN_FEE_BPS)) {
            feeBps = MIN_FEE_BPS;
        } else if (computedFee > int256(MAX_FEE_BPS)) {
            feeBps = MAX_FEE_BPS;
        } else {
            feeBps = uint256(computedFee);
        }
    }

    /**
     * @notice View function to estimate output amount and exact fee breakdown for a swap.
     */
    function getAmountOut(
        uint256 amountIn,
        address tokenIn
    ) public view returns (
        uint256 amountOut,
        uint256 feeBps,
        uint256 volComponent,
        int256 skewComponent,
        bool isRebalancing
    ) {
        require(amountIn > 0, "Zero amount in");
        require(tokenIn == token0 || tokenIn == token1, "Invalid token");

        bool isToken0 = tokenIn == token0;
        uint256 rIn = isToken0 ? reserve0 : reserve1;
        uint256 rOut = isToken0 ? reserve1 : reserve0;
        require(rIn > 0 && rOut > 0, "Insufficient reserves");

        (feeBps, volComponent, skewComponent, isRebalancing) = calculateFee(tokenIn);

        uint256 amountInWithFee = amountIn * (10000 - feeBps);
        uint256 numerator = amountInWithFee * rOut;
        uint256 denominator = (rIn * 10000) + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /**
     * @notice Executes swap with dynamic onchain fee.
     */
    function swap(
        uint256 amountIn,
        uint256 minAmountOut,
        address tokenIn,
        address to
    ) external nonReentrant returns (uint256 amountOut, uint256 feeBps) {
        require(amountIn > 0, "Zero amount in");
        require(tokenIn == token0 || tokenIn == token1, "Invalid token");
        require(to != address(0), "Zero recipient");

        bool isToken0 = tokenIn == token0;
        address tokenOut = isToken0 ? token1 : token0;

        (amountOut, feeBps, , , ) = getAmountOut(amountIn, tokenIn);
        require(amountOut >= minAmountOut, "Slippage exceeded");

        // Pull tokens
        MockERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        // Update reserves
        if (isToken0) {
            reserve0 += amountIn;
            reserve1 -= amountOut;
        } else {
            reserve1 += amountIn;
            reserve0 -= amountOut;
        }

        // Update spot price & volatility in internal function to avoid stack pressure
        _updateVolatility();
        swapCount += 1;

        // Transfer output tokens
        MockERC20(tokenOut).transfer(to, amountOut);

        emit Swap(msg.sender, tokenIn, amountIn, amountOut, feeBps);
    }

    function _updateVolatility() internal {
        uint256 newSpotPrice = (reserve1 * 1e18) / reserve0;
        uint256 currentDecayedVol = getDecayedVolatility();
        uint256 priceDeltaBps = 0;
        if (lastSpotPrice > 0) {
            if (newSpotPrice > lastSpotPrice) {
                priceDeltaBps = ((newSpotPrice - lastSpotPrice) * 10000) / lastSpotPrice;
            } else {
                priceDeltaBps = ((lastSpotPrice - newSpotPrice) * 10000) / lastSpotPrice;
            }
        }

        volatilityAccumulator = (currentDecayedVol * 70 + priceDeltaBps * 30) / 100;
        lastSpotPrice = newSpotPrice;
        lastTimestamp = block.timestamp;
    }

    /**
     * @notice Helper square root implementation.
     */
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
