"""
Gold Layer - Aggregated Analytics
===================================

WHY THIS EXISTS:
- Silver = clean individual records (one row per job)
- Gold = business metrics (one row per day/company/skill)
- Gold answers questions like:
  - "Which companies hired most this week?"
  - "Is remote hiring trending up or down?"
  - "What skills are most in demand?"

WHO CONSUMES GOLD:
- Your Next.js dashboard (charts, stats)
- FastAPI endpoints (/api/analytics)
- Future: BI tools like Metabase, Tableau

TRADE-OFF:
- Requires recomputing when Silver changes
- But: Queries are 100x faster than scanning Silver
- But: This is exactly what data warehouses do (dbt models)
"""

import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Optional


class GoldLayer:
    def __init__(self, base_path: str = "data/gold"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def create_daily_job_metrics(self, silver_df: pd.DataFrame) -> pd.DataFrame:
        """
        Daily aggregation: How many jobs posted per day?

        WHY: Shows pipeline volume trends
        Detects if sources went down (sudden drop in daily count)

        Output columns:
        - date, total_jobs, unique_companies, sources_active
        """
        if silver_df.empty or 'posted_at' not in silver_df.columns:
            return pd.DataFrame()

        df = silver_df.copy()
        df['date'] = pd.to_datetime(df['posted_at'], errors='coerce').dt.date

        metrics = df.groupby('date').agg(
            total_jobs=('title', 'count'),
            unique_companies=('company', 'nunique'),
            sources_active=('source', 'nunique') if 'source' in df.columns else ('title', 'count')
        ).reset_index()

        metrics['computed_at'] = datetime.now()
        return metrics.sort_values('date', ascending=False)

    def create_company_rankings(self, silver_df: pd.DataFrame) -> pd.DataFrame:
        """
        Which companies post the most worldwide remote jobs?

        WHY: Shows your pipeline captures real hiring signals
        Useful for users: "Stripe is hiring a lot right now"

        Output: Top 50 companies by job count
        """
        if silver_df.empty or 'company' not in silver_df.columns:
            return pd.DataFrame()

        rankings = silver_df.groupby('company').agg(
            total_jobs=('title', 'count'),
            latest_posting=('posted_at', 'max') if 'posted_at' in silver_df.columns else ('title', 'count')
        ).reset_index()

        rankings = rankings.sort_values('total_jobs', ascending=False).head(50)
        rankings['rank'] = range(1, len(rankings) + 1)
        rankings['computed_at'] = datetime.now()

        return rankings

    def create_source_performance(self, silver_df: pd.DataFrame) -> pd.DataFrame:
        """
        How many jobs does each source contribute?

        WHY: Shows which scrapers are working vs dead
        Operationally: If Remotive drops to 0, something broke

        Output: Jobs per source with % of total
        """
        if silver_df.empty or 'source' not in silver_df.columns:
            return pd.DataFrame()

        perf = silver_df.groupby('source').agg(
            total_jobs=('title', 'count'),
            unique_companies=('company', 'nunique')
        ).reset_index()

        total = perf['total_jobs'].sum()
        perf['pct_of_total'] = (perf['total_jobs'] / total * 100).round(1)
        perf = perf.sort_values('total_jobs', ascending=False)
        perf['computed_at'] = datetime.now()

        return perf

    def save_gold_table(self, df: pd.DataFrame, table_name: str) -> str:
        """
        Save Gold aggregation as Parquet

        WHY name-based (not date-partitioned like Silver):
        - Gold tables get OVERWRITTEN each run (they're derived)
        - Silver is append-only (raw data preserved)
        - Gold is always "latest computed view"

        File: data/gold/{table_name}.parquet
        """
        if df.empty:
            print(f"⚠️  [Gold] No data for {table_name}")
            return ""

        filepath = self.base_path / f"{table_name}.parquet"
        df.to_parquet(filepath, engine='pyarrow', compression='snappy', index=False)

        size_kb = filepath.stat().st_size / 1024
        print(f"🏆 [Gold] {table_name}: {len(df)} rows → {filepath} ({size_kb:.1f} KB)")
        return str(filepath)