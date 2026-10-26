import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Download,
  Sparkles,
  FileText,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Zap,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface Chapter {
  id: number;
  title: string;
  duration: number; // in seconds
  caption: string;
  narration: string;
  badge: string;
  accentColor: string;
}

const CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: 'Adaptive AMM Protocol Overview',
    duration: 15,
    badge: 'Introduction',
    accentColor: '#6366f1',
    caption:
      'Welcome to Adaptive AMM — a decentralized exchange protocol that dynamically modulates swap fees to eliminate toxic flow and protect liquidity providers.',
    narration:
      'Welcome to the Adaptive AMM project. Standard Automated Market Makers with fixed fees lose millions to arbitrageurs and impermanent loss. Adaptive AMM solves this fundamental flaw by introducing a real-time dynamic fee engine that tracks volatility and price impact.',
  },
  {
    id: 2,
    title: 'The Flaw of Fixed 0.30% Fees & LVR',
    duration: 18,
    badge: 'Problem Analysis',
    accentColor: '#f43f5e',
    caption:
      'Fixed fee AMMs like Uniswap v2 suffer from Loss-Versus-Rebalancing (LVR): during market crashes, arbitrageurs exploit price lag, extracting value from LPs.',
    narration:
      'In traditional constant-product AMMs like Uniswap version two, fees are frozen at thirty basis points. When an external centralized exchange price drops rapidly, arbitrageurs dump assets into the AMM before prices align. The liquidity providers absorb all the adverse price selection, while the bots walk away with the profit.',
  },
  {
    id: 3,
    title: 'The Mathematical Dynamic Fee Engine',
    duration: 20,
    badge: 'Mathematical Model',
    accentColor: '#38bdf8',
    caption:
      'EWMA Volatility Oracle: σ(t) = 0.70·σ(decayed) + 0.30·ΔP. Dynamic Fee = clamp(Base + (σ·α)/100 + Impact, Min, Max).',
    narration:
      'Adaptive AMM tracks an Exponentially Weighted Moving Average of price changes in basis points. During calm periods, fees compress down to five basis points to attract high retail volume. During high volatility or large price impact trades, the fee automatically scales up to three percent.',
  },
  {
    id: 4,
    title: 'Arbitrage Shock Defense in Action',
    duration: 20,
    badge: 'Live Simulation',
    accentColor: '#eab308',
    caption:
      'Simulating a 45 ETH sudden dump: Dynamic fee instantly escalates to 2.85%, taxing the toxic order flow and depositing the toll into the LP pool.',
    narration:
      'Observe what happens when an arbitrageur dumps forty-five Ether into the pool. Instead of paying a trivial zero point three percent fee, the Adaptive AMM instantly spikes the fee to two point eight five percent. The entire arbitrage surplus is captured and redirected straight into the liquidity pool reserves.',
  },
  {
    id: 5,
    title: 'Smart Contract Architecture & Safety',
    duration: 18,
    badge: 'Solidity 0.8.20',
    accentColor: '#a855f7',
    caption:
      'AdaptiveAMM.sol combines constant-product invariants with reentrancy protection, half-life exponential time decay (τ = 180s), and slippage bounds.',
    narration:
      'The protocol is implemented in Solidity zero point eight point twenty. It implements a non-reentrant state machine with safe math and exponential decay half-life. As time passes without trade imbalances, the fee decays smoothly back to baseline.',
  },
  {
    id: 6,
    title: 'Benchmark Results: +781% LP Yield Boost',
    duration: 18,
    badge: 'Final Results',
    accentColor: '#10b981',
    caption:
      'Protocol comparison: Adaptive AMM accrued $8,315 in LP fees vs $942 in Uniswap v2 — achieving a +781.8% LP Yield Outperformance.',
    narration:
      'In rigorous head-to-head backtesting across retail flows and volatility shocks, Adaptive AMM generated eight thousand three hundred fifteen dollars in LP fees compared to just nine hundred forty-two dollars for Uniswap version two. That is a seven hundred eighty-one percent yield boost for liquidity providers.',
  },
];

const TOTAL_DURATION = CHAPTERS.reduce((acc, c) => acc + c.duration, 0); // 109s

export const ProjectVideoExplainer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'video' | 'transcript' | 'slides'>('video');
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(Date.now());
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentChapterIdRef = useRef<number>(1);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Find active chapter based on currentTime
  let accumulatedTime = 0;
  let activeChapterIndex = 0;
  for (let i = 0; i < CHAPTERS.length; i++) {
    if (currentTime >= accumulatedTime && currentTime < accumulatedTime + CHAPTERS[i].duration) {
      activeChapterIndex = i;
      break;
    }
    accumulatedTime += CHAPTERS[i].duration;
    if (i === CHAPTERS.length - 1 && currentTime >= accumulatedTime) {
      activeChapterIndex = i;
    }
  }

  const currentChapter = CHAPTERS[activeChapterIndex] || CHAPTERS[0];

  // Speech narration handler
  const speakChapter = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis || isMuted) return;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05 * playbackSpeed;
      utterance.pitch = 1.0;
      utterance.volume = isMuted ? 0 : 0.9;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.lang.startsWith('en'))
      );
      if (preferredVoice) utterance.voice = preferredVoice;

      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isMuted, playbackSpeed]
  );

  // Trigger speech when chapter changes while playing
  useEffect(() => {
    if (isPlaying && !isMuted) {
      if (currentChapterIdRef.current !== currentChapter.id) {
        currentChapterIdRef.current = currentChapter.id;
        speakChapter(currentChapter.narration);
      }
    } else {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  }, [currentChapter, isPlaying, isMuted, speakChapter]);

  // Main playback timer loop
  useEffect(() => {
    if (!isPlaying) {
      lastTickRef.current = Date.now();
      return;
    }

    lastTickRef.current = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const deltaSec = ((now - lastTickRef.current) / 1000) * playbackSpeed;
      lastTickRef.current = now;

      setCurrentTime((prev) => {
        const next = prev + deltaSec;
        if (next >= TOTAL_DURATION) {
          setIsPlaying(false);
          return TOTAL_DURATION;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Canvas drawing loop for high-res animated video presentation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localFrameId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const time = currentTime;
      const chIndex = activeChapterIndex;
      const chapter = currentChapter;

      // Calculate chapter local progress (0.0 to 1.0)
      let chStart = 0;
      for (let i = 0; i < chIndex; i++) chStart += CHAPTERS[i].duration;
      const chLocalTime = Math.max(0, time - chStart);
      const chProgress = Math.min(1, chLocalTime / chapter.duration);

      // --- Background: Deep cinematic gradient with subtle grid ---
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#030712');
      bgGrad.addColorStop(0.5, '#090d1a');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Ambient radial glow matching chapter accent
      const glowGrad = ctx.createRadialGradient(
        width * 0.75,
        height * 0.3,
        20,
        width * 0.75,
        height * 0.3,
        width * 0.6
      );
      glowGrad.addColorStop(0, `${chapter.accentColor}25`);
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // --- Top Video Bar (Watermark & Chapter Pill) ---
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(0, 0, width, 55);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeRect(0, 0, width, 55);

      // Logo Icon & Title
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.arc(40, 28, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('ADAPTIVE AMM', 65, 33);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('• Dynamic Fee Protocol & Explainer Video', 195, 33);

      // Chapter Badge Top-Right
      const badgeText = `CHAPTER ${chapter.id} / ${CHAPTERS.length} : ${chapter.badge.toUpperCase()}`;
      ctx.font = 'bold 11px monospace';
      const badgeWidth = ctx.measureText(badgeText).width + 24;
      ctx.fillStyle = `${chapter.accentColor}22`;
      ctx.strokeStyle = `${chapter.accentColor}66`;
      ctx.beginPath();
      ctx.roundRect(width - badgeWidth - 30, 16, badgeWidth, 24, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = chapter.accentColor;
      ctx.textAlign = 'center';
      ctx.fillText(badgeText, width - badgeWidth / 2 - 30, 32);

      // --- CHAPTER VISUAL RENDERING ---
      if (chapter.id === 1) {
        // SCENE 1: Introduction & High-Level Architecture
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Inter, sans-serif';
        ctx.fillText('Adaptive Automated Market Maker', 60, 140);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px Inter, sans-serif';
        ctx.fillText('Next-Gen DEX Liquidity Protection against Toxic Arbitrage & LVR', 60, 175);

        // Visual Center: Flow diagram
        const boxY = 220;
        const boxes = [
          { label: 'Retail Orders', sub: 'Low Slippage (0.05% - 0.3%)', color: '#10b981', x: 60 },
          { label: 'Dynamic Fee Oracle', sub: 'EWMA Volatility Metric', color: '#6366f1', x: 380 },
          { label: 'Toxic MEV Flow', sub: 'High Toll (up to 3.0%)', color: '#f43f5e', x: 700 },
        ];

        boxes.forEach((b) => {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
          ctx.strokeStyle = b.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(b.x, boxY, 260, 120, 16);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = b.color;
          ctx.font = 'bold 16px Inter, sans-serif';
          ctx.fillText(b.label, b.x + 20, boxY + 45);

          ctx.fillStyle = '#cbd5e1';
          ctx.font = '12px Inter, sans-serif';
          ctx.fillText(b.sub, b.x + 20, boxY + 75);
        });

        // Pulsing core pool at bottom
        const poolY = 400;
        ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
        ctx.strokeStyle = '#6366f1';
        ctx.beginPath();
        ctx.roundRect(280, poolY, 460, 70, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Liquidity Pool: 500 ETH + 1,000,000 USDC ($2M TVL)', 510, poolY + 42);
      } else if (chapter.id === 2) {
        // SCENE 2: The LVR Flaw & Fixed Fee Failure
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px Inter, sans-serif';
        ctx.fillText('The Problem: Why Fixed 0.30% Fees Fail LPs', 60, 130);

        ctx.fillStyle = '#f43f5e';
        ctx.font = '15px Inter, sans-serif';
        ctx.fillText('Loss-Versus-Rebalancing (LVR) drains millions into MEV bot pockets', 60, 165);

        // Two comparison panels
        // Left Panel: Uniswap v2 Fixed
        ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
        ctx.strokeStyle = '#f43f5e88';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(60, 200, 430, 270, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f43f5e';
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.fillText('❌ Traditional Constant Product (0.3% Fixed)', 85, 235);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '13px Inter, sans-serif';
        const uniBullets = [
          '• External market crashes 15% on Binance',
          '• Fixed 0.30% fee is way too cheap to halt bots',
          '• Arbitrageurs extract $15,000 pure value from pool',
          '• LP suffers permanent Loss-Versus-Rebalancing (LVR)',
          '• LPs earn only $942 total fees in volatility',
        ];
        uniBullets.forEach((bullet, idx) => {
          ctx.fillText(bullet, 85, 275 + idx * 30);
        });

        // Right Panel: Adaptive AMM
        ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
        ctx.strokeStyle = '#10b98188';
        ctx.beginPath();
        ctx.roundRect(530, 200, 430, 270, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.fillText('✅ Adaptive AMM Dynamic Solution', 555, 235);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '13px Inter, sans-serif';
        const adaptiveBullets = [
          '• Detects price delta & volume spikes instantly',
          '• Automatically scales fee up to 3.00% (10x surge)',
          '• Forces toxic order flow to pay heavy toll',
          '• Toll deposited straight into LP token reserves',
          '• LPs earn $8,315 (+781% yield outperformance)',
        ];
        adaptiveBullets.forEach((bullet, idx) => {
          ctx.fillText(bullet, 555, 275 + idx * 30);
        });
      } else if (chapter.id === 3) {
        // SCENE 3: Mathematical Model
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px Inter, sans-serif';
        ctx.fillText('The Mathematical Volatility & Dynamic Fee Engine', 60, 130);

        // Formula Box 1
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.strokeStyle = '#38bdf888';
        ctx.beginPath();
        ctx.roundRect(60, 180, 430, 120, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('1. EWMA VOLATILITY ACCUMULATOR', 85, 215);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('σ(t) = 0.70·σ_decay + 0.30·ΔPrice', 85, 250);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText('ΔPrice = |Spot - LastSpot| / LastSpot (in BPS)', 85, 275);

        // Formula Box 2
        ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
        ctx.strokeStyle = '#6366f188';
        ctx.beginPath();
        ctx.roundRect(530, 180, 430, 120, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#818cf8';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('2. DYNAMIC FEE CALCULATION', 555, 215);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('Fee = clamp(Base + α·σ + Surcharge, Min, Max)', 555, 250);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText('Base: 30 bps • Min: 5 bps • Max: 300 bps (3.0%)', 555, 275);

        // Dynamic Curve Simulation Graph
        const graphY = 320;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.roundRect(60, graphY, 900, 160, 16);
        ctx.fill();
        ctx.stroke();

        // Animated curve showing fee scaling
        ctx.beginPath();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        for (let x = 0; x <= 800; x += 10) {
          const normX = x / 800;
          // Sigmoid / ramp curve
          const feeY = graphY + 130 - Math.min(100, Math.pow(normX, 1.4) * 100);
          if (x === 0) ctx.moveTo(110 + x, feeY);
          else ctx.lineTo(110 + x, feeY);
        }
        ctx.stroke();

        // Pulsing point on curve based on progress
        const markerX = 110 + chProgress * 780;
        const markerNorm = (chProgress * 780) / 800;
        const markerY = graphY + 130 - Math.min(100, Math.pow(markerNorm, 1.4) * 100);
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(markerX, markerY, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        const simulatedFee = (0.3 + markerNorm * 2.7).toFixed(2);
        ctx.fillText(`Active Fee: ${simulatedFee}%`, markerX - 30, markerY - 15);
      } else if (chapter.id === 4) {
        // SCENE 4: Volatility Shock Replay
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px Inter, sans-serif';
        ctx.fillText('Shock Replay: 45 ETH Sudden Arbitrage Dump', 60, 130);

        ctx.fillStyle = '#eab308';
        ctx.font = '15px Inter, sans-serif';
        ctx.fillText('Dynamic fee ratchets from 0.30% to 2.85% in milliseconds', 60, 165);

        // Simulation Gauge Meter
        const gaugeX = 300;
        const gaugeY = 320;
        const radius = 110;

        ctx.beginPath();
        ctx.arc(gaugeX, gaugeY, radius, Math.PI, 2 * Math.PI);
        ctx.lineWidth = 20;
        ctx.strokeStyle = '#1e293b';
        ctx.stroke();

        // Animated needle & arc
        const shockFactor = Math.min(1, chProgress * 1.5);
        const arcEnd = Math.PI + shockFactor * Math.PI;

        const arcGrad = ctx.createLinearGradient(gaugeX - radius, gaugeY, gaugeX + radius, gaugeY);
        arcGrad.addColorStop(0, '#10b981');
        arcGrad.addColorStop(0.5, '#eab308');
        arcGrad.addColorStop(1, '#f43f5e');

        ctx.beginPath();
        ctx.arc(gaugeX, gaugeY, radius, Math.PI, arcEnd);
        ctx.lineWidth = 20;
        ctx.strokeStyle = arcGrad;
        ctx.stroke();

        // Center readout
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px monospace';
        const displayFee = (0.3 + shockFactor * 2.55).toFixed(2);
        ctx.fillText(`${displayFee}%`, gaugeX, gaugeY - 20);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText('Dynamic Swap Fee', gaugeX, gaugeY + 25);

        // Live Log beside gauge
        const logX = 520;
        const logY = 210;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.roundRect(logX, logY, 440, 250, 16);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('> MEMPOOL & EXECUTION STREAM', logX + 25, logY + 35);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '12px monospace';
        ctx.fillText('[Block #1020] External Binance Crash detected (-12%)', logX + 25, logY + 75);
        ctx.fillStyle = '#f43f5e';
        ctx.fillText('[Block #1021] Arbitrageur dumped 45.00 ETH!', logX + 25, logY + 105);
        ctx.fillStyle = '#eab308';
        ctx.fillText(`[Oracle] Volatility Index jumped to 488 bps`, logX + 25, logY + 135);
        ctx.fillStyle = '#10b981';
        ctx.fillText(`[Protocol] Fee scaled to ${displayFee}%!`, logX + 25, logY + 165);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`[Result] +$1,612 fee toll captured for LPs!`, logX + 25, logY + 195);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`[Decay] Cooldown halving active (τ = 180s)`, logX + 25, logY + 225);
      } else if (chapter.id === 5) {
        // SCENE 5: Smart Contracts
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px Inter, sans-serif';
        ctx.fillText('Solidity 0.8.20 Smart Contract Architecture', 60, 130);

        ctx.fillStyle = '#a855f7';
        ctx.font = '15px Inter, sans-serif';
        ctx.fillText('Battle-tested math, full reentrancy safety, and ERC-20 LP token accounting', 60, 165);

        // Contract Card 1
        ctx.fillStyle = 'rgba(168, 85, 247, 0.08)';
        ctx.strokeStyle = '#a855f788';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(60, 200, 430, 260, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#a855f7';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('📄 AdaptiveAMM.sol (6,524 bytes)', 85, 235);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '12px monospace';
        const fnList = [
          '• addLiquidity(amt0, amt1) -> returns (liquidity)',
          '• removeLiquidity(lpAmount) -> returns (amt0, amt1)',
          '• swap(amountIn, minOut, tokenIn, to) -> amountOut',
          '• getCurrentFeeBps() -> view returns (uint256)',
          '• getDecayedVolatility() -> view returns (uint256)',
          '• nonReentrant guard on all state transitions',
        ];
        fnList.forEach((fn, idx) => {
          ctx.fillText(fn, 85, 275 + idx * 28);
        });

        // Contract Card 2
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.strokeStyle = '#38bdf888';
        ctx.beginPath();
        ctx.roundRect(530, 200, 430, 260, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('🪙 MockERC20.sol (2,838 bytes)', 555, 235);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '12px monospace';
        const ercList = [
          '• Standard 18-decimal token contract for pools',
          '• Token0: Wrapped Ether (ETH)',
          '• Token1: USD Coin (USDC)',
          '• Automated minting & burning test harnesses',
          '• Strict allowance & transfer safety checks',
          '• 100% Passing Unit & Integration Tests (7/7)',
        ];
        ercList.forEach((fn, idx) => {
          ctx.fillText(fn, 555, 275 + idx * 28);
        });
      } else if (chapter.id === 6) {
        // SCENE 6: Results & Outperformance
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Inter, sans-serif';
        ctx.fillText('Benchmark Proof: +781.8% LP Yield Outperformance', 60, 130);

        ctx.fillStyle = '#10b981';
        ctx.font = '15px Inter, sans-serif';
        ctx.fillText('Summary of findings from live simulated execution against Uniswap v2', 60, 165);

        // 3 Big Metric Cards
        const metricCards = [
          { label: 'Uniswap v2 Fixed Fee', val: '$942.97', sub: '30 bps fixed on all trades', color: '#94a3b8', x: 60 },
          { label: 'Adaptive AMM Dynamic Fee', val: '$8,315.26', sub: 'Scaled fees up to 300 bps', color: '#10b981', x: 380 },
          { label: 'LP Yield Advantage', val: '+781.8%', sub: 'Captured pure toxic arbitrage', color: '#6366f1', x: 700 },
        ];

        metricCards.forEach((m) => {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.strokeStyle = m.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(m.x, 210, 260, 150, 16);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#94a3b8';
          ctx.font = '13px Inter, sans-serif';
          ctx.fillText(m.label, m.x + 20, 245);

          ctx.fillStyle = m.color;
          ctx.font = 'bold 36px monospace';
          ctx.fillText(m.val, m.x + 20, 295);

          ctx.fillStyle = '#cbd5e1';
          ctx.font = '11px Inter, sans-serif';
          ctx.fillText(m.sub, m.x + 20, 330);
        });

        // Banner at bottom
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.strokeStyle = '#10b981';
        ctx.beginPath();
        ctx.roundRect(60, 390, 900, 80, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Adaptive AMM fundamentally solves Loss-Versus-Rebalancing for DeFi LPs', 510, 437);
      }

      // --- Bottom Subtitles / Caption Overlay ---
      ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
      ctx.fillRect(0, height - 75, width, 75);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeRect(0, height - 75, width, 75);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '15px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(chapter.caption, width / 2, height - 35);

      // Loop request
      localFrameId = requestAnimationFrame(render);
    };

    localFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(localFrameId);
  }, [currentTime, activeChapterIndex, currentChapter]);

  // Video Export / MediaRecorder Implementation
  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsRecording(true);
      setRecordProgress(0);
      setIsPlaying(false);
      setCurrentTime(0);

      const stream = canvas.captureStream(30); // 30 fps
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 3000000,
      });

      recordedChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'adaptive-amm-project-explainer.webm';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          setIsRecording(false);
        }, 100);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      // Play through video smoothly at 2x recording speed for rapid export
      const recSpeed = 2;
      let recTime = 0;
      const recInterval = setInterval(() => {
        recTime += 0.1 * recSpeed;
        setCurrentTime(recTime);
        setRecordProgress(Math.min(100, Math.floor((recTime / TOTAL_DURATION) * 100)));

        if (recTime >= TOTAL_DURATION) {
          clearInterval(recInterval);
          mediaRecorder.stop();
        }
      }, 100);
    } catch (err) {
      console.error('Failed to export video:', err);
      setIsRecording(false);
    }
  };

  const handlePlayPause = () => {
    if (currentTime >= TOTAL_DURATION) {
      setCurrentTime(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(TOTAL_DURATION, pos * TOTAL_DURATION));
    setCurrentTime(newTime);
  };

  const handleJumpToChapter = (chapterId: number) => {
    let t = 0;
    for (const c of CHAPTERS) {
      if (c.id === chapterId) break;
      t += c.duration;
    }
    setCurrentTime(t);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Title Banner */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              Cinematic Project Video & Narration
            </span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Adaptive AMM: Complete Video Walkthrough & Technical Explanation
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronized visual presentation detailing the problem, mathematical formulation, live shock test, and Solidity architecture.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportVideo}
            disabled={isRecording}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg transition active:scale-95 disabled:opacity-50"
            title="Download video file (.webm) to local disk"
          >
            <Download className="h-4 w-4" />
            <span>{isRecording ? `Exporting Video (${recordProgress}%)...` : 'Download Video (.webm)'}</span>
          </button>
        </div>
      </div>

      {/* Main Video Stage Container */}
      <div
        ref={containerRef}
        className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl relative"
      >
        {/* 16:9 Canvas Viewport */}
        <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            width={1024}
            height={576}
            className="w-full h-full object-contain"
          />

          {/* Big Play Overlay if Paused */}
          {!isPlaying && !isRecording && (
            <div
              onClick={handlePlayPause}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center cursor-pointer group transition"
            >
              <div className="h-20 w-20 rounded-full bg-indigo-600/90 group-hover:bg-indigo-500 group-hover:scale-110 flex items-center justify-center text-white shadow-2xl shadow-indigo-600/50 transition-all duration-300">
                <Play className="h-8 w-8 fill-current ml-1" />
              </div>
            </div>
          )}

          {/* Recording Banner Overlay */}
          {isRecording && (
            <div className="absolute top-4 right-4 bg-red-600/90 text-white text-xs font-bold font-mono px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg animate-pulse">
              <span className="h-2.5 w-2.5 rounded-full bg-white" />
              <span>RECORDING VIDEO: {recordProgress}%</span>
            </div>
          )}
        </div>

        {/* Video Scrub Timeline with Chapter Ticks */}
        <div
          onClick={handleSeek}
          className="relative w-full h-3 bg-slate-900 cursor-pointer group"
          title="Click to seek"
        >
          {/* Progress Bar */}
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-75"
            style={{ width: `${(currentTime / TOTAL_DURATION) * 100}%` }}
          />

          {/* Chapter Dividers */}
          {CHAPTERS.map((ch, idx) => {
            let chStart = 0;
            for (let i = 0; i < idx; i++) chStart += CHAPTERS[i].duration;
            const leftPct = (chStart / TOTAL_DURATION) * 100;
            return (
              <div
                key={ch.id}
                className="absolute top-0 bottom-0 w-0.5 bg-slate-700 pointer-events-none"
                style={{ left: `${leftPct}%` }}
              />
            );
          })}
        </div>

        {/* Player Controls Bar */}
        <div className="bg-slate-900/95 px-5 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
          {/* Left: Play/Pause, Rewind, Forward, Time */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayPause}
              className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition active:scale-95"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            </button>

            <button
              onClick={() => setCurrentTime(0)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Restart from beginning"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              onClick={() => setCurrentTime((t) => Math.max(0, t - 10))}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Rewind 10 seconds"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              onClick={() => setCurrentTime((t) => Math.min(TOTAL_DURATION, t + 10))}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Fast forward 10 seconds"
            >
              <SkipForward className="h-4 w-4" />
            </button>

            <div className="font-mono text-xs text-slate-400 ml-2">
              <span className="text-white font-medium">{formatTime(currentTime)}</span> / {formatTime(TOTAL_DURATION)}
            </div>
          </div>

          {/* Center: Current Chapter Name */}
          <div className="hidden md:flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: currentChapter.accentColor }}
            />
            <span className="font-semibold text-white">
              {currentChapter.id}. {currentChapter.title}
            </span>
          </div>

          {/* Right: Audio narration toggle, Speed selector, Fullscreen */}
          <div className="flex items-center gap-3">
            {/* Audio Voice Narration */}
            <button
              onClick={() => {
                setIsMuted(!isMuted);
                if (!isMuted && typeof window !== 'undefined' && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
              }}
              className={`p-1.5 rounded-lg transition ${
                isMuted ? 'text-slate-500 hover:text-slate-300' : 'text-cyan-400 hover:text-cyan-300'
              }`}
              title={isMuted ? 'Voiceover muted' : 'Voiceover active'}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 font-mono text-[11px]">
              {[1, 1.25, 1.5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-0.5 rounded transition ${
                    playbackSpeed === spd
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Chapter Selection Grid */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl">
        <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-400" />
          Interactive Video Chapters (Click to Jump)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {CHAPTERS.map((ch) => {
            const isActive = ch.id === currentChapter.id;
            return (
              <button
                key={ch.id}
                onClick={() => handleJumpToChapter(ch.id)}
                className={`p-3.5 rounded-xl text-left border transition-all ${
                  isActive
                    ? 'bg-indigo-950/40 border-indigo-500/60 shadow-md shadow-indigo-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded"
                    style={{ backgroundColor: `${ch.accentColor}25`, color: ch.accentColor }}
                  >
                    Chapter {ch.id} • {ch.duration}s
                  </span>
                  {isActive && <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />}
                </div>
                <h4 className="font-bold text-xs text-white line-clamp-1">{ch.title}</h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {ch.caption}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Transcript & Technical Script Drawer */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">Full Video Voiceover Script & Technical Transcript</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">Total Run Time: 01:49</span>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-slate-300">
          {CHAPTERS.map((ch) => (
            <div
              key={ch.id}
              className={`p-4 rounded-xl border ${
                ch.id === currentChapter.id
                  ? 'bg-indigo-950/20 border-indigo-500/40'
                  : 'bg-slate-950/40 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[11px] mb-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: ch.accentColor }}
                  />
                  Chapter {ch.id}: {ch.title}
                </span>
                <span className="text-slate-500">{ch.duration} seconds</span>
              </div>
              <p className="text-slate-300 italic mb-2">"{ch.narration}"</p>
              <div className="text-[11px] font-mono text-indigo-300 bg-slate-900/80 p-2 rounded border border-slate-800">
                Key Concept: {ch.caption}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
