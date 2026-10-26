import React, { useState } from 'react';
import { Layers, PlusCircle, MinusCircle, TrendingUp, ShieldCheck, DollarSign, PieChart } from 'lucide-react';
import { AMMMathEngine } from '../utils/ammEngine';

interface LiquidityCardProps {
  engine: AMMMathEngine;
  onUpdated: () => void;
  spotPrice: number;
}

export const LiquidityCard: React.FC<LiquidityCardProps> = ({
  engine,
  onUpdated,
  spotPrice,
}) => {
  const [tab, setTab] = useState<'add' | 'remove'>('add');
  const [ethInput, setEthInput] = useState('10');
  const [removePercent, setRemovePercent] = useState(25);
  const [notification, setNotification] = useState<string | null>(null);

  const reserve0 = AMMMathEngine.fromWei(engine.reserve0);
  const reserve1 = AMMMathEngine.fromWei(engine.reserve1);
  const totalLpShares = AMMMathEngine.fromWei(engine.totalSupply);
  const userShares = AMMMathEngine.fromWei(engine.userLpShares);

  const userShareRatio = totalLpShares > 0 ? userShares / totalLpShares : 0;
  const userEthPooled = reserve0 * userShareRatio;
  const userUsdcPooled = reserve1 * userShareRatio;
  const userPositionUSD = userEthPooled * spotPrice + userUsdcPooled;

  // Proportional USDC requirement for input ETH
  const ethNum = parseFloat(ethInput) || 0;
  const requiredUsdc = reserve0 > 0 ? (ethNum * reserve1) / reserve0 : ethNum * spotPrice;

  const handleAddLiquidity = () => {
    if (ethNum <= 0) return;
    const { lpMinted } = engine.addLiquidity(ethNum, requiredUsdc);
    setNotification(`Successfully added ${ethNum.toFixed(2)} ETH + $${requiredUsdc.toFixed(2)} USDC! Minted ${lpMinted.toFixed(2)} LP tokens.`);
    setTimeout(() => setNotification(null), 4000);
    onUpdated();
  };

  const handleRemoveLiquidity = () => {
    if (userShares <= 0) return;
    const { ethOut, usdcOut } = engine.removeLiquidity(removePercent);
    setNotification(`Successfully redeemed ${ethOut.toFixed(4)} ETH + $${usdcOut.toFixed(2)} USDC!`);
    setTimeout(() => setNotification(null), 4000);
    onUpdated();
  };

  const adaptiveFeeShare = engine.adaptiveFeesUSD * userShareRatio;
  const staticFeeShare = engine.staticFeesUSD * userShareRatio;
  const feeBoost = staticFeeShare > 0 ? ((adaptiveFeeShare - staticFeeShare) / staticFeeShare) * 100 : 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Protocol LP Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Pool Reserves</span>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="font-mono text-sm font-bold text-white">
            {reserve0.toLocaleString(undefined, { maximumFractionDigits: 2 })} ETH
          </div>
          <div className="font-mono text-xs text-slate-400">
            ${reserve1.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDC
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Your Pool Share</span>
            <PieChart className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="font-mono text-sm font-bold text-white">
            {(userShareRatio * 100).toFixed(2)}%
          </div>
          <div className="font-mono text-xs text-slate-400">
            ${userPositionUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })} Value
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Adaptive Fees Earned</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="font-mono text-sm font-bold text-emerald-400">
            +${adaptiveFeeShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="font-mono text-[10px] text-slate-400">
            vs ${staticFeeShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} on Uniswap v2
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 bg-gradient-to-br from-indigo-950/40 to-purple-950/40">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Dynamic Yield Alpha</span>
            <ShieldCheck className="h-4 w-4 text-purple-400" />
          </div>
          <div className="font-mono text-sm font-bold text-purple-300">
            +{feeBoost.toFixed(1)}%
          </div>
          <div className="font-mono text-[10px] text-purple-400">
            Captured from toxic flow
          </div>
        </div>
      </div>

      {/* Main Liquidity Card */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl backdrop-blur-xl">
        {/* Subtabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('add')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                tab === 'add'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add Liquidity
            </button>
            <button
              onClick={() => setTab('remove')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                tab === 'remove'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <MinusCircle className="h-3.5 w-3.5" />
              Remove Liquidity
            </button>
          </div>

          <span className="text-xs font-mono text-slate-400">
            Pool Ratio: 1 ETH = ${(reserve1 / reserve0).toFixed(2)} USDC
          </span>
        </div>

        {tab === 'add' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Token 0 (ETH) */}
              <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Input Token 0</span>
                  <span>ETH</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={ethInput}
                  onChange={(e) => setEthInput(e.target.value)}
                  className="w-full bg-transparent text-xl font-bold font-mono text-white focus:outline-none"
                  placeholder="0.0"
                />
              </div>

              {/* Token 1 (USDC - Calculated) */}
              <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Required Token 1 (Auto-balanced)</span>
                  <span>USDC</span>
                </div>
                <input
                  type="text"
                  readOnly
                  value={requiredUsdc.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  className="w-full bg-transparent text-xl font-bold font-mono text-emerald-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Current LP Token Supply:</span>
                <span className="font-mono text-white">{totalLpShares.toFixed(2)} A-LP</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated LP Minted:</span>
                <span className="font-mono text-indigo-400">
                  {reserve0 > 0 ? ((ethNum / reserve0) * totalLpShares).toFixed(2) : '0.00'} A-LP
                </span>
              </div>
            </div>

            <button
              onClick={handleAddLiquidity}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg transition"
            >
              Deposit Liquidity & Mint A-LP
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="bg-slate-950/70 rounded-xl p-5 border border-slate-800">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-slate-400">Withdraw Percentage</span>
                <span className="text-lg font-bold font-mono text-cyan-400">{removePercent}%</span>
              </div>

              <input
                type="range"
                min="1"
                max="100"
                value={removePercent}
                onChange={(e) => setRemovePercent(parseInt(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />

              <div className="flex justify-between mt-3">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setRemovePercent(pct)}
                    className={`px-3 py-1 rounded text-xs font-mono font-medium transition ${
                      removePercent === pct
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 block mb-1">ETH to Receive</span>
                <span className="text-base font-bold font-mono text-white">
                  {((userEthPooled * removePercent) / 100).toFixed(4)} ETH
                </span>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 block mb-1">USDC to Receive</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  ${((userUsdcPooled * removePercent) / 100).toFixed(2)} USDC
                </span>
              </div>
            </div>

            <button
              onClick={handleRemoveLiquidity}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white shadow-lg transition"
            >
              Burn LP Tokens & Redeem Reserves
            </button>
          </div>
        )}

        {notification && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            {notification}
          </div>
        )}
      </div>
    </div>
  );
};
