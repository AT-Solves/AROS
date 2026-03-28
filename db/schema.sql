-- ════════════════════════════════════════════════════════════════════════════
-- AROS Database Schema – Full Persistence Layer
-- ════════════════════════════════════════════════════════════════════════════

-- ─ TABLE 1: DECISIONS (Core decision records) ──────────────────────────────
CREATE TABLE IF NOT EXISTS decisions (
    decision_id VARCHAR(100) PRIMARY KEY,
    task_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    
    -- Status lifecycle
    status VARCHAR(50),  -- PENDING, APPROVED, REJECTED, EXECUTED, ROLLED_BACK, FAILED
    approved_at TIMESTAMP,
    approved_by VARCHAR(100),
    rejection_reason TEXT,
    
    -- Full decision context (stored as JSON for flexibility)
    signal_detection JSONB,
    diagnosis JSONB,
    strategy JSONB,
    simulation JSONB,
    governance_check JSONB,
    decision_output JSONB,  -- Full decision agent output
    
    -- Decision metadata
    decision_type VARCHAR(50),  -- AUTO, NOTIFY, ESCALATE
    blast_radius VARCHAR(50),  -- LOW, HIGH, CRITICAL
    expected_uplift_pct FLOAT,
    expected_impact_amount BIGINT,
    confidence FLOAT,
    
    -- Execution details
    execution_result JSONB,
    deployment_id VARCHAR(100),
    execution_status VARCHAR(50),  -- SUCCESS, PENDING_APPROVAL, FAILED
    executed_at TIMESTAMP,
    
    -- Outcome validation (30 min post-execution)
    actual_outcome_30min JSONB,
    outcome_validated_at TIMESTAMP,
    outcome_status VARCHAR(50),  -- SUCCEEDED, FAILED, PARTIAL
    
    -- Audit
    notes TEXT,
    metadata JSONB
);

-- Create indices for decisions table
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON decisions(created_at);
CREATE INDEX IF NOT EXISTS idx_decisions_task_id ON decisions(task_id);
CREATE INDEX IF NOT EXISTS idx_decisions_decision_type ON decisions(decision_type);

-- ─ TABLE 2: DECISION AUDIT LOG (Immutable audit trail) ─────────────────────
CREATE TABLE IF NOT EXISTS decision_audit_log (
    audit_id SERIAL PRIMARY KEY,
    decision_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action VARCHAR(100),  -- CREATED, APPROVED, REJECTED, EXECUTED, ROLLED_BACK, OUTCOME_VALIDATED
    actor VARCHAR(100),  -- User or system agent
    actor_role VARCHAR(50),  -- HUMAN_OPERATOR, SYSTEM, ADMIN
    action_details JSONB,  -- Detailed info about action
    reason TEXT,  -- Why the action was taken
    
    FOREIGN KEY (decision_id) REFERENCES decisions(decision_id)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_decision_id ON decision_audit_log(decision_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON decision_audit_log(timestamp);

-- ─ TABLE 3: STRATEGY PERFORMANCE LOG (Learning layer) 1 ──────────────────
CREATE TABLE IF NOT EXISTS strategy_performance_log (
    performance_id SERIAL PRIMARY KEY,
    decision_id VARCHAR(100) NOT NULL,
    strategy_id VARCHAR(100),
    action_type VARCHAR(100),  -- discount, fraud_mitigation, etc.
    
    -- Predicted vs Actual
    predicted_uplift_pct FLOAT,
    predicted_revenue_uplift BIGINT,
    actual_revenue_uplift BIGINT,
    prediction_accuracy_pct FLOAT,  -- (actual - predicted) / predicted * 100
    
    -- Outcome metrics
    actual_roi FLOAT,
    success BOOLEAN,
    failure_reason TEXT,
    
    -- Execution window
    deployed_at TIMESTAMP,
    outcome_measured_at TIMESTAMP,
    
    FOREIGN KEY (decision_id) REFERENCES decisions(decision_id)
);

CREATE INDEX IF NOT EXISTS idx_strategy_perf_strategy_id ON strategy_performance_log(strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_perf_deployed_at ON strategy_performance_log(deployed_at);

-- ─ TABLE 4: BASELINE CALIBRATION (Threshold management) ───────────────────
CREATE TABLE IF NOT EXISTS baseline_calibration (
    calibration_id SERIAL PRIMARY KEY,
    calibration_date DATE,
    version INTEGER,  -- Version number for reproducibility
    
    -- Baseline metrics (rolling 90-day average)
    revenue_baseline BIGINT,
    conversion_rate_baseline FLOAT,
    cart_abandonment_baseline FLOAT,
    latency_ms_baseline FLOAT,
    payment_failure_baseline FLOAT,
    
    -- Thresholds (adaptive based on seasonality/context)
    revenue_drop_threshold FLOAT,  -- %
    conversion_drop_threshold FLOAT,  -- %
    abandonment_rise_threshold FLOAT,  -- %
    latency_threshold FLOAT,  -- ms
    payment_failure_threshold FLOAT,  -- %
    
    -- Metadata
    seasonality_factor VARCHAR(50),  -- PEAK, NORMAL, LOW
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_calibration_date ON baseline_calibration(calibration_date);
CREATE INDEX IF NOT EXISTS idx_calibration_version ON baseline_calibration(version);

-- ─ TABLE 5: SIGNAL HISTORY (Audit trail for detected signals) ─────────────
CREATE TABLE IF NOT EXISTS signal_history (
    signal_id SERIAL PRIMARY KEY,
    decision_id VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    signal_type VARCHAR(100),  -- payment_issue, performance_issue, revenue_drop, etc.
    severity VARCHAR(50),  -- LOW, MEDIUM, HIGH
    metric_name VARCHAR(100),
    current_value FLOAT,
    previous_value FLOAT,
    change_pct FLOAT,
    threshold FLOAT,
    confidence FLOAT,
    
    FOREIGN KEY (decision_id) REFERENCES decisions(decision_id)
);

CREATE INDEX IF NOT EXISTS idx_signal_timestamp ON signal_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_signal_type ON signal_history(signal_type);

-- ─ TABLE 6: EXECUTION EVENTS (Real-time event log) ───────────────────────
CREATE TABLE IF NOT EXISTS execution_events (
    event_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_type VARCHAR(100),  -- pipeline_start, pipeline_complete, decision_approved, etc.
    task_id VARCHAR(100),
    decision_id VARCHAR(100),
    event_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_events_timestamp ON execution_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_task_id ON execution_events(task_id);
CREATE INDEX IF NOT EXISTS idx_events_decision_id ON execution_events(decision_id);

-- ─ TABLE 7: SYSTEM HEALTH (Monitor system drift) ───────────────────────────
CREATE TABLE IF NOT EXISTS system_health (
    health_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Metrics
    total_decisions_24h INTEGER,
    auto_decisions_pct FLOAT,
    notify_decisions_pct FLOAT,
    escalate_decisions_pct FLOAT,
    
    -- Success rates
    execution_success_rate FLOAT,
    strategy_success_rate FLOAT,
    
    -- Anomalies
    false_positive_rate FLOAT,  -- Alerts with no real anomaly
    avg_decision_latency_ms FLOAT,
    
    health_status VARCHAR(50),  -- HEALTHY, DEGRADED, CRITICAL
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_health_timestamp ON system_health(timestamp);

-- ────────────────────────────────────────────────────────────────────────────
-- Migration tracking (for versioning)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50)  -- PENDING, COMPLETED, FAILED
);

CREATE INDEX IF NOT EXISTS idx_migrations_name ON schema_migrations(migration_name);

INSERT INTO schema_migrations (migration_name, status) 
VALUES ('001_aros_initial_schema.sql', 'COMPLETED')
ON CONFLICT DO NOTHING;
