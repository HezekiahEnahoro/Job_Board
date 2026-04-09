"""
Bronze Layer - Immutable Raw Data Storage
==========================================

WHY THIS EXISTS:
- Save raw API data before any processing
- Disaster recovery: Can replay pipeline if database fails
- Audit trail: Know exactly what APIs returned
- Data quality: Track failures over time

TRADE-OFF:
- Uses more disk space (raw + processed)
- But: Can rebuild database from Bronze
- But: Shows "data lake" thinking to recruiters
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List


class BronzeStorage:
    """
    Bronze Layer = Raw data exactly as received from APIs
    
    Never overwrite Bronze files - append-only, immutable
    """
    
    def __init__(self, base_path: str = "data/bronze"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    def save_raw_response(
        self, 
        source_name: str,      # e.g. "greenhouse_stripe"
        data: List[Dict],      # Raw API response (list of jobs)
        metadata: Dict = None  # Optional: total_found, fetch_duration, etc.
    ) -> str:
        """
        Save raw API response to Bronze layer
        
        File Structure: data/bronze/{source}/{YYYY-MM-DD}/{HH-MM-SS}.json
        
        WHY date partitions: Easy to delete old data, query by date
        WHY timestamp: Multiple runs per day don't conflict
        
        Returns: filepath where data was saved
        """
        today = datetime.now().strftime("%Y-%m-%d")
        timestamp = datetime.now().strftime("%H-%M-%S")
        
        # Create directory: bronze/{source}/{date}/
        source_path = self.base_path / source_name / today
        source_path.mkdir(parents=True, exist_ok=True)
        
        # Filename with timestamp
        filename = f"{timestamp}.json"
        filepath = source_path / filename
        
        # Package with metadata
        package = {
            "source": source_name,
            "ingested_at": datetime.now().isoformat(),
            "record_count": len(data),
            "metadata": metadata or {},
            "data": data  # The actual raw jobs
        }
        
        # Write to disk
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(package, f, indent=2, default=str, ensure_ascii=False)
        
        print(f"📦 [Bronze] Saved {len(data)} records → {filepath.relative_to(self.base_path.parent)}")
        return str(filepath)
    
    def get_latest_raw(self, source_name: str) -> Dict[str, Any] | None:
        """
        Get most recent Bronze file for a source
        
        USE CASE: Replay pipeline, debugging
        """
        source_path = self.base_path / source_name
        if not source_path.exists():
            return None
        
        all_files = list(source_path.rglob("*.json"))
        if not all_files:
            return None
        
        # Most recent file
        latest = max(all_files, key=lambda p: p.stat().st_mtime)
        
        with open(latest, 'r', encoding='utf-8') as f:
            return json.load(f)


class DeadLetterQueue:
    """
    Dead Letter Queue = Storage for failed/invalid records
    
    WHY: One bad record shouldn't crash entire pipeline
    
    CONCEPT FROM: AWS SQS, Kafka, RabbitMQ (industry standard)
    """
    
    def __init__(self, base_path: str = "data/dlq"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    def log_failure(
        self,
        source: str,           # Which scraper
        record: Dict,          # The bad record
        error: str,            # Why it failed
        error_type: str = "filter"  # Category: filter, validation, parsing
    ):
        """
        Log a failed record to DLQ
        
        File Format: JSONL (one JSON per line)
        WHY JSONL: Can append without reading entire file
        
        Structure: data/dlq/{error_type}/{YYYY-MM-DD}/{source}.jsonl
        """
        today = datetime.now().strftime("%Y-%m-%d")
        dlq_path = self.base_path / error_type / today
        dlq_path.mkdir(parents=True, exist_ok=True)
        
        filename = f"{source}.jsonl"
        filepath = dlq_path / filename
        
        failure_record = {
            "timestamp": datetime.now().isoformat(),
            "source": source,
            "error": error,
            "error_type": error_type,
            "record": record
        }
        
        # Append one line
        with open(filepath, 'a', encoding='utf-8') as f:
            f.write(json.dumps(failure_record, default=str, ensure_ascii=False) + '\n')
    
    def get_failure_stats(self, days: int = 7) -> Dict[str, int]:
        """
        Get DLQ statistics for monitoring
        
        Returns: {"filter": 45, "validation": 12, ...}
        """
        from datetime import timedelta
        
        cutoff = datetime.now() - timedelta(days=days)
        cutoff_str = cutoff.strftime("%Y-%m-%d")
        
        stats = {}
        for error_dir in self.base_path.iterdir():
            if not error_dir.is_dir():
                continue
            
            count = 0
            for date_dir in error_dir.iterdir():
                if date_dir.name >= cutoff_str:
                    for jsonl_file in date_dir.glob("*.jsonl"):
                        with open(jsonl_file, 'r') as f:
                            count += sum(1 for _ in f)
            
            stats[error_dir.name] = count
        
        return stats