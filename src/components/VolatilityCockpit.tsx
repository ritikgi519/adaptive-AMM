import React, { useState, useEffect } from 'react';
import { Cpu, Clock, Sliders, ShieldAlert, Sparkles, RefreshCw, HelpCircle } from 'lucide-react';
import { AMMMathEngine } from '../utils/ammEngine';
import { FeeConfig } from '../types/amm';

interface VolatilityCockpitProps {
  engine: AMMMathEngine;
  onConfigUpdated: () => void;
  currentFeeBps: number;
  volatilityBps: number;
}

export const VolatilityCockpit: React.FC<VolatilityCockpitProps> = ({
  engine,
  onConfigUpdated,
  currentFeeBps,
  volatilityBps,
}) => {
  const [config, setConfig] = useState<FeeConfig>(engine.config);
  const [currentTime, setCurrentTime] = useState<number>(Math.floor(Date.now() / 1000));
  const [savedMessage, setSavedMessage] = useState(false);

  // Time elapsed since last trade
  const secondsSinceTrade = Math.max(0, currentTime - engine.lastTimestamp);

  // Advance time button
  const handleAdvanceTime = (seconds: number) => {
    const newTime = currentTime + seconds;
    setCurrentTime(newTime);
    onConfigUpdated();
  };

  const handleApplyConfig = (e: React.FormEvent) => {
    e.preventDefault();
    engine.config = { ...config };
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
    onConfigUpdated();
  };

  const currentFeePercent = currentFeeBps / 100;
  // Calculate percentage along the gauge (minFee to maxFee)
  const gaugePercent = Math.min(
    100,
    Math.max(
      0,
      ((currentFeeBps - config.minFeeBps) / (config.maxFeeBps - config.minFeeBps)) * 100
    )
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Banner: Real-time Dynamic Gauge */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Cpu className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Dynamic Fee & Volatility Engine</h2>
            </div>
            <p className="text-xs text-slate-400 max-w-md">
              Automatically adjusts fee rates in response to price delta speed and block timestamp decay.
            </p>
          </div>

          {/* Time Elapsed & Manual Decay Simulator */}
          <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800">
            <Clock className="h-4 w-4 text-cyan-400 shrink-0" />
            <div className="text-xs">
              <span className="text-slate-400 block text-[10px] uppercase">Simulated Elapsed</span>
              <span className="font-mono text-white font-medium">{secondsSinceTrade}s since trade</span>
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <button
                type="button"
                onClick={() => handleAdvanceTime(60)}
                className="px-2 py-1 text-[11px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                +60s
              </button>
              <button
                type="button"
                onClick={() => handleAdvanceTime(300)}
                className="px-2 py-1 text-[11px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                +5m
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Visual Gauge Meter */}
        <div className="mt-8 bg-slate-950/60 rounded-xl p-6 border border-slate-800/80">
          <div className="flex justify-between items-end mb-2">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider block">Effective Dynamic Fee</span>
              <span className="text-3xl font-extrabold font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400">
                {currentFeePercent.toFixed(2)}%
                <span className="text-xs text-slate-400 font-normal ml-2">({currentFeeBps} bps)</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 uppercase tracking-wider block">Volatility Accumulator</span>
              <span className="text-xl font-bold font-mono text-purple-400">
                {volatilityBps} bps
              </span>
            </div>
          </div>

          {/* Bar Gauge */}
          <div className="w-full bg-slate-800/80 rounded-full h-4 overflow-hidden relative p-0.5 border border-slate-700/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-600 transition-all duration-500 shadow-lg"
              style={{ width: `${Math.max(4, gaugePercent)}%` }}
            />
          </div>

          {/* Scale Labels */}
          <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 mt-2">
            <span>Min: {(config.minFeeBps / 100).toFixed(2)}%</span>
            <span>Base: {(config.baseFeeBps / 100).toFixed(2)}%</span>
            <span>Max: {(config.maxFeeBps / 100).toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* Protocol Configuration Form & Math Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Param Adjuster */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="h-4 w-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">Adjust Protocol Parameters</h3>
          </div>

          <form onSubmit={handleApplyConfig} className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Base Swap Fee:</span>
                <span className="font-mono text-white">{(config.baseFeeBps / 100).toFixed(2)}% ({config.baseFeeBps} bps)</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={config.baseFeeBps}
                onChange={(e) => setConfig({ ...config, baseFeeBps: parseInt(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Min Swap Fee (Calm floor):</span>
                <span className="font-mono text-white">{(config.minFeeBps / 100).toFixed(2)}% ({config.minFeeBps} bps)</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={config.minFeeBps}
                onChange={(e) => setConfig({ ...config, minFeeBps: parseInt(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Max Swap Fee (Shock cap):</span>
                <span className="font-mono text-white">{(config.maxFeeBps / 100).toFixed(2)}% ({config.maxFeeBps} bps)</span>
              </div>
              <input
                type="range"
                min="100"
                max="500"
                step="10"
                value={config.maxFeeBps}
                onChange={(e) => setConfig({ ...config, maxFeeBps: parseInt(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Max Volatility Component:</span>
                <span className="font-mono text-cyan-400">+{config.maxVolComponentBps} bps (+{(config.maxVolComponentBps / 100).toFixed(2)}%)</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="5"
                value={config.maxVolComponentBps}
                onChange={(e) => setConfig({ ...config, maxVolComponentBps: parseInt(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Max Skew Surcharge (Lopsided flow):</span>
                <span className="font-mono text-amber-400">+{config.maxSkewSurchargeBps} bps (+{(config.maxSkewSurchargeBps / 100).toFixed(2)}%)</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={config.maxSkewSurchargeBps}
                onChange={(e) => setConfig({ ...config, maxSkewSurchargeBps: parseInt(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Max Skew Discount (Rebalancing flow):</span>
                <span className="font-mono text-emerald-400">-{config.maxSkewDiscountBps} bps (-{(config.maxSkewDiscountBps / 100).toFixed(2)}%)</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={config.maxSkewDiscountBps}
                onChange={(e) => setConfig({ ...config, maxSkewDiscountBps: parseInt(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Decay Half-Life (τ):</span>
                <span className="font-mono text-white">{config.decayHalfLife} seconds ({(config.decayHalfLife / 60).toFixed(1)} mins)</span>
              </div>
              <input
                type="range"
                min="30"
                max="600"
                step="30"
                value={config.decayHalfLife}
                onChange={(e) => setConfig({ ...config, decayHalfLife: parseInt(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition mt-2"
            >
              Apply Parameter Changes
            </button>

            {savedMessage && (
              <p className="text-center text-emerald-400 font-medium text-xs">
                Parameters updated in AMM engine!
              </p>
            )}
          </form>
        </div>

        {/* Math & Research Explanation */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <h3 className="font-bold text-sm text-white">Why Adaptive AMM Wins Over Static 0.3%</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="font-semibold text-cyan-400 block mb-1">1. Loss-Versus-Rebalancing (LVR) Defense</span>
                Standard AMMs lose millions to arbitrageurs whenever external CEX prices gap. The Adaptive AMM automatically jacks up swap fees during sharp price movements, forcing toxic flows to pay a hefty toll directly to LPs.
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="font-semibold text-indigo-400 block mb-1">2. Competitive Pricing in Calm Periods</span>
                When markets are quiet, a fixed 0.30% fee is uncompetitive. The protocol compresses down toward min fee (0.05%), winning retail order routing while preserving reserve integrity.
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="font-semibold text-purple-400 block mb-1">3. Frontrunning / MEV Mitigation</span>
                Large single trades that induce high price impact trigger instantaneous surcharges, curbing malicious sandwiching.
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Solidity Formula:</span>
            <span>Fee = clamp(Base + (Vol * α)/100 + Impact, Min, Max)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
