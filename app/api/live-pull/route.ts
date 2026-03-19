import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/live-pull
 * Server-side proxy for live event data.
 * Uses Yahoo Finance API directly (no yfinance Python dependency).
 * FRED_API_KEY is read from environment variables — never sent to client.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventName, eventDate, tickers } = body;

    if (!eventName || !eventDate || !tickers || !Array.isArray(tickers)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const d0 = new Date(eventDate);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - d0.getTime()) / 86400000);

    const start = new Date(d0.getTime() - 120 * 86400000);
    const end = new Date(d0.getTime() + (daysSince + 30) * 86400000);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    // Fetch from Yahoo Finance v8 API
    const results: Record<string, Record<string, number>> = {};

    // Process tickers in batches of 10
    const batchSize = 10;
    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);
      const promises = batch.map(async ({ ticker, label, isRate }: { ticker: string; label: string; isRate: boolean }) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${Math.floor(start.getTime() / 1000)}&period2=${Math.floor(end.getTime() / 1000)}&interval=1d`;
          const resp = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
          });
          if (!resp.ok) return null;

          const data = await resp.json();
          const chart = data?.chart?.result?.[0];
          if (!chart) return null;

          const timestamps = chart.timestamp || [];
          const closes = chart.indicators?.quote?.[0]?.close || [];

          if (timestamps.length === 0) return null;

          // Find Day 0 index
          const d0Time = d0.getTime() / 1000;
          let day0Idx = -1;
          for (let j = 0; j < timestamps.length; j++) {
            if (timestamps[j] >= d0Time) {
              day0Idx = j;
              break;
            }
          }
          if (day0Idx === -1) return null;

          // Anchor at day0 - 5 trading days
          const anchorIdx = Math.max(0, day0Idx - 5);
          const anchor = closes[anchorIdx];
          if (!anchor || isNaN(anchor)) return null;

          // Compute returns at each offset
          const returns: Record<string, number> = {};
          for (let off = -63; off <= 67; off++) {
            const idx = day0Idx + off;
            if (idx >= 0 && idx < closes.length && closes[idx] != null && !isNaN(closes[idx])) {
              const ret = isRate
                ? (closes[idx] - anchor) * 100
                : ((closes[idx] / anchor) - 1) * 100;
              returns[String(off)] = Math.round(ret * 10000) / 10000;
            }
          }

          return { label, returns };
        } catch {
          return null;
        }
      });

      const batchResults = await Promise.all(promises);
      for (const r of batchResults) {
        if (r) results[r.label] = r.returns;
      }
    }

    // Also fetch FRED data if API key is available
    const fredApiKey = process.env.FRED_API_KEY;
    if (fredApiKey) {
      const fredMap: Record<string, string> = {
        'US 10Y Breakeven': 'T10YIE',
        'US 5Y Breakeven': 'T5YIE',
        'US 10Y Real Yield': 'DFII10',
        'US IG OAS': 'BAMLC0A0CM',
        'US BBB OAS': 'BAMLC0A4CBBB',
        'US HY OAS': 'BAMLH0A0HYM2',
      };

      for (const [label, seriesId] of Object.entries(fredMap)) {
        try {
          const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&observation_start=${startStr}&observation_end=${endStr}&api_key=${fredApiKey}&file_type=json`;
          const resp = await fetch(url);
          if (!resp.ok) continue;

          const data = await resp.json();
          const obs = data?.observations || [];
          if (obs.length === 0) continue;

          // Convert to offset-based returns (simplified)
          // This is a basic implementation — the full notebook logic is more sophisticated
          const values = obs
            .filter((o: any) => o.value !== '.')
            .map((o: any) => ({ date: new Date(o.date), value: parseFloat(o.value) }));

          if (values.length > 0) {
            // Find closest to d0
            let closestIdx = 0;
            let closestDiff = Infinity;
            for (let j = 0; j < values.length; j++) {
              const diff = Math.abs(values[j].date.getTime() - d0.getTime());
              if (diff < closestDiff) {
                closestDiff = diff;
                closestIdx = j;
              }
            }

            const anchorIdx = Math.max(0, closestIdx - 5);
            const anchor = values[anchorIdx].value;
            const returns: Record<string, number> = {};

            for (let j = 0; j < values.length; j++) {
              const off = j - closestIdx;
              if (off >= -63 && off <= 67) {
                // FRED series are rates/spreads → delta in bps
                returns[String(off)] = Math.round((values[j].value - anchor) * 100 * 10000) / 10000;
              }
            }

            results[label] = returns;
          }
        } catch {
          // FRED pull failed — non-fatal
        }
      }
    }

    return NextResponse.json({
      eventName,
      eventDate,
      nAssets: Object.keys(results).length,
      returns: results,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to pull data', details: String(err) },
      { status: 500 }
    );
  }
}
