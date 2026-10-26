import React from 'react';
import { BarChart3, TrendingUp, Activity, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import { AMMMathEngine } from '../utils/ammEngine';
import { TradeRecord } from '../types/amm';

interface AnalyticsChartsProps {
  engine: AMMMathEngine;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ engine }) => {
  const history = [...engine.history].reverse(); // chronological for chart
  const hasData = history.length > 0;

  // Compute SVG chart coordinates
  const width = 600;
  const height = 180;
  const padding = 30;

  // Dynamic fee points
  const feeValues = history.map((h) => h.feeBps);
  const minFee = Math.min(...feeValues, 30);
  const maxFee = Math.max(...feeValues, 300);

  const feePoints = history.map((h, i) => {
    const x = padding + (i / Math.max(1, history.length - 1)) * (width - padding * 2);
    const range = maxFee - minFee || 1;
    const y = height - padding - ((h.feeBps - minFee) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  // Price points
  const priceValues = history.map((h) => h.priceUSD);
  const minPrice = Math.min(...priceValues, 1800);
  const maxPrice = Math.max(...priceValues, 2200);

  const pricePoints = history.map((h, i) => {
    const x = padding + (i / Math.max(1, history.length - 1)) * (width - padding * 2);
    const range = maxPrice - minPrice || 1;
    const y = height - padding - ((h.priceUSD - minPrice) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Visual SVG Chart Duo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dynamic Fee Chart */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl">
          <div className="flex justify-between items-center mb-3">
            <div>
              <span className="text-xs uppercase font-mono text-slate-400 block">Dynamic Fee (BPS) Over Trades</span>
              <span className="text-sm font-bold text-cyan-400">
                Spikes on Volatility • Decays to Baseline
              </span>
            </div>
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>

          <div className="bg-slate-950/70 rounded-xl p-2 border border-slate-800/80">
            {hasData ? (
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
                {/* Horizontal reference lines */}
                <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeDasharray="3 3" />
                <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#334155" strokeDasharray="3 3" />
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" strokeDasharray="3 3" />

                {/* Path line */}
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={feePoints}
                />

                {/* Dots on points */}
                {history.map((h, i) => {
                  const x = padding + (i / Math.max(1, history.length - 1)) * (width - padding * 2);
                  const range = maxFee - minFee || 1;
                  const y = height - padding - ((h.feeBps - minFee) / range) * (height - padding * 2);
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r={h.isShockTrade ? '5' : '3'}
                      fill={h.isShockTrade ? '#ef4444' : '#38bdf8'}
                    />
                  );
                })}
              </svg>
            ) : (
              <div className="h-44 flex items-center justify-center text-xs text-slate-500 italic">
                Execute a swap or run a scenario to generate fee chart!
              </div>
            )}
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2">
            <span>Trade #1</span>
            <span>Current: {engine.history[0]?.feeBps || 30} bps</span>
            <span>Trade #{history.length}</span>
          </div>
        </div>

        {/* Spot Price Trajectory Chart */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl">
          <div className="flex justify-between items-center mb-3">
            <div>
              <span className="text-xs uppercase font-mono text-slate-400 block">ETH Spot Price ($) Trajectory</span>
              <span className="text-sm font-bold text-emerald-400">
                ${engine.getSpotPrice().toFixed(2)} / ETH
              </span>
            </div>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>

          <div className="bg-slate-950/70 rounded-xl p-2 border border-slate-800/80">
            {hasData ? (
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
                <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeDasharray="3 3" />
                <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#334155" strokeDasharray="3 3" />
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" strokeDasharray="3 3" />

                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={pricePoints}
                />

                {history.map((h, i) => {
                  const x = padding + (i / Math.max(1, history.length - 1)) * (width - padding * 2);
                  const range = maxPrice - minPrice || 1;
                  const y = height - padding - ((h.priceUSD - minPrice) / range) * (height - padding * 2);
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="3"
                      fill="#10b981"
                    />
                  );
                })}
              </svg>
            ) : (
              <div className="h-44 flex items-center justify-center text-xs text-slate-500 italic">
                Execute a swap to view spot price moves!
              </div>
            )}
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2">
            <span>Low: ${minPrice.toFixed(2)}</span>
            <span>High: ${maxPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Complete Trade History Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">AMM Transaction History</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {engine.history.length} Transactions Recorded
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] uppercase font-mono text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Trader</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Input</th>
                <th className="py-3 px-4">Output</th>
                <th className="py-3 px-4">Fee Rate</th>
                <th className="py-3 px-4">Volatility</th>
                <th className="py-3 px-4">Price Impact</th>
                <th className="py-3 px-4">Fee USD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {engine.history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500 italic">
                    No swaps performed yet. Try a swap or scenario above!
                  </td>
                </tr>
              ) : (
                engine.history.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-semibold text-white">
                      <div className="flex items-center gap-1.5">
                        {tx.isShockTrade && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-500/20 text-red-400 border border-red-500/30">
                            SHOCK
                          </span>
                        )}
                        <span>{tx.user}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.tokenIn === 'ETH' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {tx.tokenIn} &rarr; {tx.tokenOut}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {tx.amountIn.toFixed(tx.tokenIn === 'ETH' ? 4 : 2)} {tx.tokenIn}
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">
                      {tx.amountOut.toFixed(tx.tokenOut === 'ETH' ? 4 : 2)} {tx.tokenOut}
                    </td>
                    <td className="py-3 px-4 font-bold text-cyan-400">
                      {(tx.feeBps / 100).toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-purple-400">
                      {tx.volatilityBps} bps
                    </td>
                    <td className="py-3 px-4">
                      {(tx.priceImpactBps / 100).toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      +${tx.feeUSD.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
