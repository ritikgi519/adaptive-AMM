import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { SwapCard } from './components/SwapCard';
import { LiquidityCard } from './components/LiquidityCard';
import { VolatilityCockpit } from './components/VolatilityCockpit';
import { ScenarioLab } from './components/ScenarioLab';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { TestRunner } from './components/TestRunner';
import { ContractViewer } from './components/ContractViewer';
import { ProjectVideoExplainer } from './components/ProjectVideoExplainer';
import { AMMMathEngine } from './utils/ammEngine';

export default function App() {
  const [engine] = useState(() => new AMMMathEngine(500, 1000000));
  const [activeTab, setActiveTab] = useState<string>('video');
  const [version, setVersion] = useState<number>(0);

  // Trigger state update
  const forceUpdate = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  // Periodic tick for live time-decay of volatility when idle
  useEffect(() => {
    const timer = setInterval(() => {
      forceUpdate();
    }, 2000);
    return () => clearInterval(timer);
  }, [forceUpdate]);

  const now = Math.floor(Date.now() / 1000);
  const spotPrice = useMemo(() => engine.getSpotPrice(), [engine, version]);
  const currentFeeBps = useMemo(() => engine.getCurrentFeeBps(now), [engine, now, version]);
  const volatilityBps = useMemo(() => Number(engine.getDecayedVolatility(now)), [engine, now, version]);

  const reserve0 = AMMMathEngine.fromWei(engine.reserve0);
  const reserve1 = AMMMathEngine.fromWei(engine.reserve1);
  const tvlUSD = reserve0 * spotPrice + reserve1;

  const lpBoost = engine.staticFeesUSD > 0
    ? ((engine.adaptiveFeesUSD - engine.staticFeesUSD) / engine.staticFeesUSD) * 100
    : 0;

  const handleReset = () => {
    engine.reset(500, 1000000);
    forceUpdate();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Protocol Header & Ticker Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        spotPrice={spotPrice}
        currentFeeBps={currentFeeBps}
        volatilityBps={volatilityBps}
        tvlUSD={tvlUSD}
        lpBoost={lpBoost}
        onReset={handleReset}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'video' && (
          <ProjectVideoExplainer />
        )}

        {activeTab === 'swap' && (
          <div className="space-y-8">
            <SwapCard
              engine={engine}
              onSwapExecuted={forceUpdate}
              spotPrice={spotPrice}
              currentFeeBps={currentFeeBps}
            />

            {/* Quick Overview of Recent Activity */}
            <div className="max-w-xl mx-auto">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Quick Scenario Demos:</span>
                <button
                  onClick={() => setActiveTab('scenarios')}
                  className="text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Open Full Stress Lab &rarr;
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => {
                    engine.executeSwap('Arbitrageur', 40, true, Math.floor(Date.now() / 1000), true);
                    forceUpdate();
                  }}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-red-500/30 text-red-300 text-left transition"
                >
                  <span className="font-bold block">💥 Trigger 40 ETH Shock</span>
                  <span className="text-[10px] text-slate-400">Watch dynamic fee jump to &gt;2.0%</span>
                </button>
                <button
                  onClick={() => {
                    engine.executeSwap('Retail_Trader', 1.5, true, Math.floor(Date.now() / 1000));
                    forceUpdate();
                  }}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 text-left transition"
                >
                  <span className="font-bold block">🟢 Normal 1.5 ETH Retail Swap</span>
                  <span className="text-[10px] text-slate-400">Executes at baseline 0.30% fee</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'liquidity' && (
          <LiquidityCard
            engine={engine}
            onUpdated={forceUpdate}
            spotPrice={spotPrice}
          />
        )}

        {activeTab === 'volatility' && (
          <VolatilityCockpit
            engine={engine}
            onConfigUpdated={forceUpdate}
            currentFeeBps={currentFeeBps}
            volatilityBps={volatilityBps}
          />
        )}

        {activeTab === 'scenarios' && (
          <ScenarioLab
            engine={engine}
            onScenarioRan={forceUpdate}
          />
        )}

        {activeTab === 'charts' && (
          <AnalyticsCharts engine={engine} />
        )}

        {activeTab === 'tests' && (
          <TestRunner />
        )}

        {activeTab === 'contracts' && (
          <ContractViewer />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-6 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Adaptive AMM Protocol • Dynamic Volatility-Sensitive Automated Market Maker</span>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>Solidity 0.8.20</span>
            <span>Constant Product + EWMA Oracle</span>
            <span>Zero Toxic Arbitrage Leakage</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
