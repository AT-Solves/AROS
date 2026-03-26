import React, { useState, useEffect } from 'react';
import './MonitoringDashboard.css';

export default function MonitoringDashboard({ onSelectAlert }) {
  // Mock data - represents active anomalies
  const mockAlerts = [
    {
      id: 'ALERT_001',
      type: 'revenue_drop',
      severity: 'HIGH',
      title: '🔴 REVENUE DROP',
      description: 'Revenue down 18% vs baseline',
      timeAgo: '24m',
      metrics: { metric: 'revenue', value: '-$70M', pct: '-18%' },
    },
    {
      id: 'ALERT_002',
      type: 'payment_issue',
      severity: 'HIGH',
      title: '🔴 PAYMENT FAILURE',
      description: 'Payment failure rate 24% (baseline 10%)',
      timeAgo: '12m',
      metrics: { metric: 'payment_failure_rate', value: '24%', pct: '+140%' },
    },
    {
      id: 'ALERT_003',
      type: 'performance',
      severity: 'MEDIUM',
      title: '🟠 LATENCY SPIKE',
      description: 'Average latency 850ms (baseline 400ms)',
      timeAgo: '8m',
      metrics: { metric: 'latency_ms', value: '850ms', pct: '+112%' },
    },
  ];

  const mockPendingApprovals = [
    {
      id: 'DEC_001',
      strategy: 'Fraud Mitigation',
      status: 'HIGH PRIORITY',
      expectedUplift: '+6.0%',
      timeRemaining: '28m',
    },
    {
      id: 'DEC_002',
      strategy: '25% Discount Campaign',
      status: 'AWAITING REVIEW',
      expectedUplift: '+8.5%',
      timeRemaining: '18m',
    },
  ];

  const mockMetrics = [
    { label: 'Revenue', value: '$315M', change: '↓ 18%', color: 'danger' },
    { label: 'Conversion', value: '6.2%', change: '↓ 22%', color: 'danger' },
    { label: 'Latency', value: '850ms', change: '↑ 112%', color: 'danger' },
  ];

  return (
    <div className="monitoring">
      <div className="monitoring-container">
        <div className="section">
          <h2 className="section-title">📍 ACTIVE ALERTS</h2>
          <div className="alerts-grid">
            {mockAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert-card severity-${alert.severity.toLowerCase()}`}
                onClick={() => onSelectAlert(alert)}
                style={{ cursor: 'pointer' }}
              >
                <div className="alert-card-header">
                  <h3>{alert.title}</h3>
                  <span className={`badge badge-${alert.severity.toLowerCase()}`}>
                    {alert.severity}
                  </span>
                </div>
                <p className="alert-card-desc">{alert.description}</p>
                <div className="alert-card-metric">
                  <span className="metric-value">{alert.metrics.value}</span>
                  <span className="metric-change">{alert.metrics.pct}</span>
                </div>
                <p className="alert-card-time">{alert.timeAgo} ago</p>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">✋ PENDING APPROVALS</h2>
          <div className="approvals-grid">
            {mockPendingApprovals.map((approval) => (
              <div key={approval.id} className="approval-card">
                <div className="approval-card-header">
                  <h3>{approval.strategy}</h3>
                  <span className="status-badge">{approval.status}</span>
                </div>
                <div className="approval-details">
                  <p>
                    <strong>Expected Uplift:</strong> {approval.expectedUplift}
                  </p>
                  <p>
                    <strong>Time Remaining:</strong> {approval.timeRemaining}
                  </p>
                </div>
                <button
                  className="btn btn-primary btn-small"
                  onClick={() =>
                    window.alert('Navigate to Approval Center to approve this decision')
                  }
                >
                  Review →
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">📊 KEY METRICS (Last 1h)</h2>
          <div className="metrics-grid">
            {mockMetrics.map((metric, idx) => (
              <div key={idx} className="metric-card">
                <h4>{metric.label}</h4>
                <div className="metric-value-large">{metric.value}</div>
                <div className={`metric-change-${metric.color}`}>{metric.change}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">💡 QUICK ACTIONS</h2>
          <div className="actions-grid">
            <button className="action-btn">
              🔄 Refresh Data
            </button>
            <button className="action-btn">
              ▶️ Start Pipeline
            </button>
            <button className="action-btn">
              📈 View Analytics
            </button>
            <button className="action-btn">
              ⚙️ Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
