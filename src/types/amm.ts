export interface FeeConfig {
  baseFeeBps: number; // 30 bps (0.30%)
  maxVolComponentBps: number; // 40 bps
  maxSkewSurchargeBps: number; // +25 bps
  maxSkewDiscountBps: number; // -20 bps
  minFeeBps: number; // 5 bps (0.05%)
  maxFeeBps: number; // 100 bps (1.00%)
  decayHalfLife: number; // in seconds, default 180
}

export interface TradeRecord {
  id: string;
  timestamp: number;
  user: string;
  tokenIn: 'ETH' | 'USDC';
  tokenOut: 'ETH' | 'USDC';
  amountIn: number;
  amountOut: number;
  feeBps: number;
  volComponentBps: number;
  skewComponentBps: number;
  isRebalancing: boolean;
  driftBps: number;
  priceUSD: number;
  priceImpactBps: number;
  volatilityBps: number;
  feeUSD: number;
  reserve0: number; // ETH
  reserve1: number; // USDC
  isShockTrade?: boolean;
}

export interface PoolState {
  reserve0: bigint; // ETH (18 decimals)
  reserve1: bigint; // USDC (18 decimals)
  initialPrice: bigint;
  totalSupply: bigint;
  userLpBalance: bigint;
  lastSpotPrice: bigint;
  volatilityAccumulator: bigint;
  lastTimestamp: number;
  totalVolumeUSD: number;
  adaptiveFeesUSD: number;
  staticFeesUSD: number;
}

export interface TestCase {
  id: number;
  title: string;
  description: string;
  passed: boolean;
  status: 'idle' | 'running' | 'success' | 'failure';
  details?: string;
  timeMs?: number;
}
