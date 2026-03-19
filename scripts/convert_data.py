#!/usr/bin/env python3
"""
Convert bundled_cache.pkl → JSON files for the Next.js app.
Run locally or via GitHub Actions.

Usage:
  python scripts/convert_data.py [path_to_pkl]

If no path given, runs a fresh data pull (requires yfinance + fredapi).
"""
import sys, json, os, pickle, warnings
from pathlib import Path

warnings.filterwarnings("ignore")

OUT_DIR = Path(__file__).parent.parent / "public" / "data"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def convert_from_pkl(pkl_path: str):
    """Convert an existing pkl cache to JSON."""
    with open(pkl_path, "rb") as f:
        cache = pickle.load(f)

    er = cache.get("event_returns", {})
    meta = cache.get("ASSET_META", {})
    order = cache.get("ASSET_ORDER", [])

    # Convert event_returns: {asset: {event: pd.Series}} → {asset: {event: {offset: value}}}
    er_json = {}
    for asset, events in er.items():
        er_json[asset] = {}
        for event, series in events.items():
            er_json[asset][event] = {
                str(int(k)): round(float(v), 4)
                for k, v in series.items()
                if not (hasattr(v, '__float__') and __import__('math').isnan(float(v)))
            }

    # Convert meta: ensure all values are JSON-serializable
    meta_json = {}
    for label, m in meta.items():
        if isinstance(m, dict):
            meta_json[label] = {
                "ticker": m.get("ticker", ""),
                "class": m.get("class", ""),
                "source": m.get("source", "yf"),
                "invert": bool(m.get("invert", True)),
                "is_fred_price": bool(m.get("is_fred_price", False)),
                "is_rates_bp": bool(m.get("is_rates_bp", False)),
                "display_label": m.get("display_label", label),
            }

    write_json("event_returns.json", er_json)
    write_json("asset_meta.json", meta_json)
    write_json("asset_order.json", order)
    write_config()

    print(f"✅ Converted: {len(er_json)} assets, {len(meta_json)} meta entries")


def write_json(filename: str, data):
    path = OUT_DIR / filename
    with open(path, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    size_kb = path.stat().st_size / 1024
    print(f"  {filename}: {size_kb:.0f} KB")


def write_config():
    """Write static config that doesn't change with data pulls."""
    config = {
        "events": [
            {"name": "1973 Oil Embargo†", "date": "1973-10-17"},
            {"name": "1990 Gulf War", "date": "1990-08-02"},
            {"name": "1991 Kuwait Oil Fires", "date": "1991-01-16"},
            {"name": "1998 Desert Fox", "date": "1998-12-16"},
            {"name": "2001 Afghanistan (OEF)", "date": "2001-10-07"},
            {"name": "2003 SARS", "date": "2003-03-12"},
            {"name": "2003 Iraq War", "date": "2003-03-20"},
            {"name": "2011 Libya", "date": "2011-03-19"},
            {"name": "2014 ISIS/Mosul", "date": "2014-06-10"},
            {"name": "2017 Syria Strikes", "date": "2017-04-07"},
            {"name": "2020 COVID-19 PHEIC", "date": "2020-01-30"},
            {"name": "2022 Russia-Ukraine", "date": "2022-02-24"},
            {"name": "2023 Red Sea Crisis", "date": "2023-12-19"},
        ],
        "allTags": [
            "energy_shock", "military_conflict", "shipping_disruption",
            "sanctions", "pandemic", "proxy_war", "nuclear_risk",
        ],
        "eventTags": {
            "1973 Oil Embargo†": ["energy_shock", "sanctions"],
            "1990 Gulf War": ["military_conflict", "energy_shock"],
            "1991 Kuwait Oil Fires": ["military_conflict", "energy_shock"],
            "1998 Desert Fox": ["military_conflict"],
            "2001 Afghanistan (OEF)": ["military_conflict"],
            "2003 SARS": ["pandemic"],
            "2003 Iraq War": ["military_conflict", "energy_shock"],
            "2011 Libya": ["military_conflict", "energy_shock"],
            "2014 ISIS/Mosul": ["military_conflict", "energy_shock"],
            "2017 Syria Strikes": ["military_conflict"],
            "2020 COVID-19 PHEIC": ["pandemic"],
            "2022 Russia-Ukraine": ["military_conflict", "energy_shock", "sanctions"],
            "2023 Red Sea Crisis": ["shipping_disruption", "military_conflict"],
        },
        "macroContext": {
            "1973 Oil Embargo†": {"trigger": 4, "cpi": "high", "fed": "hiking"},
            "1990 Gulf War": {"trigger": 17, "cpi": "high", "fed": "cutting"},
            "1991 Kuwait Oil Fires": {"trigger": 25, "cpi": "high", "fed": "cutting"},
            "1998 Desert Fox": {"trigger": 11, "cpi": "low", "fed": "hold"},
            "2001 Afghanistan (OEF)": {"trigger": 22, "cpi": "low", "fed": "cutting"},
            "2003 SARS": {"trigger": 35, "cpi": "low", "fed": "cutting"},
            "2003 Iraq War": {"trigger": 37, "cpi": "low", "fed": "cutting"},
            "2011 Libya": {"trigger": 85, "cpi": "mid", "fed": "hold"},
            "2014 ISIS/Mosul": {"trigger": 104, "cpi": "low", "fed": "hold"},
            "2017 Syria Strikes": {"trigger": 53, "cpi": "mid", "fed": "hiking"},
            "2020 COVID-19 PHEIC": {"trigger": 54, "cpi": "low", "fed": "cutting"},
            "2022 Russia-Ukraine": {"trigger": 91, "cpi": "high", "fed": "hiking"},
            "2023 Red Sea Crisis": {"trigger": 73, "cpi": "mid", "fed": "hold"},
        },
        "groups": {
            "Risk Barometer": ["S&P 500", "VIX", "US HY OAS", "WTI Crude (spot)", "DXY"],
            "Safe Havens": ["Gold", "Silver", "USDJPY", "USDCHF", "US 10Y Yield"],
            "Oil & Energy": ["WTI Crude (spot)", "Brent Futures", "Natural Gas Fut", "Oil Vol (OVX)", "Energy Equities", "Oil Services"],
            "Precious Metals": ["Gold", "Silver", "Platinum", "Palladium", "Gold Vol (GVZ)"],
            "FX G10": ["DXY", "USDEUR", "USDGBP", "USDJPY", "USDCHF", "USDCAD", "USDAUD", "USDNZD", "USDNOK", "USDSEK"],
            "FX EM Asia": ["USDCNH", "USDKRW", "USDINR", "USDIDR", "USDMYR", "USDTHB", "USDPHP", "USDSGD"],
            "FX EM LATAM": ["USDMXN", "USDBRL", "USDCLP", "USDCOP"],
            "FX EM EMEA": ["USDZAR", "USDTRY", "USDPLN", "USDHUF", "USDCZK", "USDILS"],
            "DM Rates": ["US 3M Yield", "US 2Y Yield", "US 5Y Yield", "US 10Y Yield", "US 30Y Yield"],
            "Credit": ["US IG OAS", "US BBB OAS", "US HY OAS", "HY Bond ETF (HYG)", "IG Bond ETF (LQD)", "EM Sov Debt (EMB)"],
            "Commodities": ["Copper", "Wheat", "Corn", "Soybeans", "Coffee", "Cocoa", "Cotton", "Sugar", "Rice"],
            "Middle East Risk": ["WTI Crude (spot)", "Brent Futures", "Gold", "Oil Vol (OVX)", "USDILS", "Energy Equities"],
            "Sector ETFs": ["Financials", "Technology", "Healthcare", "Industrials", "Cons Discret", "Materials", "Utilities"],
            "Country ETFs": ["ETF Japan", "ETF Brazil", "ETF Korea", "ETF Taiwan", "ETF China", "ETF Germany", "ETF UK", "ETF India"],
            "Defense & Airlines": ["Defense (ITA)", "Airlines (JETS)", "Cyber Security (BUG)"],
            "World Indices": ["Nikkei 225", "Hang Seng", "FTSE 100", "DAX", "Euro Stoxx 50", "STI", "Shanghai Comp", "KOSPI"],
            "Crypto": ["Bitcoin", "Ethereum"],
            "Bond ETFs": ["20Y Treasury (TLT)", "7-10Y Treasury (IEF)", "1-3Y Treasury (SHY)"],
            "Volatility": ["VIX", "VXN (Nasdaq Vol)", "Oil Vol (OVX)", "Gold Vol (GVZ)"],
        },
        "pois": [
            {"label": "t-1M", "offset": -21},
            {"label": "t-1W", "offset": -5},
            {"label": "t0", "offset": 0},
            {"label": "t+1W", "offset": 5},
            {"label": "t+1M", "offset": 21},
            {"label": "t+3M", "offset": 63},
        ],
        "triggerAsset": "Brent Futures",
        "analogueWeights": {"quant": 0.5, "tag": 0.3, "macro": 0.2},
        "sectorETFs": [
            "Financials", "Technology", "Healthcare", "Industrials",
            "Cons Discret", "Materials", "Utilities", "Cons Staples",
            "Gold Miners", "Oil Services", "Regional Banks", "Homebuilders",
        ],
        "portfolioScenarios": {
            "Long Oil / Short Equities": {"WTI Crude (spot)": 1000000, "S&P 500": -500000},
            "Safe Haven Basket": {"Gold": 500000, "USDJPY": 300000, "20Y Treasury (TLT)": 200000},
            "EM Stress Hedge": {"MSCI EM": -500000, "USDCNH": 300000, "EM Sov Debt (EMB)": -200000},
        },
    }

    write_json("config.json", config)


def run_fresh_pull():
    """Run a full data pull from yfinance + FRED and save as JSON."""
    print("Running fresh data pull...")
    print("This requires: pip install yfinance pandas numpy")
    print("For FRED data, set FRED_API_KEY environment variable.")

    import pandas as pd
    import numpy as np
    import yfinance as yf
    from datetime import timedelta

    # Import config from the notebook's §1.2-1.6 equivalent
    # (This is a simplified version — for the full 134-asset pull,
    #  run the notebook and use convert_from_pkl on the output)
    print("⚠️  For the full 134-asset pull, run the Jupyter notebook")
    print("   and pass the resulting pkl to this script:")
    print("   python scripts/convert_data.py path/to/bundled_cache.pkl")
    sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        pkl_path = sys.argv[1]
        if not os.path.exists(pkl_path):
            print(f"❌ File not found: {pkl_path}")
            sys.exit(1)
        convert_from_pkl(pkl_path)
    else:
        run_fresh_pull()
