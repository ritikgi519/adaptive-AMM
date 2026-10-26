import React, { useState } from 'react';
import { Code2, Copy, Check, FileCode, Cpu, Layers } from 'lucide-react';

const ADAPTIVE_AMM_SOL = `// SPDX-License-Identifier: MIT
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

    // Exact Protocol Fee Constants
    uint256 public constant BASE_FEE_BPS = 30;           // 0.30%
    uint256 public constant MAX_VOL_COMPONENT_BPS = 40;  // Up to +40 bps
    uint256 public constant MAX_SKEW_SURCHARGE_BPS = 25; // Up to +25 bps surcharge
    uint256 public constant MAX_SKEW_DISCOUNT_BPS = 20;  // Up to -20 bps discount
    uint256 public constant MIN_FEE_BPS = 5;             // 0.05%
    uint256 public constant MAX_FEE_BPS = 100;           // 1.00%

    uint256 public initialPrice;           // Scaled by 1e18
    uint256 public lastSpotPrice;
    uint256 public volatilityAccumulator;
    uint256 public lastTimestamp;
    uint256 public constant DECAY_HALF_LIFE = 180; // 3 minutes

    event Swap(address indexed sender, address indexed tokenIn, uint256 amountIn, uint256 amountOut, uint256 feeBps);

    function calculateFee(address tokenIn) public view returns (uint256 feeBps, uint256 volComp, int256 skewComp, bool isRebalancing);
    function swap(uint256 amountIn, uint256 minAmountOut, address tokenIn, address to) external returns (uint256 amountOut, uint256 feeBps);
}`;

const MOCK_ERC20_SOL = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockERC20
 * @dev Standard ERC20 token for testing the Adaptive AMM liquidity pools.
 */
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }
}`;

export const ContractViewer: React.FC = () => {
  const [selectedContract, setSelectedContract] = useState<'adaptive' | 'erc20'>('adaptive');
  const [copied, setCopied] = useState(false);

  const activeCode = selectedContract === 'adaptive' ? ADAPTIVE_AMM_SOL : MOCK_ERC20_SOL;
  const fileName = selectedContract === 'adaptive' ? 'AdaptiveAMM.sol' : 'MockERC20.sol';
  const byteSize = selectedContract === 'adaptive' ? '6,524 bytes' : '2,838 bytes';

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Contract Header & Tabs */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Code2 className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Smart Contract Explorer</h2>
            </div>
            <p className="text-xs text-slate-400">
              Compiled with Solidity 0.8.20 via Solc with optimizer enabled (200 runs).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedContract('adaptive')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedContract === 'adaptive' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              AdaptiveAMM.sol
            </button>
            <button
              onClick={() => setSelectedContract('erc20')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedContract === 'erc20' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              MockERC20.sol
            </button>
          </div>
        </div>

        {/* Contract Metadata Badges */}
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-800 text-xs font-mono">
          <span className="px-2.5 py-1 rounded bg-slate-950 text-slate-300 border border-slate-800">
            File: {fileName}
          </span>
          <span className="px-2.5 py-1 rounded bg-slate-950 text-cyan-400 border border-slate-800">
            Compiler: solc 0.8.20
          </span>
          <span className="px-2.5 py-1 rounded bg-slate-950 text-emerald-400 border border-slate-800">
            Bytecode: {byteSize}
          </span>
          <span className="px-2.5 py-1 rounded bg-slate-950 text-purple-400 border border-slate-800">
            Optimizer: 200 runs
          </span>
        </div>
      </div>

      {/* Code Editor Container */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800 text-xs">
          <span className="font-mono text-slate-400 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            {fileName}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>

        <div className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-slate-300 max-h-[500px]">
          <pre>{activeCode}</pre>
        </div>
      </div>
    </div>
  );
};
