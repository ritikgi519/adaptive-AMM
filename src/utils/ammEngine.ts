import { FeeConfig, TradeRecord } from '../types/amm';

export class AMMMathEngine {
  reserve0: bigint; // ETH (18 decimals)
  reserve1: bigint; // USDC (18 decimals)
  totalSupply: bigint;
  userLpShares: bigint;

  initialPrice: bigint; // 1e18 scaled
  lastSpotPrice: bigint;
  volatilityAccumulator: bigint;
  lastTimestamp: number;

  totalVolumeUSD: number = 0;
  adaptiveFeesUSD: number = 0;
  staticFeesUSD: number = 0;

  history: TradeRecord[] = [];
  config: FeeConfig;

  constructor(
    initEth: number = 500,
    initUsdc: number = 1000000,
    customConfig?: Partial<FeeConfig>
  ) {
    this.config = {
      baseFeeBps: 30,
      maxVolComponentBps: 40,
      maxSkewSurchargeBps: 25,
      maxSkewDiscountBps: 20,
      minFeeBps: 5,
      maxFeeBps: 100,
      decayHalfLife: 180,
      ...customConfig,
    };

    const r0 = AMMMathEngine.toWei(initEth);
    const r1 = AMMMathEngine.toWei(initUsdc);

    this.reserve0 = r0;
    this.reserve1 = r1;
    this.totalSupply = BigInt(Math.floor(Math.sqrt(Number(r0 * r1))));
    this.userLpShares = this.totalSupply;
    this.initialPrice = (r1 * 10n ** 18n) / r0;
    this.lastSpotPrice = this.initialPrice;
    this.volatilityAccumulator = 0n;
    this.lastTimestamp = Math.floor(Date.now() / 1000);
  }

  static toWei(num: number | string, decimals: number = 18): bigint {
    const s = typeof num === 'number' ? num.toFixed(6) : num;
    const parts = s.split('.');
    const intPart = parts[0] || '0';
    const fracPart = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);
    return BigInt(intPart + fracPart);
  }

  static fromWei(wei: bigint, decimals: number = 18): number {
    const s = wei.toString().padStart(decimals + 1, '0');
    const intPart = s.slice(0, -decimals) || '0';
    const fracPart = s.slice(-decimals);
    return parseFloat(`${intPart}.${fracPart}`);
  }

  getDecayedVolatility(currentTime: number): bigint {
    if (this.volatilityAccumulator === 0n) return 0n;
    const timePassed = currentTime > this.lastTimestamp ? BigInt(currentTime - this.lastTimestamp) : 0n;
    if (timePassed === 0n) return this.volatilityAccumulator;
    const halfLife = BigInt(this.config.decayHalfLife);
    const denominator = 1000000n + (timePassed * 1000000n) / halfLife;
    return (this.volatilityAccumulator * 1000000n) / denominator;
  }

  getVolatilityComponent(currentTime: number): number {
    const vol = this.getDecayedVolatility(currentTime);
    const scaled = Number((vol * 20n) / 100n);
    return Math.min(this.config.maxVolComponentBps, scaled);
  }

  getInventorySkew(isToken0In: boolean): {
    skewComponentBps: number;
    isRebalancing: boolean;
    driftBps: number;
  } {
    if (this.reserve0 === 0n || this.reserve1 === 0n || this.initialPrice === 0n) {
      return { skewComponentBps: 0, isRebalancing: false, driftBps: 0 };
    }

    const value0 = (this.reserve0 * this.initialPrice) / 10n ** 18n;
    const value1 = this.reserve1;
    const totalVal = value0 + value1;
    if (totalVal === 0n) return { skewComponentBps: 0, isRebalancing: false, driftBps: 0 };

    let driftBps = 0n;
    if (value0 > value1) {
      driftBps = ((value0 - value1) * 10000n) / totalVal;
    } else {
      driftBps = ((value1 - value0) * 10000n) / totalVal;
    }

    const token0IsOverweight = value0 > value1;
    let isRebalancing = false;
    let skewComponent = 0n;

    if (token0IsOverweight) {
      if (isToken0In) {
        isRebalancing = false;
        let surcharge = (driftBps * BigInt(this.config.maxSkewSurchargeBps)) / 2000n;
        if (surcharge > BigInt(this.config.maxSkewSurchargeBps)) surcharge = BigInt(this.config.maxSkewSurchargeBps);
        skewComponent = surcharge;
      } else {
        isRebalancing = true;
        let discount = (driftBps * BigInt(this.config.maxSkewDiscountBps)) / 2000n;
        if (discount > BigInt(this.config.maxSkewDiscountBps)) discount = BigInt(this.config.maxSkewDiscountBps);
        skewComponent = -discount;
      }
    } else {
      if (!isToken0In) {
        isRebalancing = false;
        let surcharge = (driftBps * BigInt(this.config.maxSkewSurchargeBps)) / 2000n;
        if (surcharge > BigInt(this.config.maxSkewSurchargeBps)) surcharge = BigInt(this.config.maxSkewSurchargeBps);
        skewComponent = surcharge;
      } else {
        isRebalancing = true;
        let discount = (driftBps * BigInt(this.config.maxSkewDiscountBps)) / 2000n;
        if (discount > BigInt(this.config.maxSkewDiscountBps)) discount = BigInt(this.config.maxSkewDiscountBps);
        skewComponent = -discount;
      }
    }

    return {
      skewComponentBps: Number(skewComponent),
      isRebalancing,
      driftBps: Number(driftBps),
    };
  }

  calculateFee(isToken0In: boolean, currentTime: number): {
    feeBps: number;
    volComponentBps: number;
    skewComponentBps: number;
    isRebalancing: boolean;
    driftBps: number;
  } {
    const volComponentBps = this.getVolatilityComponent(currentTime);
    const { skewComponentBps, isRebalancing, driftBps } = this.getInventorySkew(isToken0In);

    let rawFee = this.config.baseFeeBps + volComponentBps + skewComponentBps;
    let feeBps = Math.max(this.config.minFeeBps, Math.min(this.config.maxFeeBps, rawFee));

    return {
      feeBps,
      volComponentBps,
      skewComponentBps,
      isRebalancing,
      driftBps,
    };
  }

  getCurrentFeeBps(currentTime: number, isToken0In: boolean = true): number {
    return this.calculateFee(isToken0In, currentTime).feeBps;
  }

  getSpotPrice(): number {
    if (this.reserve0 === 0n) return 0;
    return AMMMathEngine.fromWei(this.reserve1) / AMMMathEngine.fromWei(this.reserve0);
  }

  getAmountOut(
    amountInNum: number,
    isToken0In: boolean,
    currentTime: number
  ): {
    amountOutNum: number;
    effectiveFeeBps: number;
    volComponentBps: number;
    skewComponentBps: number;
    isRebalancing: boolean;
    driftBps: number;
    priceImpactBps: number;
    staticAmountOutNum: number;
  } {
    const amountIn = AMMMathEngine.toWei(amountInNum);
    const feeInfo = this.calculateFee(isToken0In, currentTime);

    if (amountIn <= 0n) {
      return {
        amountOutNum: 0,
        effectiveFeeBps: feeInfo.feeBps,
        volComponentBps: feeInfo.volComponentBps,
        skewComponentBps: feeInfo.skewComponentBps,
        isRebalancing: feeInfo.isRebalancing,
        driftBps: feeInfo.driftBps,
        priceImpactBps: 0,
        staticAmountOutNum: 0,
      };
    }

    const rIn = isToken0In ? this.reserve0 : this.reserve1;
    const rOut = isToken0In ? this.reserve1 : this.reserve0;
    const priceImpactBps = Number((amountIn * 10000n) / (rIn + amountIn));

    // Adaptive AMM Output
    const feeBig = BigInt(feeInfo.feeBps);
    const amountInWithFee = amountIn * (10000n - feeBig);
    const numerator = amountInWithFee * rOut;
    const denominator = rIn * 10000n + amountInWithFee;
    const amountOut = numerator / denominator;

    // Static AMM Output (30 bps)
    const staticFeeBig = 30n;
    const staticInWithFee = amountIn * (10000n - staticFeeBig);
    const staticNum = staticInWithFee * rOut;
    const staticDen = rIn * 10000n + staticInWithFee;
    const staticAmountOut = staticNum / staticDen;

    return {
      amountOutNum: AMMMathEngine.fromWei(amountOut),
      effectiveFeeBps: feeInfo.feeBps,
      volComponentBps: feeInfo.volComponentBps,
      skewComponentBps: feeInfo.skewComponentBps,
      isRebalancing: feeInfo.isRebalancing,
      driftBps: feeInfo.driftBps,
      priceImpactBps,
      staticAmountOutNum: AMMMathEngine.fromWei(staticAmountOut),
    };
  }

  executeSwap(
    user: string,
    amountInNum: number,
    isToken0In: boolean,
    currentTime: number,
    isShockTrade: boolean = false
  ): TradeRecord {
    const amountIn = AMMMathEngine.toWei(amountInNum);
    const quote = this.getAmountOut(amountInNum, isToken0In, currentTime);

    const decayedVol = this.getDecayedVolatility(currentTime);
    const amountOut = AMMMathEngine.toWei(quote.amountOutNum);

    if (isToken0In) {
      this.reserve0 += amountIn;
      this.reserve1 -= amountOut;
    } else {
      this.reserve1 += amountIn;
      this.reserve0 -= amountOut;
    }

    const newSpotPrice = (this.reserve1 * 10n ** 18n) / this.reserve0;
    let priceDeltaBps = 0n;
    if (this.lastSpotPrice > 0n) {
      if (newSpotPrice > this.lastSpotPrice) {
        priceDeltaBps = ((newSpotPrice - this.lastSpotPrice) * 10000n) / this.lastSpotPrice;
      } else {
        priceDeltaBps = ((this.lastSpotPrice - newSpotPrice) * 10000n) / this.lastSpotPrice;
      }
    }

    this.volatilityAccumulator = (decayedVol * 70n + priceDeltaBps * 30n) / 100n;
    this.lastSpotPrice = newSpotPrice;
    this.lastTimestamp = currentTime;

    const currentPrice = this.getSpotPrice();
    const volumeUSD = isToken0In ? amountInNum * currentPrice : amountInNum;
    const feeRate = quote.effectiveFeeBps / 10000;
    const feeUSD = volumeUSD * feeRate;

    const staticFeeRate = 30 / 10000;
    const staticFeeUSD = volumeUSD * staticFeeRate;

    this.totalVolumeUSD += volumeUSD;
    this.adaptiveFeesUSD += feeUSD;
    this.staticFeesUSD += staticFeeUSD;

    const record: TradeRecord = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: currentTime,
      user,
      tokenIn: isToken0In ? 'ETH' : 'USDC',
      tokenOut: isToken0In ? 'USDC' : 'ETH',
      amountIn: amountInNum,
      amountOut: quote.amountOutNum,
      feeBps: quote.effectiveFeeBps,
      volComponentBps: quote.volComponentBps,
      skewComponentBps: quote.skewComponentBps,
      isRebalancing: quote.isRebalancing,
      driftBps: quote.driftBps,
      priceUSD: currentPrice,
      priceImpactBps: quote.priceImpactBps,
      volatilityBps: Number(this.volatilityAccumulator),
      feeUSD,
      reserve0: AMMMathEngine.fromWei(this.reserve0),
      reserve1: AMMMathEngine.fromWei(this.reserve1),
      isShockTrade,
    };

    this.history.unshift(record);
    return record;
  }

  addLiquidity(ethAmount: number, usdcAmount: number): { lpMinted: number } {
    const a0 = AMMMathEngine.toWei(ethAmount);
    const a1 = AMMMathEngine.toWei(usdcAmount);

    let liquidity = 0n;
    if (this.reserve0 === 0n && this.reserve1 === 0n) {
      liquidity = BigInt(Math.floor(Math.sqrt(Number(a0 * a1))));
      this.initialPrice = (a1 * 10n ** 18n) / a0;
      this.lastSpotPrice = this.initialPrice;
    } else {
      const l0 = (a0 * this.totalSupply) / this.reserve0;
      const l1 = (a1 * this.totalSupply) / this.reserve1;
      liquidity = l0 < l1 ? l0 : l1;
    }

    this.reserve0 += a0;
    this.reserve1 += a1;
    this.totalSupply += liquidity;
    this.userLpShares += liquidity;

    return { lpMinted: AMMMathEngine.fromWei(liquidity) };
  }

  removeLiquidity(percentage: number): { ethOut: number; usdcOut: number } {
    if (percentage <= 0 || percentage > 100) throw new Error('Invalid percentage');
    const sharesToBurn = (this.userLpShares * BigInt(percentage)) / 100n;
    if (sharesToBurn <= 0n) return { ethOut: 0, usdcOut: 0 };

    const a0 = (sharesToBurn * this.reserve0) / this.totalSupply;
    const a1 = (sharesToBurn * this.reserve1) / this.totalSupply;

    this.userLpShares -= sharesToBurn;
    this.totalSupply -= sharesToBurn;
    this.reserve0 -= a0;
    this.reserve1 -= a1;

    return {
      ethOut: AMMMathEngine.fromWei(a0),
      usdcOut: AMMMathEngine.fromWei(a1),
    };
  }

  reset(initEth: number = 500, initUsdc: number = 1000000) {
    const r0 = AMMMathEngine.toWei(initEth);
    const r1 = AMMMathEngine.toWei(initUsdc);

    this.reserve0 = r0;
    this.reserve1 = r1;
    this.totalSupply = BigInt(Math.floor(Math.sqrt(Number(r0 * r1))));
    this.userLpShares = this.totalSupply;
    this.initialPrice = (r1 * 10n ** 18n) / r0;
    this.lastSpotPrice = this.initialPrice;
    this.volatilityAccumulator = 0n;
    this.lastTimestamp = Math.floor(Date.now() / 1000);
    this.totalVolumeUSD = 0;
    this.adaptiveFeesUSD = 0;
    this.staticFeesUSD = 0;
    this.history = [];
  }
}
