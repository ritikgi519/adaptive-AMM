# Adaptive AMM (Automated Market Maker)

An advanced decentralized exchange protocol featuring **adaptive dynamic fees** and **volatility tracking** designed to protect Liquidity Providers (LPs) against toxic order flow, MEV sandwich attacks, and Loss-Versus-Rebalancing (LVR).

---

## ⚡ Overview & Problem Statement

In standard constant-product AMMs (such as Uniswap v2), swap fees are fixed (typically 30 bps or 0.30%). During high market volatility:
1. **Toxic Arbitrage:** Arbitrageurs and MEV bots exploit lag between CEX and AMM prices, draining value from LPs.
2. **Loss-Versus-Rebalancing (LVR):** Fixed fees fail to compensate LPs for the sharp adverse selection during large price shocks.
3. **Inefficiency during calm periods:** A fixed 0.30% fee is too high when markets are placid, driving traders to lower-fee venues.

**Adaptive AMM solves this by dynamically tuning swap fees in real-time:**
- **Calm markets:** Compresses fees down to `minFee` (e.g. 0.05% - 0.30%) to attract retail volume and maximize capital utilization.
- **Volatile shocks / Large dumps:** Surges fees up to `maxFee` (e.g. 3.00%), capturing excess profit for LPs and discouraging toxic arbitrage.

---

## 📐 Mathematical Formulation

### 1. Spot Price & Volatility Metric
At any trade $t$, spot price $P_t$ is calculated from pool reserves:
$$P_t = \frac{\text{reserve}_1}{\text{reserve}_0}$$

When a trade occurs, the relative price delta in basis points is:
$$\Delta P = \frac{|P_t - P_{t-1}|}{P_{t-1}} \times 10^4$$

The pool maintains an Exponentially Weighted Moving Average (EWMA) of volatility $\sigma_t$:
$$\sigma_t = 0.70 \times \sigma_{\text{decayed}} + 0.30 \times \Delta P$$

### 2. Time-Based Volatility Decay
When no volatile trades occur, the accumulated volatility decays over time according to a half-life function ($\tau = 180\text{ seconds}$):
$$\sigma_{\text{decayed}}(t) = \frac{\sigma_{t-1}}{1 + \frac{\Delta t}{\tau}}$$

### 3. Dynamic Fee Engine
The instantaneous fee $f_t$ (in basis points) is:
$$f_t = \text{clamp}\left(f_{\text{base}} + \frac{\sigma_t \times \alpha}{100} + \text{Surcharge}(\text{Impact}),\ f_{\text{min}},\ f_{\text{max}}\right)$$

Where:
- $f_{\text{base}} = 30\text{ bps (0.30\%)}$
- $f_{\text{min}} = 5\text{ bps (0.05\%)}$
- $f_{\text{max}} = 300\text{ bps (3.00\%)}$
- $\alpha = 15$ (volatility sensitivity)
- $\text{Surcharge} = \max\left(0, \frac{\text{PriceImpact} - 100}{4}\right)$

---

## 📂 Repository Structure

```
adaptive-amm/
├── contracts/
│   ├── AdaptiveAMM.sol       # Core AMM contract with dynamic fee oracle
│   └── MockERC20.sol         # Standard test tokens (e.g., ETH, USDC)
├── scripts/
│   ├── compile.js            # Solidity 0.8.20 compiler script using solc
│   └── demo.js               # Simulation comparing Adaptive AMM vs Uniswap v2
├── test/
│   └── AdaptiveAMM.test.js   # Automated unit & integration test suite
└── package.json
```

---

## 🚀 Running the Project

### 1. Compile Contracts
Compile `AdaptiveAMM.sol` and `MockERC20.sol` directly to EVM bytecode and ABIs:
```bash
npm run compile
```

### 2. Run Test Suite
Run the 7-stage automated protocol verification test:
```bash
npm test
```

### 3. Run Protocol Benchmark Demo
Simulate calm trading, a volatility shock attack, and market cooldown, with a side-by-side comparison against Uniswap v2:
```bash
npm run demo
```

---

## 📊 Benchmark Results

| Metric | Uniswap v2 (Static 0.3%) | Adaptive AMM | Advantage |
| :--- | :--- | :--- | :--- |
| **Normal Swaps Fee** | 0.30% | 0.30% - 0.33% | Competitive retail pricing |
| **Shock Trade Fee** | 0.30% | **2.14% - 3.00%** | Defends reserves |
| **LP Yield in Volatility** | $942.97 | **$8,315.26** | **+781.8% LP Return** |
| **LVR Protection** | None (Arbitrageurs extract profit) | High (Arbitrage fees paid to LPs) | Significant mitigation |

---

## 📜 License
MIT License - Created for DeFi research and simulation.
