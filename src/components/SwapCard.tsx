import React, { useState } from 'react';
import { ArrowDownUp, Info, AlertTriangle, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { AMMMathEngine } from '../utils/ammEngine';

interface SwapCardProps {
  engine: AMMMathEngine;
  onSwapExecuted: () => void;
  spotPrice: number;
  currentFeeBps: number;
}

export const SwapCard: React.FC<SwapCardProps> = ({
  engine,
  onSwapExecuted,
  spotPrice,
  currentFeeBps,
}) => {
  const [isToken0In, setIsToken0In] = useState(true); // true = ETH -> USDC, false = USDC -> ETH
  const [amountInStr, setAmountInStr] = useState('2');
  const [slippage, setSlippage] = useState(0.5); // 0.5%
  const [isExecuting, setIsExecuting] = useState(false);
  const [userBalances, setUserBalances] = useState({ eth: 250, usdc: 500000 });
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const amountIn = parseFloat(amountInStr) || 0;
  const now = Math.floor(Date.now() / 1000);
  const quote = engine.getAmountOut(amountIn, isToken0In, now);

  const tokenInSymbol = isToken0In ? 'ETH' : 'USDC';
  const tokenOutSymbol = isToken0In ? 'USDC' : 'ETH';

  const userBalanceIn = isToken0In ? userBalances.eth : userBalances.usdc;
  const userBalanceOut = isToken0In ? userBalances.usdc : userBalances.eth;

  const minReceived = quote.amountOutNum * (1 - slippage / 100);
  const priceImpactPct = quote.priceImpactBps / 100;

  const handleSwap = () => {
    setErrorMessage(null);
    if (amountIn <= 0) return;
    if (amountIn > userBalanceIn) {
      setErrorMessage(`Insufficient ${tokenInSymbol} balance in simulated wallet! (Have: ${userBalanceIn.toFixed(2)}, Need: ${amountIn})`);
      return;
    }

    setIsExecuting(true);
    setTimeout(() => {
      engine.executeSwap('Trader (You)', amountIn, isToken0In, Math.floor(Date.now() / 1000));
      setUserBalances((prev) => ({
        eth: isToken0In ? prev.eth - amountIn : prev.eth + quote.amountOutNum,
        usdc: isToken0In ? prev.usdc + quote.amountOutNum : prev.usdc - amountIn,
      }));
      setLastTxHash(`0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`);
      setIsExecuting(false);
      onSwapExecuted();
    }, 200);
  };

  const handleQuickAmount = (val: number) => {
    setAmountInStr(val.toString());
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-2 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 blur-sm opacity-70" />

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Adaptive Swap
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Dynamic Fee Active
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Low fee during calm periods • Scaled fee protects against toxic arbitrage
            </p>
          </div>

          {/* Dynamic Fee Pill */}
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Instant Fee</span>
            <span className="text-sm font-bold font-mono text-cyan-400">
              {(quote.effectiveFeeBps / 100).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Token Input Box */}
        <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800/80 mb-2 focus-within:border-indigo-500/50 transition">
          <div className="flex justify-between items-center mb-1 text-xs text-slate-400">
            <span>You Pay</span>
            <span>
              Balance: <span className="text-slate-200 font-mono">{userBalanceIn.toLocaleString(undefined, { maximumFractionDigits: 4 })} {tokenInSymbol}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              step="any"
              value={amountInStr}
              onChange={(e) => setAmountInStr(e.target.value)}
              placeholder="0.0"
              className="w-full bg-transparent text-2xl font-bold font-mono text-white focus:outline-none"
            />
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/60 font-semibold text-sm text-white shrink-0">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              {tokenInSymbol}
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-900">
            <span className="text-[10px] text-slate-400">Presets:</span>
            {(isToken0In ? [0.5, 2, 10, 50] : [1000, 5000, 20000, 100000]).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickAmount(val)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                {val} {tokenInSymbol}
              </button>
            ))}
          </div>
        </div>

        {/* Switch Tokens Button */}
        <div className="flex justify-center -my-3 z-10 relative">
          <button
            type="button"
            onClick={() => {
              setIsToken0In(!isToken0In);
              setAmountInStr(quote.amountOutNum > 0 ? quote.amountOutNum.toFixed(2) : '1');
            }}
            className="p-2.5 rounded-full bg-slate-800 hover:bg-indigo-600 border border-slate-700 text-slate-300 hover:text-white shadow-lg transition active:scale-95"
            title="Invert swap direction"
          >
            <ArrowDownUp className="h-4 w-4" />
          </button>
        </div>

        {/* Token Output Box */}
        <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800/80 mb-4 focus-within:border-indigo-500/50 transition">
          <div className="flex justify-between items-center mb-1 text-xs text-slate-400">
            <span>You Receive (Estimated)</span>
            <span>
              Balance: <span className="text-slate-200 font-mono">{userBalanceOut.toLocaleString(undefined, { maximumFractionDigits: 4 })} {tokenOutSymbol}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              readOnly
              value={quote.amountOutNum.toLocaleString(undefined, { maximumFractionDigits: 6 })}
              placeholder="0.0"
              className="w-full bg-transparent text-2xl font-bold font-mono text-emerald-400 focus:outline-none"
            />
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/60 font-semibold text-sm text-white shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {tokenOutSymbol}
            </div>
          </div>
        </div>

        {/* Dynamic Fee & Price Impact Transparency Box */}
        <div className="rounded-xl bg-slate-950/50 border border-slate-800/60 p-3.5 mb-5 text-xs space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              Dynamic Fee Breakdown
            </span>
            <span className="font-mono font-semibold text-white">
              {(quote.effectiveFeeBps / 100).toFixed(2)}% ({quote.effectiveFeeBps} bps)
            </span>
          </div>

          {/* Skew & Rebalance Notification Banner */}
          {quote.isRebalancing && quote.skewComponentBps < 0 && (
            <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center justify-between font-mono">
              <span className="flex items-center gap-1.5 font-bold">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                Pool Rebalancing Discount Applied!
              </span>
              <span className="font-bold text-emerald-400">
                {quote.skewComponentBps} bps ({((quote.skewComponentBps) / 100).toFixed(2)}%)
              </span>
            </div>
          )}

          {!quote.isRebalancing && quote.skewComponentBps > 0 && (
            <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] flex items-center justify-between font-mono">
              <span className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                Inventory Skew Surcharge (Lopsided Flow)
              </span>
              <span className="font-bold text-amber-400">
                +{quote.skewComponentBps} bps (+{(quote.skewComponentBps / 100).toFixed(2)}%)
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono text-slate-400 border-t border-slate-800/60">
            <div className="bg-slate-900/60 p-1.5 rounded">
              <span className="block text-[10px] text-slate-400">Base Fee</span>
              <span className="text-slate-200 font-medium">30 bps (0.30%)</span>
            </div>
            <div className="bg-slate-900/60 p-1.5 rounded">
              <span className="block text-[10px] text-slate-400">Realized Vol (≤40)</span>
              <span className={quote.volComponentBps > 0 ? 'text-cyan-400 font-medium' : 'text-slate-400'}>
                +{quote.volComponentBps} bps
              </span>
            </div>
            <div className="bg-slate-900/60 p-1.5 rounded">
              <span className="block text-[10px] text-slate-400">Inventory Skew</span>
              <span className={quote.skewComponentBps < 0 ? 'text-emerald-400 font-bold' : quote.skewComponentBps > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                {quote.skewComponentBps < 0 ? `${quote.skewComponentBps} bps` : `+${quote.skewComponentBps} bps`}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center text-slate-400 pt-1">
            <span>Price Impact</span>
            <span className={`font-mono font-medium ${priceImpactPct > 5 ? 'text-red-400' : priceImpactPct > 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {priceImpactPct.toFixed(2)}%
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Min Received ({slippage}%)</span>
            <span className="font-mono text-slate-200">
              {minReceived.toLocaleString(undefined, { maximumFractionDigits: 4 })} {tokenOutSymbol}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Effective Rate</span>
            <span className="font-mono text-slate-200">
              1 ETH = ${spotPrice.toFixed(2)} USDC
            </span>
          </div>
        </div>

        {/* Slippage Selector */}
        <div className="flex items-center justify-between mb-5 text-xs text-slate-400">
          <span>Slippage Tolerance:</span>
          <div className="flex items-center gap-1 font-mono">
            {[0.1, 0.5, 1.0, 2.0].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlippage(s)}
                className={`px-2 py-0.5 rounded text-[11px] transition ${
                  slippage === s
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>

        {/* Execute Button */}
        <button
          type="button"
          disabled={amountIn <= 0 || isExecuting}
          onClick={handleSwap}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition shadow-lg ${
            amountIn <= 0
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-indigo-500/25 active:scale-[0.99]'
          }`}
        >
          {isExecuting ? 'Confirming Swap in AMM Pool...' : `Swap ${tokenInSymbol} for ${tokenOutSymbol}`}
        </button>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Last Tx Banner */}
        {lastTxHash && (
          <div className="mt-4 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="h-4 w-4" /> Swap confirmed on simulated EVM!
            </span>
            <span className="font-mono text-[11px] opacity-80">{lastTxHash}</span>
          </div>
        )}
      </div>
    </div>
  );
};
