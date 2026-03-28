"""
AROS Database Layer
Manages all persistence operations with PostgreSQL
"""

import psycopg2
import psycopg2.extras
import json
import math
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from contextlib import contextmanager


def sanitize_for_json(obj):
    """Recursively sanitize an object to remove non-JSON-serializable floats (Infinity, NaN)"""
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [sanitize_for_json(item) for item in obj]
    elif isinstance(obj, float):
        if math.isinf(obj) or math.isnan(obj):
            return None  # Convert Infinity/NaN to null
        return obj
    return obj


class DatabaseConfig:
    """Centralized database configuration"""
    def __init__(self, dbname="aros", user="postgres", password="test123", 
                 host="localhost", port="5432"):
        self.dbname = dbname
        self.user = user
        self.password = password
        self.host = host
        self.port = port
    
    def get_connection_string(self):
        return f"dbname={self.dbname} user={self.user} password={self.password} host={self.host} port={self.port}"


class DatabaseManager:
    """Handles all database operations"""
    
    def __init__(self, config: DatabaseConfig = None):
        self.config = config or DatabaseConfig(dbname="aros")
        self.connection = None
    
    @contextmanager
    def get_cursor(self):
        """Context manager for database cursor"""
        conn = psycopg2.connect(self.config.get_connection_string())
        try:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            yield cursor
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    # ─────────────────────────────────────────────────────────────────────────
    # DECISION OPERATIONS
    # ─────────────────────────────────────────────────────────────────────────
    
    def create_decision(self, decision_data: Dict[str, Any]) -> str:
        """
        Create a new decision record
        
        Args:
            decision_data: {
                decision_id, task_id, signal_detection, diagnosis, 
                strategy, simulation, governance_check, decision_output,
                decision_type, blast_radius, expected_uplift_pct, confidence
            }
        
        Returns:
            decision_id
        """
        with self.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO decisions (
                    decision_id, task_id, created_at, status,
                    signal_detection, diagnosis, strategy, simulation,
                    governance_check, decision_output,
                    decision_type, blast_radius, expected_uplift_pct, confidence,
                    metadata
                ) VALUES (
                    %(decision_id)s, %(task_id)s, %(created_at)s, %(status)s,
                    %(signal_detection)s, %(diagnosis)s, %(strategy)s, %(simulation)s,
                    %(governance_check)s, %(decision_output)s,
                    %(decision_type)s, %(blast_radius)s, %(expected_uplift_pct)s, %(confidence)s,
                    %(metadata)s
                )
                RETURNING decision_id
            """, {
                'decision_id': decision_data.get('decision_id'),
                'task_id': decision_data.get('task_id'),
                'created_at': datetime.now(timezone.utc),
                'status': 'PENDING',
                'signal_detection': json.dumps(sanitize_for_json(decision_data.get('signal_detection', {}))),
                'diagnosis': json.dumps(sanitize_for_json(decision_data.get('diagnosis', {}))),
                'strategy': json.dumps(sanitize_for_json(decision_data.get('strategy', {}))),
                'simulation': json.dumps(sanitize_for_json(decision_data.get('simulation', {}))),
                'governance_check': json.dumps(sanitize_for_json(decision_data.get('governance_check', {}))),
                'decision_output': json.dumps(sanitize_for_json(decision_data.get('decision_output', {}))),
                'decision_type': decision_data.get('decision_type', 'NOTIFY'),
                'blast_radius': decision_data.get('blast_radius', 'LOW'),
                'expected_uplift_pct': decision_data.get('expected_uplift_pct', 0),
                'confidence': decision_data.get('confidence', 0),
                'metadata': json.dumps({})
            })
            result = cursor.fetchone()
            return result['decision_id'] if result else None
    
    def get_decision(self, decision_id: str) -> Optional[Dict]:
        """Retrieve a decision by ID"""
        with self.get_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM decisions WHERE decision_id = %s
            """, (decision_id,))
            row = cursor.fetchone()
            if row:
                row = self._parse_json_fields(dict(row))
                return row
            return None
    
    def _parse_json_fields(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """Convert persisted JSON strings into native Python objects."""
        json_keys = [
            'signal_detection', 'diagnosis', 'strategy', 'simulation',
            'governance_check', 'decision_output', 'execution_result',
            'actual_outcome_30min'
        ]
        for key in json_keys:
            if row.get(key) and isinstance(row[key], str):
                try:
                    row[key] = json.loads(row[key])
                except json.JSONDecodeError:
                    pass
        return row
    
    def _get_distribution(self, query: str, params: tuple = None) -> Dict[str, int]:
        with self.get_cursor() as cursor:
            cursor.execute(query, params or ())
            rows = cursor.fetchall()
            return {row['key']: row['count'] for row in rows}

    def get_overview_table_summaries(self) -> Dict[str, Any]:
        """Return summary metrics for core persistence tables."""
        summaries = {}

        with self.get_cursor() as cursor:
            cursor.execute("SELECT COUNT(*) AS count FROM decisions")
            decisions_count = cursor.fetchone()['count']

            cursor.execute("SELECT status AS key, COUNT(*) AS count FROM decisions GROUP BY status")
            decisions_status = {row['key']: row['count'] for row in cursor.fetchall()}

            cursor.execute("SELECT COUNT(*) AS count FROM signal_history")
            signal_count = cursor.fetchone()['count']

            cursor.execute("SELECT severity AS key, COUNT(*) AS count FROM signal_history GROUP BY severity")
            signal_severity = {row['key']: row['count'] for row in cursor.fetchall()}

            cursor.execute("SELECT signal_type AS key, COUNT(*) AS count FROM signal_history GROUP BY signal_type")
            signal_type = {row['key']: row['count'] for row in cursor.fetchall()}

            cursor.execute("SELECT COUNT(*) AS count FROM baseline_calibration")
            baseline_count = cursor.fetchone()['count']

            cursor.execute("SELECT seasonality_factor AS key, COUNT(*) AS count FROM baseline_calibration GROUP BY seasonality_factor")
            baseline_seasonality = {row['key']: row['count'] for row in cursor.fetchall()}

            cursor.execute("SELECT version FROM baseline_calibration ORDER BY calibration_date DESC LIMIT 1")
            latest_baseline = cursor.fetchone()
            latest_baseline_version = latest_baseline['version'] if latest_baseline else None

            cursor.execute("SELECT COUNT(*) AS count FROM execution_events")
            events_count = cursor.fetchone()['count']

            cursor.execute("SELECT event_type AS key, COUNT(*) AS count FROM execution_events GROUP BY event_type")
            event_types = {row['key']: row['count'] for row in cursor.fetchall()}

            cursor.execute("SELECT COUNT(*) AS count FROM strategy_performance_log")
            performance_count = cursor.fetchone()['count']

            cursor.execute("SELECT action_type AS key, COUNT(*) AS count FROM strategy_performance_log GROUP BY action_type")
            strategy_types = {row['key']: row['count'] for row in cursor.fetchall()}

            cursor.execute("SELECT AVG(CASE WHEN success THEN 1 ELSE 0 END) AS success_rate FROM strategy_performance_log")
            success_rate_row = cursor.fetchone()
            strategy_success_rate = round(success_rate_row['success_rate'] * 100, 2) if success_rate_row and success_rate_row['success_rate'] is not None else None

            cursor.execute("SELECT COUNT(*) AS count FROM system_health")
            health_count = cursor.fetchone()['count']

            cursor.execute("SELECT health_status AS key, COUNT(*) AS count FROM system_health GROUP BY health_status")
            health_states = {row['key']: row['count'] for row in cursor.fetchall()}

        summaries['decisions'] = {
            'count': decisions_count,
            'status_counts': decisions_status,
            'summary': f"{decisions_count} decision records, latest status breakdown available.",
        }
        summaries['signal_history'] = {
            'count': signal_count,
            'severity_counts': signal_severity,
            'signal_type_counts': signal_type,
            'summary': f"{signal_count} signal history records, capturing severity and signal type distribution.",
        }
        summaries['baseline_calibration'] = {
            'count': baseline_count,
            'seasonality_counts': baseline_seasonality,
            'latest_version': latest_baseline_version,
            'summary': f"{baseline_count} baseline snapshots, latest version {latest_baseline_version or 'N/A' }.",
        }
        summaries['execution_events'] = {
            'count': events_count,
            'event_type_counts': event_types,
            'summary': f"{events_count} execution events logged for pipeline and decision lifecycle.",
        }
        summaries['strategy_performance_log'] = {
            'count': performance_count,
            'action_type_counts': strategy_types,
            'success_rate_pct': strategy_success_rate,
            'summary': f"{performance_count} strategy feedback records, success rate {strategy_success_rate if strategy_success_rate is not None else 'N/A'}%.",
        }
        summaries['system_health'] = {
            'count': health_count,
            'health_status_counts': health_states,
            'summary': f"{health_count} system health snapshots, reporting current drift and stability status.",
        }

        return summaries
    
    def list_decisions(self, status: str = None, limit: int = 50, offset: int = 0) -> List[Dict]:

        """List decisions with optional filtering"""
        with self.get_cursor() as cursor:
            if status:
                cursor.execute("""
                    SELECT * FROM decisions 
                    WHERE status = %s 
                    ORDER BY created_at DESC 
                    LIMIT %s OFFSET %s
                """, (status, limit, offset))
            else:
                cursor.execute("""
                    SELECT * FROM decisions 
                    ORDER BY created_at DESC 
                    LIMIT %s OFFSET %s
                """, (limit, offset))
            
            rows = cursor.fetchall()
            return [self._parse_json_fields(dict(row)) for row in rows]
    
    def update_decision_status(self, decision_id: str, status: str, 
                              approved_by: str = None, reason: str = None) -> bool:
        """Update decision status (APPROVED, REJECTED, EXECUTED, etc.)"""
        with self.get_cursor() as cursor:
            cursor.execute("""
                UPDATE decisions 
                SET status = %s, 
                    approved_by = %s,
                    approved_at = %s,
                    rejection_reason = %s
                WHERE decision_id = %s
                RETURNING decision_id
            """, (
                status,
                approved_by,
                datetime.now(timezone.utc) if status == 'APPROVED' else None,
                reason,
                decision_id
            ))
            result = cursor.fetchone()
            return result is not None
    
    def update_execution_result(self, decision_id: str, execution_data: Dict) -> bool:
        """Update execution result and deployment info"""
        with self.get_cursor() as cursor:
            cursor.execute("""
                UPDATE decisions 
                SET execution_result = %s,
                    deployment_id = %s,
                    execution_status = %s,
                    executed_at = %s,
                    status = %s
                WHERE decision_id = %s
                RETURNING decision_id
            """, (
                json.dumps(sanitize_for_json(execution_data)),
                execution_data.get('deployment_id'),
                execution_data.get('execution_status'),
                datetime.now(timezone.utc),
                'EXECUTED' if execution_data.get('execution_status') == 'SUCCESS' else 'FAILED',
                decision_id
            ))
            result = cursor.fetchone()
            return result is not None
    
    def update_outcome_validation(self, decision_id: str, outcome_data: Dict, 
                                  status: str = 'SUCCEEDED') -> bool:
        """Update 30-min outcome validation"""
        with self.get_cursor() as cursor:
            cursor.execute("""
                UPDATE decisions 
                SET actual_outcome_30min = %s,
                    outcome_validated_at = %s,
                    outcome_status = %s
                WHERE decision_id = %s
                RETURNING decision_id
            """, (
                json.dumps(sanitize_for_json(outcome_data)),
                datetime.now(timezone.utc),
                status,
                decision_id
            ))
            result = cursor.fetchone()
            return result is not None
    
    # ─────────────────────────────────────────────────────────────────────────
    # AUDIT LOG OPERATIONS
    # ─────────────────────────────────────────────────────────────────────────
    
    def log_audit_action(self, decision_id: str, action: str, actor: str, 
                        actor_role: str = 'SYSTEM', reason: str = None, 
                        details: Dict = None) -> int:
        """Log an action in audit trail"""
        with self.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO decision_audit_log (
                    decision_id, action, actor, actor_role, reason, action_details, timestamp
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING audit_id
            """, (
                decision_id,
                action,
                actor,
                actor_role,
                reason,
                json.dumps(sanitize_for_json(details or {})),
                datetime.now(timezone.utc)
            ))
            result = cursor.fetchone()
            return result['audit_id'] if result else None
    
    def get_audit_log(self, decision_id: str) -> List[Dict]:
        """Get full audit trail for a decision"""
        with self.get_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM decision_audit_log 
                WHERE decision_id = %s 
                ORDER BY timestamp ASC
            """, (decision_id,))
            return [dict(row) for row in cursor.fetchall()]

    def get_events_by_decision(self, decision_id: str) -> List[Dict]:
        """Get execution events and pipeline activity for a decision"""
        with self.get_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM execution_events
                WHERE decision_id = %s
                ORDER BY timestamp ASC
            """, (decision_id,))
            return [dict(row) for row in cursor.fetchall()]
    
    # ─────────────────────────────────────────────────────────────────────────
    # STRATEGY PERFORMANCE LOGGING (for learning)
    # ─────────────────────────────────────────────────────────────────────────
    
    def log_strategy_performance(self, performance_data: Dict) -> int:
        """Log strategy performance for learning"""
        with self.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO strategy_performance_log (
                    decision_id, strategy_id, action_type,
                    predicted_uplift_pct, predicted_revenue_uplift,
                    actual_revenue_uplift, prediction_accuracy_pct,
                    actual_roi, success, failure_reason,
                    deployed_at, outcome_measured_at
                ) VALUES (
                    %(decision_id)s, %(strategy_id)s, %(action_type)s,
                    %(predicted_uplift_pct)s, %(predicted_revenue_uplift)s,
                    %(actual_revenue_uplift)s, %(prediction_accuracy_pct)s,
                    %(actual_roi)s, %(success)s, %(failure_reason)s,
                    %(deployed_at)s, %(outcome_measured_at)s
                )
                RETURNING performance_id
            """, performance_data)
            result = cursor.fetchone()
            return result['performance_id'] if result else None
    
    def get_strategy_performance(self, action_type: str = None, limit: int = 100) -> List[Dict]:
        """Get historical strategy performance"""
        with self.get_cursor() as cursor:
            if action_type:
                cursor.execute("""
                    SELECT * FROM strategy_performance_log 
                    WHERE action_type = %s 
                    ORDER BY outcome_measured_at DESC 
                    LIMIT %s
                """, (action_type, limit))
            else:
                cursor.execute("""
                    SELECT * FROM strategy_performance_log 
                    ORDER BY outcome_measured_at DESC 
                    LIMIT %s
                """, (limit,))
            return [dict(row) for row in cursor.fetchall()]
    
    # ─────────────────────────────────────────────────────────────────────────
    # BASELINE CALIBRATION
    # ─────────────────────────────────────────────────────────────────────────
    
    def save_baseline_calibration(self, calibration_data: Dict) -> int:
        """Save baseline calibration snapshot"""
        with self.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO baseline_calibration (
                    calibration_date, version,
                    revenue_baseline, conversion_rate_baseline,
                    cart_abandonment_baseline, latency_ms_baseline,
                    payment_failure_baseline,
                    revenue_drop_threshold, conversion_drop_threshold,
                    abandonment_rise_threshold, latency_threshold,
                    payment_failure_threshold, seasonality_factor, notes
                ) VALUES (%(date)s, %(version)s, %(revenue_baseline)s,
                    %(conversion_baseline)s, %(abandonment_baseline)s,
                    %(latency_baseline)s, %(payment_failure_baseline)s,
                    %(revenue_threshold)s, %(conversion_threshold)s,
                    %(abandonment_threshold)s, %(latency_threshold)s,
                    %(payment_failure_threshold)s, %(seasonality)s, %(notes)s)
                RETURNING calibration_id
            """, calibration_data)
            result = cursor.fetchone()
            return result['calibration_id'] if result else None
    
    def get_latest_baseline(self) -> Optional[Dict]:
        """Get most recent baseline calibration"""
        with self.get_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM baseline_calibration 
                ORDER BY calibration_date DESC 
                LIMIT 1
            """)
            result = cursor.fetchone()
            return dict(result) if result else None
    
    # ─────────────────────────────────────────────────────────────────────────
    # EVENT LOGGING
    # ─────────────────────────────────────────────────────────────────────────
    
    def log_event(self, event_type: str, task_id: str = None, 
                 decision_id: str = None, event_data: Dict = None) -> int:
        """Log execution event"""
        with self.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO execution_events (
                    event_type, task_id, decision_id, event_data, timestamp
                ) VALUES (%s, %s, %s, %s, %s)
                RETURNING event_id
            """, (
                event_type,
                task_id,
                decision_id,
                json.dumps(sanitize_for_json(event_data or {})),
                datetime.now(timezone.utc)
            ))
            result = cursor.fetchone()
            return result['event_id'] if result else None


# Global instance
_db_manager: Optional[DatabaseManager] = None

def get_db_manager(config: DatabaseConfig = None) -> DatabaseManager:
    """Get or create global DB manager instance"""
    global _db_manager
    if _db_manager is None:
        _db_manager = DatabaseManager(config)
    return _db_manager
