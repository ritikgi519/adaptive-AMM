import React, { useState } from 'react';
import { Zap, ShieldAlert, Sparkles, Clock, ArrowRight, Play, CheckCircle2, TrendingUp } from 'lucide-react';
import { AMMMathEngine } from '../utils/ammEngine';

interface ScenarioLabProps {
  engine: AMMMathEngine;
  onScenarioRan: () => void;
}

export const ScenarioLab: React.FC<ScenarioLabProps> = ({ engine, onScenarioRan }) => {
  const [runningScenario, setRunningScenario] = useState<string | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogMessages((prev) => [msg, ...prev].slice(0, 15));
  };

  // Scenario 1: Calm Retail Flow
  const runCalmMarket = () => {
    setRunningScenario('calm');
    addLog('🟢 Starting Calm Market Scenario: 4 small retail trades...');
    
    let t = Math.floor(Date.now() / 1000);
    const trades = [
      { user: 'Retail_Bob', amount: 1.5, isEth: true },
      { user: 'Retail_Alice', amount: 3000, isEth: false },
      { user: 'Retail_Dave', amount: 0.8, isEth: true },
      { user: 'Retail_Eva', amount: 2500, isEth: false },
    ];

    trades.forEach((trade, i) => {
      setTimeout(() => {
        t += 30;
        const res = engine.executeSwap(trade.user, trade.amount, trade.isEth, t);
        addLog(`  👉 ${trade.user}: swapped ${trade.amount} ${res.tokenIn} -> fee: ${(res.feeBps / 100).toFixed(2)}% (Vol: ${res.volatilityBps} bps)`);
        onScenarioRan();
        if (i === trades.length - 1) setRunningScenario(null);
      }, i * 350);
    });
  };

  // Scenario 2: Flash Crash / Volatility Shock
  const runFlashCrash = () => {
    setRunningScenario('crash');
    addLog('⚠️ FLASH CRASH: Binance price plunges 12%. Arbitrageur dumps 45 ETH into pool!');

    let t = Math.floor(Date.now() / 1000);
    setTimeout(() => {
      const res = engine.executeSwap('Arbitrageur_1', 45, true, t, true);
      addLog(`  💥 Shock Trade Executed: 45 ETH dumped! Price impact: ${(res.priceImpactBps / 100).toFixed(2)}%`);
      addLog(`  ⚡ Dynamic Fee escalated to: ${(res.feeBps / 100).toFixed(2)}% (+${res.feeUSD.toFixed(2)} captured for LPs)`);
      onScenarioRan();
      setRunningScenario(null);
    }, 400);
  };

  // Scenario 3: Toxic Flow Cascade (MEV Attack)
  const runToxicCascade = () => {
    setRunningScenario('cascade');
    addLog('🚨 TOXIC CASCADE: Series of aggressive MEV dumps attacking the AMM reserves!');

    let t = Math.floor(Date.now() / 1000);
    const dumps = [
      { user: 'MEV_Bot_1', amount: 35 },
      { user: 'Panic_Whale_2', amount: 50 },
      { user: 'Arb_Searcher_3', amount: 40 },
    ];

    dumps.forEach((dump, idx) => {
      setTimeout(() => {
        t += 10;
        const res = engine.executeSwap(dump.user, dump.amount, true, t, true);
        addLog(`  🔥 [Block +${idx + 1}] ${dump.user} dumped ${dump.amount} ETH! Fee locked at ${(res.feeBps / 100).toFixed(2)}%`);
        onScenarioRan();
        if (idx === dumps.length - 1) {
          addLog('  🛡️ LPs shielded: Dynamic fee extracted maximum toll from toxic flow!');
          setRunningScenario(null);
        }
      }, idx * 450);
    });
  };

  // Scenario 4: Fast Forward Decay
  const runFastForward = () => {
    setRunningScenario('decay');
    const futureTime = Math.floor(Date.now() / 1000) + 600; // 10 minutes later
    engine.lastTimestamp = futureTime;
    addLog('⏳ Fast-Forwarded 10 minutes: Volatility accumulator decayed exponentially.');
    const newFee = engine.getCurrentFeeBps(futureTime);
    addLog(`  📉 Dynamic fee decayed to baseline: ${(newFee / 100).toFixed(2)}% (${newFee} bps)`);
    onScenarioRan();
    setRunningScenario(null);
  };

  const adaptiveFee = engine.adaptiveFeesUSD;
  const staticFee = engine.staticFeesUSD;
  const feeBoost = staticFee > 0 ? ((adaptiveFee - staticFee) / staticFee) * 100 : 0;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Scenario Action Buttons */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-indigo-400" />
              Protocol Stress Lab & Market Scenarios
            </h2>
            <p className="text-xs text-slate-400">
              Trigger simulated market conditions to verify dynamic fee escalation and fee decay in real-time.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            disabled={runningScenario !== null}
            onClick={runCalmMarket}
            className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 text-left transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <Play className="h-4 w-4 text-slate-400 group-hover:text-emerald-400 transition" />
            </div>
            <h4 className="font-bold text-sm text-white mb-1">1. Calm Retail Flow</h4>
            <p className="text-[11px] text-slate-400">
              4 small trades with low impact. Fee stays compressed around 0.30%.
            </p>
          </button>

          <button
            type="button"
            disabled={runningScenario !== null}
            onClick={runFlashCrash}
            className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-left transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="h-3 w-3 rounded-full bg-amber-500" />
              <Play className="h-4 w-4 text-slate-400 group-hover:text-amber-400 transition" />
            </div>
            <h4 className="font-bold text-sm text-white mb-1">2. Single Shock Dump</h4>
            <p className="text-[11px] text-slate-400">
              45 ETH sudden dump by arbitrageur. Fee spikes immediately to &gt;2.00%.
            </p>
          </button>

          <button
            type="button"
            disabled={runningScenario !== null}
            onClick={runToxicCascade}
            className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-red-500/50 hover:bg-slate-900 text-left transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              <Play className="h-4 w-4 text-slate-400 group-hover:text-red-400 transition" />
            </div>
            <h4 className="font-bold text-sm text-white mb-1">3. Toxic MEV Attack</h4>
            <p className="text-[11px] text-slate-400">
              3 consecutive massive sales. Fee hits 3.00% max cap to protect LPs.
            </p>
          </button>

          <button
            type="button"
            disabled={runningScenario !== null}
            onClick={runFastForward}
            className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 text-left transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="h-3 w-3 rounded-full bg-cyan-500" />
              <Clock className="h-4 w-4 text-slate-400 group-hover:text-cyan-400 transition" />
            </div>
            <h4 className="font-bold text-sm text-white mb-1">4. Fast Forward 10m</h4>
            <p className="text-[11px] text-slate-400">
              Time elapsed. Exponential decay smoothly restores fee to baseline.
            </p>
          </button>
        </div>
      </div>

      {/* Head-to-Head Benchmark Card */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl">
        <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          Real-time Benchmark: Adaptive AMM vs Uniswap v2 (Static 0.3%)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-xs block mb-1">Total Trading Volume</span>
            <span className="text-xl font-bold font-mono text-white">
              ${engine.totalVolumeUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-xs block mb-1">Adaptive AMM LP Revenue</span>
            <span className="text-xl font-bold font-mono text-emerald-400">
              ${adaptiveFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-xs block mb-1">Uniswap v2 Fixed LP Revenue</span>
            <span className="text-xl font-bold font-mono text-slate-400">
              ${staticFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Advantage Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-indigo-950/40 to-purple-950/40 border border-emerald-500/30 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-mono font-semibold text-emerald-400 block">
              LP Protection & Yield Alpha
            </span>
            <span className="text-sm font-medium text-slate-200">
              Adaptive AMM captured <strong className="text-emerald-300 font-mono">+{feeBoost.toFixed(1)}%</strong> more fees from toxic volume.
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black font-mono text-emerald-400">
              +{feeBoost.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Live Simulation Console Log */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 font-mono text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3 text-slate-400">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Scenario Execution Stream
          </span>
          <button
            onClick={() => setLogMessages([])}
            className="text-[10px] text-slate-400 hover:text-white"
          >
            Clear Log
          </button>
        </div>

        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-2 no-scrollbar">
          {logMessages.length === 0 ? (
            <p className="text-slate-600 italic">No scenario events yet. Click one of the buttons above to test!</p>
          ) : (
            logMessages.map((log, i) => (
              <div key={i} className="text-slate-300 leading-relaxed">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
