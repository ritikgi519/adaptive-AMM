import React from 'react';
import { Activity, ShieldCheck, Zap, RefreshCw, BarChart3, Code2, Layers, Cpu, Video } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  spotPrice: number;
  currentFeeBps: number;
  volatilityBps: number;
  tvlUSD: number;
  lpBoost: number;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  spotPrice,
  currentFeeBps,
  volatilityBps,
  tvlUSD,
  lpBoost,
  onReset,
}) => {
  const isShock = currentFeeBps > 150 || volatilityBps > 400;
  const isElevated = currentFeeBps > 60 || volatilityBps > 100;

  const statusLabel = isShock ? 'VOLATILITY SHOCK' : isElevated ? 'ELEVATED FLOW' : 'CALM MARKET';
  const statusColor = isShock
    ? 'bg-red-500/10 text-red-400 border-red-500/30'
    : isElevated
    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

  const pulseDotColor = isShock ? 'bg-red-500' : isElevated ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Protocol Title */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">Adaptive AMM</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  v1.0 Dynamic
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Volatility-Responsive Liquidity & LVR Protection
              </p>
            </div>
          </div>

          {/* Real-time Ticker Metrics */}
          <div className="hidden lg:flex items-center gap-6 text-xs">
            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider">Spot Price</span>
              <span className="font-mono font-semibold text-white">
                ${spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="h-8 w-px bg-slate-800" />

            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider">Dynamic Fee</span>
              <span className="font-mono font-semibold text-cyan-400">
                {(currentFeeBps / 100).toFixed(2)}%
                <span className="text-[10px] text-slate-400 ml-1">({currentFeeBps} bps)</span>
              </span>
            </div>

            <div className="h-8 w-px bg-slate-800" />

            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider">Volatility</span>
              <span className="font-mono font-semibold text-purple-400">
                {volatilityBps} bps
              </span>
            </div>

            <div className="h-8 w-px bg-slate-800" />

            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider">Pool TVL</span>
              <span className="font-mono font-semibold text-slate-200">
                ${tvlUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>

            <div className="h-8 w-px bg-slate-800" />

            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium font-mono ${statusColor}`}>
                <span className={`h-2 w-2 rounded-full ${pulseDotColor} animate-pulse`} />
                {statusLabel}
              </div>
            </div>
          </div>

          {/* Quick Action / Reset */}
          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              title="Reset pool reserves to default 500 ETH / $1,000,000 USDC"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset Pool</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-900/60 no-scrollbar">
          {[
            { id: 'video', label: 'Explainer Video', icon: Video, badge: 'HD' },
            { id: 'swap', label: 'Swap DEX', icon: RefreshCw },
            { id: 'liquidity', label: 'Liquidity Pools', icon: Layers },
            { id: 'volatility', label: 'Dynamic Fee Engine', icon: Cpu },
            { id: 'scenarios', label: 'Stress Lab & Shock Test', icon: Zap },
            { id: 'charts', label: 'Analytics & Trades', icon: BarChart3 },
            { id: 'tests', label: 'Automated Tests', icon: ShieldCheck },
            { id: 'contracts', label: 'Solidity Contracts', icon: Code2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  active
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-500/20'
                    : tab.badge
                    ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active || tab.badge ? 'text-indigo-400' : 'text-slate-400'}`} />
                {tab.label}
                {tab.badge && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
