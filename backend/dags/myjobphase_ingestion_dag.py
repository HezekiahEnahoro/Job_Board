"""
MyJobPhase Data Ingestion DAG
==============================

Orchestrates job scraping from 10+ sources with:
- Bronze layer (raw data storage)
- Data quality checks via DLQ (dead letter queue)
- Retry logic
- Monitoring

Schedule: Every 6 hours
Author: The_Dev
"""

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from datetime import datetime, timedelta
import sys
import subprocess
import os

# Add app to Python path
sys.path.insert(0, '/opt/airflow')

default_args = {
    'owner': 'data-engineering',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
    # 'retry_exponential_backoff': True,
    # 'max_retry_delay': timedelta(minutes=30),
    'execution_timeout': timedelta(hours=3),
}

dag = DAG(
    'myjobphase_job_ingestion',
    default_args=default_args,
    description='Ingest remote jobs from 10+ sources with Bronze layer',
    schedule_interval='0 */6 * * *',  # Every 6 hours
    start_date=datetime(2026, 4, 1),
    catchup=False,
    tags=['production', 'data-ingestion', 'bronze-layer'],
)


def run_job_ingestion():
    import httpx
    
    print("🚀 Calling API to trigger ingestion...")
    
    with httpx.Client(timeout=7200) as client:
        response = client.post("http://jobboard-api:8000/internal/trigger-ingest")
        print(f"Response: {response.status_code}")
        
        if response.status_code != 200:
            raise Exception(f"Ingestion failed: {response.status_code} - {response.text}")
    
    print("✅ Ingestion complete")


def check_data_quality(**context):
    """
    Validate data quality from DLQ
    """
    from pathlib import Path
    import json
    
    dlq_path = Path('/opt/airflow/data/dlq/filter')
    
    if not dlq_path.exists():
        print("⚠️  No DLQ data found")
        return {'total_filtered': 0}
    
    total_filtered = 0
    sources = {}
    
    # Count filtered records per source
    for source_file in dlq_path.rglob('*.jsonl'):
        with open(source_file, 'r') as f:
            count = sum(1 for line in f if line.strip())
            source_name = source_file.stem
            sources[source_name] = count
            total_filtered += count
    
    print(f"\n📊 Data Quality Report:")
    print(f"  Total filtered (US-only): {total_filtered}")
    for source, count in sorted(sources.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {source}: {count} jobs")
    
    # Alert if too many failures
    if total_filtered > 1000:
        raise ValueError(f"⚠️  Excessive filtering! {total_filtered} jobs rejected")
    
    return {
        'total_filtered': total_filtered,
        'sources': sources
    }


def generate_report(**context):
    """
    Generate Bronze layer statistics
    """
    from pathlib import Path
    import json
    
    bronze_path = Path('/opt/airflow/data/bronze')
    
    if not bronze_path.exists():
        print("⚠️  No Bronze data found")
        return {'total_records': 0}
    
    total_records = 0
    sources = {}
    
    # Count records per source
    for source_dir in bronze_path.iterdir():
        if source_dir.is_dir():
            count = 0
            for json_file in source_dir.rglob('*.json'):
                try:
                    with open(json_file, 'r') as f:
                        data = json.load(f)
                        count += data.get('record_count', 0)
                except Exception as e:
                    print(f"⚠️  Error reading {json_file}: {e}")
            
            sources[source_dir.name] = count
            total_records += count
    
    print(f"\n📊 Bronze Layer Report:")
    print(f"  Total records: {total_records}")
    print(f"  Active sources: {len(sources)}")
    for source, count in sorted(sources.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {source}: {count} records")
    
    return {
        'total_records': total_records,
        'sources': sources,
        'source_count': len(sources)
    }


def cleanup_old_data(**context):
    """
    Delete Bronze files older than 30 days
    """
    from pathlib import Path
    from datetime import datetime, timedelta
    
    bronze_path = Path('/opt/airflow/data/bronze')
    cutoff_date = datetime.now() - timedelta(days=30)
    
    deleted_count = 0
    
    if bronze_path.exists():
        for date_dir in bronze_path.rglob('*'):
            if date_dir.is_dir():
                try:
                    # Parse date from folder name (YYYY-MM-DD)
                    dir_date = datetime.strptime(date_dir.name, '%Y-%m-%d')
                    if dir_date < cutoff_date:
                        print(f"🗑️  Deleting old data: {date_dir}")
                        import shutil
                        shutil.rmtree(date_dir)
                        deleted_count += 1
                except ValueError:
                    # Not a date folder, skip
                    pass
    
    print(f"✅ Cleanup complete: Deleted {deleted_count} old directories")
    return {'deleted_count': deleted_count}

def transform_to_silver(**context):
    """Read Bronze files, clean them, save as Parquet"""
    from pathlib import Path
    import json
    import sys
    sys.path.insert(0, '/opt/airflow')
    from app.transform.silver import SilverLayer

    bronze_path = Path('/opt/airflow/data/bronze')
    silver = SilverLayer(base_path='/opt/airflow/data/silver')

    if not bronze_path.exists():
        print("⚠️  No Bronze data found")
        return

    total_processed = 0

    for source_dir in bronze_path.iterdir():
        if not source_dir.is_dir():
            continue

        all_records = []
        for json_file in source_dir.rglob('*.json'):
            try:
                with open(json_file, 'r') as f:
                    package = json.load(f)
                    records = package.get('data', [])
                    for r in records:
                        r['source'] = source_dir.name
                    all_records.extend(records)
            except Exception as e:
                print(f"⚠️  Error reading {json_file}: {e}")

        if all_records:
            df = silver.transform_bronze_to_silver(all_records)
            silver.save_to_parquet(df, source_dir.name)
            total_processed += len(df)

    print(f"\n💎 Silver complete: {total_processed} total records")


def create_gold_metrics(**context):
    """Load all Silver Parquet, compute Gold aggregations"""
    import sys
    sys.path.insert(0, '/opt/airflow')
    from app.transform.silver import SilverLayer
    from app.transform.gold import GoldLayer

    silver = SilverLayer(base_path='/opt/airflow/data/silver')
    gold = GoldLayer(base_path='/opt/airflow/data/gold')

    df = silver.load_all_silver()

    if df.empty:
        print("⚠️  No Silver data to aggregate")
        return

    daily = gold.create_daily_job_metrics(df)
    gold.save_gold_table(daily, 'daily_job_metrics')

    rankings = gold.create_company_rankings(df)
    gold.save_gold_table(rankings, 'company_rankings')

    source_perf = gold.create_source_performance(df)
    gold.save_gold_table(source_perf, 'source_performance')

    print(f"\n🏆 Gold complete: 3 tables created")

# ==========================================
# DEFINE TASKS
# ==========================================

task_ingest = PythonOperator(
    task_id='ingest_jobs',
    python_callable=run_job_ingestion,
    dag=dag,
)

task_quality_check = PythonOperator(
    task_id='check_data_quality',
    python_callable=check_data_quality,
    provide_context=True,
    dag=dag,
)

task_silver = PythonOperator(
    task_id='transform_to_silver',
    python_callable=transform_to_silver,
    provide_context=True,
    dag=dag,
)

task_gold = PythonOperator(
    task_id='create_gold_metrics',
    python_callable=create_gold_metrics,
    provide_context=True,
    dag=dag,
)

task_generate_report = PythonOperator(
    task_id='generate_report',
    python_callable=generate_report,
    provide_context=True,
    dag=dag,
)

task_cleanup = PythonOperator(
    task_id='cleanup_old_data',
    python_callable=cleanup_old_data,
    provide_context=True,
    dag=dag,
)

# ==========================================
# DEFINE TASK DEPENDENCIES (THE GRAPH!)
# ==========================================

task_ingest >> task_quality_check >> task_silver >> task_gold >> task_generate_report >> task_cleanup