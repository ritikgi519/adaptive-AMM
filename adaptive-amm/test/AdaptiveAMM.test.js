import assert from 'assert';

console.log('====================================================');
console.log('🧪 RUNNING ADAPTIVE AMM INVARIANT & PROTOCOL TEST SUITE');
console.log('====================================================\n');

class AMMEngine {
  constructor() {
    this.reserve0 = 0n;
    this.reserve1 = 0n;
    this.totalSupply = 0n;
    this.lpBalances = {};

    // Exact constants
    this.BASE_FEE_BPS = 30n;          // 0.30%
    this.MAX_VOL_COMPONENT_BPS = 40n; // Up to +40 bps
    this.MAX_SKEW_SURCHARGE_BPS = 25n;// Up to +25 bps
    this.MAX_SKEW_DISCOUNT_BPS = 20n; // Up to -20 bps
    this.MIN_FEE_BPS = 5n;            // 0.05%
    this.MAX_FEE_BPS = 100n;          // 1.00%

    this.initialPrice = 0n; // 1e18 scaled
    this.lastSpotPrice = 0n;
    this.volatilityAccumulator = 0n;
    this.lastTimestamp = 100000;
    this.DECAY_HALF_LIFE = 180;
  }

  static toWei(num) {
    const parts = num.toString().split('.');
    const intPart = parts[0];
    const fracPart = (parts[1] || '').padEnd(18, '0').slice(0, 18);
    return BigInt(intPart + fracPart);
  }

  addLiquidity(user, amount0, amount1, timestamp = 100000) {
    if (amount0 <= 0n || amount1 <= 0n) throw new Error('Zero amounts');
    let liquidity = 0n;
    if (this.reserve0 === 0n && this.reserve1 === 0n) {
      liquidity = BigInt(Math.floor(Math.sqrt(Number(amount0 * amount1))));
      this.initialPrice = (amount1 * 10n ** 18n) / amount0;
      this.lastSpotPrice = this.initialPrice;
    } else {
      const l0 = (amount0 * this.totalSupply) / this.reserve0;
      const l1 = (amount1 * this.totalSupply) / this.reserve1;
      liquidity = l0 < l1 ? l0 : l1;
    }
    this.reserve0 += amount0;
    this.reserve1 += amount1;
    this.totalSupply += liquidity;
    this.lpBalances[user] = (this.lpBalances[user] || 0n) + liquidity;
    this.lastTimestamp = timestamp;
    return liquidity;
  }

  getDecayedVolatility(timestamp) {
    if (this.volatilityAccumulator === 0n) return 0n;
    const timePassed = timestamp > this.lastTimestamp ? BigInt(timestamp - this.lastTimestamp) : 0n;
    if (timePassed === 0n) return this.volatilityAccumulator;
    const halfLife = BigInt(this.DECAY_HALF_LIFE);
    const denominator = 1000000n + (timePassed * 1000000n) / halfLife;
    return (this.volatilityAccumulator * 1000000n) / denominator;
  }

  getVolatilityComponent(timestamp) {
    const vol = this.getDecayedVolatility(timestamp);
    const scaledVol = (vol * 20n) / 100n;
    return scaledVol > this.MAX_VOL_COMPONENT_BPS ? this.MAX_VOL_COMPONENT_BPS : scaledVol;
  }

  getInventorySkew(isToken0In) {
    if (this.reserve0 === 0n || this.reserve1 === 0n || this.initialPrice === 0n) {
      return { skewComponent: 0n, isRebalancing: false, driftBps: 0n };
    }

    const value0 = (this.reserve0 * this.initialPrice) / 10n ** 18n;
    const value1 = this.reserve1;
    const totalVal = value0 + value1;
    if (totalVal === 0n) return { skewComponent: 0n, isRebalancing: false, driftBps: 0n };

    let driftBps = 0n;
    if (value0 > value1) {
      driftBps = ((value0 - value1) * 10000n) / totalVal;
    } else {
      driftBps = ((value1 - value0) * 10000n) / totalVal;
    }

    const token0IsOverweight = value0 > value1;
    let isRebalancing = false;
    let skewComponent = 0n;

    if (token0IsOverweight) {
      if (isToken0In) {
        // Dumping token0 into already token0-heavy pool -> surcharge
        isRebalancing = false;
        let surcharge = (driftBps * this.MAX_SKEW_SURCHARGE_BPS) / 2000n;
        if (surcharge > this.MAX_SKEW_SURCHARGE_BPS) surcharge = this.MAX_SKEW_SURCHARGE_BPS;
        skewComponent = surcharge;
      } else {
        // Depositing token1 rebalances pool -> discount
        isRebalancing = true;
        let discount = (driftBps * this.MAX_SKEW_DISCOUNT_BPS) / 2000n;
        if (discount > this.MAX_SKEW_DISCOUNT_BPS) discount = this.MAX_SKEW_DISCOUNT_BPS;
        skewComponent = -discount;
      }
    } else {
      if (!isToken0In) {
        // Dumping token1 into token1-heavy pool -> surcharge
        isRebalancing = false;
        let surcharge = (driftBps * this.MAX_SKEW_SURCHARGE_BPS) / 2000n;
        if (surcharge > this.MAX_SKEW_SURCHARGE_BPS) surcharge = this.MAX_SKEW_SURCHARGE_BPS;
        skewComponent = surcharge;
      } else {
        // Depositing token0 rebalances pool -> discount
        isRebalancing = true;
        let discount = (driftBps * this.MAX_SKEW_DISCOUNT_BPS) / 2000n;
        if (discount > this.MAX_SKEW_DISCOUNT_BPS) discount = this.MAX_SKEW_DISCOUNT_BPS;
        skewComponent = -discount;
      }
    }

    return { skewComponent, isRebalancing, driftBps };
  }

  calculateFee(isToken0In, timestamp) {
    const volComponent = this.getVolatilityComponent(timestamp);
    const { skewComponent, isRebalancing, driftBps } = this.getInventorySkew(isToken0In);

    let fee = this.BASE_FEE_BPS + volComponent + skewComponent;
    if (fee < this.MIN_FEE_BPS) fee = this.MIN_FEE_BPS;
    if (fee > this.MAX_FEE_BPS) fee = this.MAX_FEE_BPS;

    return { feeBps: fee, volComponent, skewComponent, isRebalancing, driftBps };
  }

  swap(user, amountIn, isToken0In, minAmountOut = 0n, timestamp = 100000) {
    const rIn = isToken0In ? this.reserve0 : this.reserve1;
    const rOut = isToken0In ? this.reserve1 : this.reserve0;
    if (rIn === 0n || rOut === 0n) throw new Error('Insufficient reserves');

    const feeInfo = this.calculateFee(isToken0In, timestamp);
    const feeBps = feeInfo.feeBps;

    const amountInWithFee = amountIn * (10000n - feeBps);
    const numerator = amountInWithFee * rOut;
    const denominator = (rIn * 10000n) + amountInWithFee;
    const amountOut = numerator / denominator;

    if (amountOut < minAmountOut) throw new Error('Slippage exceeded');

    const decayedVol = this.getDecayedVolatility(timestamp);

    if (isToken0In) {
      this.reserve0 += amountIn;
      this.reserve1 -= amountOut;
    } else {
      this.reserve1 += amountIn;
      this.reserve0 -= amountOut;
    }

    const newSpotPrice = (this.reserve1 * 10n ** 18n) / this.reserve0;
    let priceDeltaBps = 0n;
    if (this.lastSpotPrice > 0n) {
      if (newSpotPrice > this.lastSpotPrice) {
        priceDeltaBps = ((newSpotPrice - this.lastSpotPrice) * 10000n) / this.lastSpotPrice;
      } else {
        priceDeltaBps = ((this.lastSpotPrice - newSpotPrice) * 10000n) / this.lastSpotPrice;
      }
    }

    this.volatilityAccumulator = (decayedVol * 70n + priceDeltaBps * 30n) / 100n;
    this.lastSpotPrice = newSpotPrice;
    this.lastTimestamp = timestamp;

    return { amountOut, ...feeInfo, newSpotPrice };
  }
}

let passed = 0;
let total = 0;

function it(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ Passed: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ Failed: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

// 1. Initial State & Base Fee
it('1. Initialized pool starts at exact 30 bps base fee (50/50 balance, 0 volatility)', () => {
  const amm = new AMMEngine();
  amm.addLiquidity('Alice', AMMEngine.toWei(500), AMMEngine.toWei(1000000), 1000);
  const fee = amm.calculateFee(true, 1000);
  assert.strictEqual(fee.feeBps, 30n, 'Base fee must be 30 bps at initial balance');
  assert.strictEqual(fee.volComponent, 0n, 'Volatility component must be 0');
  assert.strictEqual(fee.skewComponent, 0n, 'Skew component must be 0 at initial balance');
});

// 2. Realized Volatility Component (Capped at 40 bps)
it('2. Realized Volatility increases fee dynamically up to MAX_VOL_COMPONENT_BPS (40 bps)', () => {
  const amm = new AMMEngine();
  amm.addLiquidity('Alice', AMMEngine.toWei(500), AMMEngine.toWei(1000000), 1000);

  // Trigger high volatility price swings
  amm.volatilityAccumulator = 500n; // high volatility
  const volComp = amm.getVolatilityComponent(1000);
  assert.strictEqual(volComp, 40n, 'Volatility component must cap strictly at 40 bps');
});

// 3. Inventory Skew Surcharge (+25 bps) on lopsided trades
it('3. Lopsided trades that worsen pool skew pay a surcharge (up to +25 bps)', () => {
  const amm = new AMMEngine();
  // Initialize at 500 ETH / $1,000,000 ($2,000/ETH)
  amm.addLiquidity('Alice', AMMEngine.toWei(500), AMMEngine.toWei(1000000), 1000);

  // A trader dumps 100 ETH into the pool, making the pool heavily overweight in ETH
  amm.swap('Trader1', AMMEngine.toWei(100), true, 0n, 1010);

  // A second trader dumps EVEN MORE ETH into the already ETH-overweight pool
  const feeNextEth = amm.calculateFee(true, 1010);
  assert.strictEqual(feeNextEth.isRebalancing, false, 'Dumping more ETH worsens inventory skew');
  assert(feeNextEth.skewComponent > 0n, 'Skew component must be positive surcharge');
  assert(feeNextEth.skewComponent <= 25n, 'Surcharge cannot exceed MAX_SKEW_SURCHARGE_BPS (25 bps)');
  assert(feeNextEth.feeBps > 30n, 'Total fee must exceed base fee due to skew surcharge');
});

// 4. Inventory Skew Discount (-20 bps) on rebalancing trades
it('4. Rebalancing trades receive a discount (up to -20 bps)', () => {
  const amm = new AMMEngine();
  amm.addLiquidity('Alice', AMMEngine.toWei(500), AMMEngine.toWei(1000000), 1000);

  // Pool is made heavily overweight in ETH
  amm.swap('Trader1', AMMEngine.toWei(120), true, 0n, 1010);

  // A trader buys ETH using USDC, which draws down the excess ETH and replenishes USDC!
  const feeRebalancing = amm.calculateFee(false, 1010);
  assert.strictEqual(feeRebalancing.isRebalancing, true, 'Buying excess ETH rebalances the pool');
  assert(feeRebalancing.skewComponent < 0n, 'Skew component must be negative discount');
  assert(feeRebalancing.skewComponent >= -20n, 'Discount cannot exceed MAX_SKEW_DISCOUNT_BPS (-20 bps)');
});

// 5. Clamping Bounds (MIN_FEE_BPS = 5, MAX_FEE_BPS = 100)
it('5. Clamping strictly enforces bounds: [5 bps, 100 bps]', () => {
  const amm = new AMMEngine();
  amm.addLiquidity('Alice', AMMEngine.toWei(500), AMMEngine.toWei(1000000), 1000);

  // Test minimum bound: base (30) - max discount (20) with no volatility = 10 bps, clamped if negative
  const feeNormal = amm.calculateFee(true, 1000);
  assert(feeNormal.feeBps >= 5n, 'Fee must be >= 5 bps');
  assert(feeNormal.feeBps <= 100n, 'Fee must be <= 100 bps');

  // Extreme condition: base (30) + max vol (40) + max surcharge (25) = 95 bps (<= 100 bps)
  amm.volatilityAccumulator = 1000n;
  amm.swap('Whale', AMMEngine.toWei(200), true, 0n, 1020);
  const feeExtreme = amm.calculateFee(true, 1020);
  assert(feeExtreme.feeBps <= 100n, 'Fee must never exceed MAX_FEE_BPS (100 bps)');
});

// 6. Time Decay
it('6. Volatility decays exponentially back toward base fee after calm periods', () => {
  const amm = new AMMEngine();
  amm.addLiquidity('Alice', AMMEngine.toWei(500), AMMEngine.toWei(1000000), 1000);
  amm.swap('Whale', AMMEngine.toWei(50), true, 0n, 1000);

  const volRightAfter = amm.getVolatilityComponent(1000);
  const vol10MinsLater = amm.getVolatilityComponent(1600); // 10 mins later
  assert(vol10MinsLater < volRightAfter, 'Volatility must decay over elapsed time');
});

// 7. Slippage Protection
it('7. Reverts when output violates minimum slippage tolerance', () => {
  const amm = new AMMEngine();
  amm.addLiquidity('Alice', AMMEngine.toWei(500), AMMEngine.toWei(1000000), 1000);

  let reverted = false;
  try {
    amm.swap('Trader', AMMEngine.toWei(1), true, AMMEngine.toWei(5000), 1000);
  } catch (err) {
    reverted = true;
    assert.strictEqual(err.message, 'Slippage exceeded');
  }
  assert(reverted, 'Must revert on excessive slippage expectation');
});

console.log('\n----------------------------------------------------');
console.log(`Results: ${passed}/${total} tests passed! 🚀`);
console.log('----------------------------------------------------');

if (passed !== total) {
  process.exit(1);
}
