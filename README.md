# Event Analogue Dashboard

Cross-asset geopolitical event analogue tracker. Built with Next.js 14, Plotly.js, and Tailwind CSS. Deployed on Vercel.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  GitHub Actions (daily cron + manual)                    │
│  → Runs Python data pull (yfinance + FRED)              │
│  → Converts to JSON → Commits to repo                   │
│  → Vercel auto-deploys                                  │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│  Next.js on Vercel                                       │
│                                                          │
│  Static Data (public/data/*.json)                       │
│  → event_returns.json (134 assets × 13 events)          │
│  → asset_meta.json, config.json                         │
│                                                          │
│  API Route (/api/live-pull)                             │
│  → Server-side yfinance + FRED proxy                    │
│  → FRED_API_KEY from Vercel env vars                    │
│                                                          │
│  Client-side Engine (lib/engine.ts)                     │
│  → Full analogue scoring, trade ideas, stress test      │
│  → All computation runs in the browser                  │
└─────────────────────────────────────────────────────────┘
```

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Generate data files
Run your Jupyter notebook to produce `bundled_cache.pkl`, then:
```bash
python scripts/convert_data.py path/to/bundled_cache.pkl
```
This creates `public/data/*.json` files.

### 3. Set environment variables
```bash
cp .env.example .env.local
# Edit .env.local and add your FRED_API_KEY
```

### 4. Run locally
```bash
npm run dev
```

## Deployment (Vercel)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/event-analogue-dashboard.git
git branch -M main
git push -u origin main
```

### 2. Connect to Vercel
- Go to vercel.com → Import Project → Select your repo
- Framework: Next.js (auto-detected)
- Add environment variable: `FRED_API_KEY` = your key

### 3. Set up GitHub Actions secrets
- Go to your repo → Settings → Secrets → Actions
- Add: `FRED_API_KEY` = your FRED API key

### 4. Data refresh
- **Automatic:** Runs daily at 06:00 UTC via GitHub Actions
- **Manual:** Go to Actions tab → "Refresh Data" → Run workflow

## Project Structure

```
app/
  page.tsx              # Watchlist (landing page)
  live/page.tsx         # Live Event workflow
  signals/page.tsx      # Trade Signals
  settings/page.tsx     # Settings & Events
  api/live-pull/        # Server-side data pull proxy

lib/
  engine.ts             # Full analogue engine (ported from Python)
  data.ts               # Data loading and parsing
  types.ts              # TypeScript interfaces
  theme.ts              # Colors, chart config

components/
  charts/               # Plotly chart components
  tables/               # Data table components
  ui/                   # Reusable UI primitives

scripts/
  convert_data.py       # pkl → JSON conversion

public/data/            # Pre-computed data files (auto-generated)

.github/workflows/
  refresh-data.yml      # Daily data refresh
```

## Secrets

| Secret | Location | Purpose |
|--------|----------|---------|
| `FRED_API_KEY` | Vercel env vars | FRED API calls in `/api/live-pull` |
| `FRED_API_KEY` | GitHub Actions secrets | Data refresh workflow |

The FRED API key is **never** sent to the browser. It's only used:
1. Server-side in the `/api/live-pull` Next.js route handler
2. In GitHub Actions during the data refresh workflow

## Engine

The analogue engine (`lib/engine.ts`) is a complete TypeScript port of the Python notebook's §5.1–5.15:

- **score()** — Cosine + Jaccard + Macro composite similarity
- **ideas()** — Trade signal generation (median, hit rate, vol-adj)
- **screener()** — Conviction + bimodal + redundancy filter
- **gate()** — Entry/exit timing with TP/SL
- **stress()** — Portfolio PnL across scenarios
- **leadlag()** — Cross-asset timing matrix
- **correlation()** — Return correlation at any horizon
- **reverseAnalogue()** — Pattern-first event matching
- **sectorRotation()** — Sector ETF ranking
- **signalDecay()** — Rank evolution tracker
- **prepos()** — Pre-positioning playbook
- **bci()** + **kelly()** — Confidence intervals + Kelly sizing
- **wfv()** — Walk-forward validation
- **mae()** — Max adverse excursion
- **memo()** — Auto-generated trade memo
- **weightOptimizer()** — Grid search for optimal weights
