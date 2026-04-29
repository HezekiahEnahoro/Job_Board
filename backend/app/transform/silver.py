"""
Silver Layer - Cleaned and Standardized Data
=============================================

WHY THIS EXISTS:
- Bronze = raw (exactly what API returned, never touch it)
- Silver = cleaned (standardized, validated, deduplicated)
- We save as Parquet because:
  - Columnar format (read only columns you need, not full rows)
  - Built-in compression (snappy = ~70% smaller than JSON)
  - Industry standard for data lakes (S3 + Parquet = standard stack)

TRADE-OFF:
- Requires pandas + pyarrow installed
- Binary format (not human-readable like JSON)
- BUT: 10x faster queries on large datasets
- BUT: Shows "I understand big data" to recruiters
"""

import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any
from app.core.translate import translate_to_english, is_english


class SilverLayer:
    def __init__(self, base_path: str = "data/silver"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def transform_bronze_to_silver(self, bronze_data: List[Dict[Any, Any]]) -> pd.DataFrame:
        """
        Transform raw Bronze data into clean Silver DataFrame

        WHY EACH STEP:
        - Standardize columns: Downstream tools expect consistent naming
        - Fill nulls: Prevents crashes in aggregations
        - Parse dates: Enables time-series analysis
        - Deduplicate: APIs sometimes return same job twice
        - Add metadata: Track when data was processed (data lineage)
        """
        if not bronze_data:
            return pd.DataFrame()

        df = pd.DataFrame(bronze_data)

        # Standardize column names (snake_case, lowercase)
        # WHY: Consistent naming prevents "KeyError: 'Title' vs 'title'" bugs
        df.columns = df.columns.str.lower().str.replace(' ', '_').str.strip()

        # Handle nulls with sensible defaults
        # WHY: AVG(salary) with nulls = wrong results
        if 'salary' in df.columns:
            df['salary'] = pd.to_numeric(df['salary'], errors='coerce').fillna(0)
        if 'location' in df.columns:
            df['location'] = df['location'].fillna('Remote')
        for desc_col in ['description', 'description_text']:
            if desc_col in df.columns:
                df[desc_col] = df[desc_col].fillna('')

        # Parse dates
        # WHY: String dates can't be filtered by range (WHERE posted_at > '2025-01-01')
        for date_col in ['posted_at', 'scraped_at', 'created_at']:
            if date_col in df.columns:
                df[date_col] = pd.to_datetime(df[date_col], errors='coerce', utc=True).dt.as_unit('us')

        # Clean text fields
        # WHY: "  Stripe  " and "Stripe" are treated as different companies
        for text_col in ['title', 'company', 'location']:
            if text_col in df.columns:
                df[text_col] = df[text_col].astype(str).str.strip()

        # ── Translate non-English descriptions 
        # WHY: Jobs from European/African sources (EuropeRemotely, LandingJobs,
        # Arbeitnow, Himalayas) often have descriptions in German, French, Portuguese etc. Translate only what needs it — English jobs are skipped by fast keyword heuristic (no API call).

        if 'description_text' in df.columns:
            mask = ~df['description_text'].fillna('').apply(is_english)
            non_english_count = mask.sum()
            if non_english_count > 0:
                print(f"  🌍 Translating {non_english_count} non-English descriptions...")
                df.loc[mask, 'description_text'] = (
                    df.loc[mask, 'description_text']
                    .apply(translate_to_english)
                )
                print(f"  ✅ Translation complete")

        # Deduplicate
        # WHY: Greenhouse + Lever might list same job. Duplicates inflate metrics.
        subset_cols = [c for c in ['title', 'company', 'url'] if c in df.columns]
        if subset_cols:
            before = len(df)
            df = df.drop_duplicates(subset=subset_cols, keep='last')
            after = len(df)
            if before != after:
                print(f"  🔄 Deduplicated: {before} → {after} records")

        # Add Silver metadata (data lineage)
        # WHY: Know WHEN data was processed, not just when it was ingested
        df['silver_processed_at'] = datetime.now()
        df['layer'] = 'silver'

        return df

    def save_to_parquet(self, df: pd.DataFrame, source: str) -> str:
        """
        Save Silver DataFrame as Parquet

        WHY PARQUET OVER CSV/JSON:
        - CSV: 100MB file, full scan to read any column
        - Parquet: 30MB file, read ONLY the columns you need
        - Snappy compression: Fast decompress, good ratio
        - Schema enforcement: Column types are stored in file

        File: data/silver/{source}/{YYYY-MM-DD}.parquet
        WHY date partition: Easy to load just "last 7 days" of data
        """
        if df.empty:
            print(f"⚠️  [Silver] No data to save for {source}")
            return ""

        today = datetime.now().strftime("%Y-%m-%d")
        source_path = self.base_path / source
        source_path.mkdir(parents=True, exist_ok=True)

        filepath = source_path / f"{today}.parquet"

        df.to_parquet(
            filepath,
            engine='pyarrow',
            compression='snappy',  # Fast + good compression ratio
            index=False
        )

        size_kb = filepath.stat().st_size / 1024
        print(f"💎 [Silver] {source}: {len(df)} records → {filepath} ({size_kb:.1f} KB)")
        return str(filepath)

    def load_all_silver(self) -> pd.DataFrame:
        """
        Load all Silver Parquet files into one DataFrame

        WHY: Gold layer needs ALL sources combined to compute metrics
        """
        all_files = list(self.base_path.rglob("*.parquet"))

        if not all_files:
            print("⚠️  [Silver] No Parquet files found")
            return pd.DataFrame()

        dfs = []
        for f in all_files:
            try:
                dfs.append(pd.read_parquet(f))
            except Exception as e:
                print(f"⚠️  [Silver] Could not read {f}: {e}")

        combined = pd.concat(dfs, ignore_index=True)
        print(f"💎 [Silver] Loaded {len(combined)} total records from {len(all_files)} files")
        return combined