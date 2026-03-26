import React, { useState } from 'react';
import './PipelineFlow.css';

export default function PipelineFlow() {
  // Mock pipeline execution state
  const mockPipeline = [
    {
      id: 1,
      agent: 'Ingestion',
      status: 'complete',
      time: '2.3s',
      output: 'Fetched 5 KPI metrics',
      details: 'Revenue, Conversion, Abandonment, Latency, Payment Failure',
    },
    {
      id: 2,
      agent: 'Signal Detection',
      status: 'complete',
      time: '0.8s',
      output: '5 signals detected',
      details: 'Revenue drop (-18%), Payment failure (24%), Latency (850ms), etc.',
    },
    {
      id: 3,
      agent: 'Diagnosis',
      status: 'complete',
      time: '1.1s',
      output: '3 root causes',
      details: 'Payment gateway issue, Fraud spike detected, Performance degradation',
    },
    {
      id: 4,
      agent: 'Strategy',
      status: 'complete',
      time: '0.5s',
      output: '3 strategies',
      details: 'Fraud mitigation (+6%), Discount campaign (+8.5%), Infrastructure fix (+5%)',
    },
    {
      id: 5,
      agent: 'Simulation',
      status: 'complete',
      time: '2.1s',
      output: '500 trials completed',
      details: 'Median revenue: $333M (+$18M), 90% CI: [$326M, $341M]',
    },
    {
      id: 6,
      agent: 'Decision',
      status: 'in-progress',
      time: '0.3s',
      output: 'Applying governance',
      details: 'Checking policy violations, fraud score >0.65 → ESCALATE',
    },
  ];

  const [expandedAgent, setExpandedAgent] = useState(null);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return '✅';
      case 'in-progress':
        return '⏳';
      case 'failed':
        return '❌';
      case 'pending':
        return '⏸️';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete':
        return '#10b981';
      case 'in-progress':
        return '#f59e0b';
      case 'failed':
        return '#ef4444';
      case 'pending':
        return '#6b7280';
      default:
        return '#ccc';
    }
  };

  return (
    <div className="pipeline-flow">
      <div className="pipeline-container">
        <h2 className="pipeline-title">⚙️ AROS PIPELINE EXECUTION</h2>

        <div className="pipeline-swimlane">
          {mockPipeline.map((stage, idx) => (
            <div key={stage.id} className="pipeline-stage">
              {/* Stage Box */}
              <div
                className={`stage-box status-${stage.status}`}
                onClick={() => setExpandedAgent(expandedAgent === stage.id ? null : stage.id)}
                style={{ borderLeftColor: getStatusColor(stage.status) }}
              >
                <div className="stage-header">
                  <span className="status-icon">{getStatusIcon(stage.status)}</span>
                  <h3 className="stage-name">{stage.agent}</h3>
                  <span className="stage-time">{stage.time}</span>
                </div>

                <div className="stage-output">{stage.output}</div>

                {expandedAgent === stage.id && (
                  <div className="stage-details">
                    <p>{stage.details}</p>
                  </div>
                )}

                <button className="expand-btn">
                  {expandedAgent === stage.id ? '▼' : '▶'}
                </button>
              </div>

              {/* Arrow to next stage */}
              {idx < mockPipeline.length - 1 && (
                <div className="pipeline-arrow">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polyline points="10,50 90,50" />
                    <polygon points="90,50 85,45 85,55" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="pipeline-legend">
          <div className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: '#10b981' }}
            ></span>
            Complete
          </div>
          <div className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: '#f59e0b' }}
            ></span>
            In Progress
          </div>
          <div className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: '#ef4444' }}
            ></span>
            Failed
          </div>
          <div className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: '#6b7280' }}
            ></span>
            Pending
          </div>
        </div>

        {/* Summary */}
        <div className="pipeline-summary">
          <h3>📝 EXECUTION SUMMARY</h3>
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-label">Total Duration:</span>
              <span className="stat-value">7.1s</span>
            </div>
            <div className="stat">
              <span className="stat-label">Agents Completed:</span>
              <span className="stat-value">5/6</span>
            </div>
            <div className="stat">
              <span className="stat-label">Current Stage:</span>
              <span className="stat-value">Decision</span>
            </div>
            <div className="stat">
              <span className="stat-label">Status:</span>
              <span className="stat-value">🟡 In Progress</span>
            </div>
          </div>
        </div>

        {/* Decision Preview */}
        <div className="decision-preview">
          <h3>🎯 PRELIMINARY DECISION</h3>
          <div className="decision-content">
            <div className="decision-item">
              <span className="decision-label">Type:</span>
              <span className="decision-value">ESCALATE</span>
            </div>
            <div className="decision-item">
              <span className="decision-label">Reason:</span>
              <span className="decision-value">Fraud score 0.78 > 0.65 threshold</span>
            </div>
            <div className="decision-item">
              <span className="decision-label">Blast Radius:</span>
              <span className="decision-value decision-critical">CRITICAL</span>
            </div>
            <div className="decision-item">
              <span className="decision-label">Expected Uplift:</span>
              <span className="decision-value">+5.8% revenue (+$18M)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
