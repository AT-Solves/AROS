import React, { useState } from 'react';
import './DecisionExplorer.css';

export default function DecisionExplorer({ decision }) {
  const [expandedSection, setExpandedSection] = useState('signal');

  // Mock full decision context data
  const mockDecision = {
    signal: {
      alert: true,
      severity: 'HIGH',
      confidence: 0.92,
      signals: [
        { type: 'revenue_drop', change: '-18.23%', value: '$315M', baseline: '$385M' },
        { type: 'conversion_drop', change: '-22.31%', value: '6.2%', baseline: '7.98%' },
        { type: 'payment_issue', value: '24%', baseline: '10%' },
        { type: 'performance_issue', value: '850ms', baseline: '400ms' },
        { type: 'behavioral_shift', change: '+15.53%', value: '86.45%', baseline: '74.83%' },
      ],
      reasoning: 'Revenue change: -18.23% | Conversion change: -22.31% | Payment failure rate: 24%',
    },
    diagnosis: {
      causes: [
        {
          cause: 'Revenue Impact from Primary Issues',
          confidence: 0.80,
          evidence: [
            'Revenue dropped: -18.23%',
            'Likely consequence of payment failures, latency, or abandonment',
            'Indicates customer friction upstream',
          ],
        },
        {
          cause: 'Payment Gateway Outage or Fraud Detection Triggered',
          confidence: 0.85,
          evidence: [
            'Payment failure rate: 24%',
            'Baseline typically 5-10%',
            'Spike indicates systemic issue or fraud block',
          ],
        },
        {
          cause: 'Severe Performance Degradation (High Latency)',
          confidence: 0.90,
          evidence: [
            'Average latency: 850ms',
            'Baseline: 400-500ms',
            'Users experiencing slow checkout = higher abandonment',
          ],
        },
      ],
      fraudScore: 0.78,
    },
    strategy: {
      strategies: [
        {
          name: 'Fraud Mitigation',
          uplift: '+6.0%',
          budget: '$0',
          risk: 'LOW',
          roi: '∞',
        },
        {
          name: 'Infrastructure Optimization',
          uplift: '+5.2%',
          budget: '$50K',
          risk: 'LOW',
          roi: '4.1x',
        },
        {
          name: '25% Discount Campaign',
          uplift: '+8.5%',
          budget: '$100K',
          risk: 'MEDIUM',
          roi: '3.2x',
        },
      ],
      selected: 'Fraud Mitigation',
    },
    simulation: {
      baselineRevenue: '$315,000,000',
      medianProjected: '$333,361,994',
      uplift: '+$18,361,994',
      confidence: 0.88,
      p10: '$326,472,504',
      p90: '$341,117,633',
      trials: 500,
    },
    decision: {
      type: 'ESCALATE',
      decisionId: 'DEC_1774551001_6163',
      reason: 'Fraud score 0.78 exceeds 0.65 threshold; CRITICAL blast radius',
      blastRadius: 'CRITICAL',
      violations: [
        'Fraud score 0.78 exceeds 0.65 (CRITICAL)',
      ],
    },
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="decision-explorer">
      <div className="explorer-container">
        <h2 className="explorer-title">🔍 DECISION EXPLORER</h2>
        <p className="explorer-subtitle">Full end-to-end analysis: Signal → Diagnosis → Strategy → Simulation → Decision</p>

        {/* Signal Section */}
        <div className="explorer-section">
          <button
            className="section-header"
            onClick={() => toggleSection('signal')}
          >
            <span className="section-icon">📊</span>
            <h3>SIGNAL: Revenue Anomalies Detected</h3>
            <span className={`section-status severity-${mockDecision.signal.severity.toLowerCase()}`}>
              {mockDecision.signal.severity} - {mockDecision.signal.signals.length} signals
            </span>
            <span className="expand-icon">{expandedSection === 'signal' ? '▼' : '▶'}</span>
          </button>

          {expandedSection === 'signal' && (
            <div className="section-content">
              <div className="metrics-display">
                <div className="metric-row">
                  <span className="metric-label">Confidence:</span>
                  <span className="metric-value">{(mockDecision.signal.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>

              <div className="signals-list">
                <h4>Detected Signals:</h4>
                {mockDecision.signal.signals.map((sig, idx) => (
                  <div key={idx} className="signal-item">
                    <span className="signal-type">{sig.type.replace(/_/g, ' ')}</span>
                    <span className="signal-value">{sig.value}</span>
                    {sig.change && <span className="signal-change">({sig.change})</span>}
                  </div>
                ))}
              </div>

              <div className="reasoning">
                <strong>Reasoning:</strong> {mockDecision.signal.reasoning}
              </div>
            </div>
          )}
        </div>

        {/* Diagnosis Section */}
        <div className="explorer-section">
          <button
            className="section-header"
            onClick={() => toggleSection('diagnosis')}
          >
            <span className="section-icon">🔍</span>
            <h3>DIAGNOSIS: Root Cause Analysis</h3>
            <span className="section-status">{mockDecision.diagnosis.causes.length} causes identified</span>
            <span className="expand-icon">{expandedSection === 'diagnosis' ? '▼' : '▶'}</span>
          </button>

          {expandedSection === 'diagnosis' && (
            <div className="section-content">
              {mockDecision.diagnosis.fraudScore > 0.65 && (
                <div className="alert alert-danger">
                  ⚠️ FRAUD ALERT: Score {mockDecision.diagnosis.fraudScore.toFixed(2)} (>0.65 threshold)
                </div>
              )}

              <div className="causes-list">
                {mockDecision.diagnosis.causes.map((cause, idx) => (
                  <div key={idx} className="cause-item">
                    <div className="cause-header">
                      <h4>{cause.cause}</h4>
                      <span className="confidence-badge">{(cause.confidence * 100).toFixed(0)}% confident</span>
                    </div>
                    <div className="cause-evidence">
                      <strong>Evidence:</strong>
                      <ul>
                        {cause.evidence.map((e, eidx) => (
                          <li key={eidx}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Strategy Section */}
        <div className="explorer-section">
          <button
            className="section-header"
            onClick={() => toggleSection('strategy')}
          >
            <span className="section-icon">💡</span>
            <h3>STRATEGY: Recommended Actions</h3>
            <span className="section-status">{mockDecision.strategy.strategies.length} options evaluated</span>
            <span className="expand-icon">{expandedSection === 'strategy' ? '▼' : '▶'}</span>
          </button>

          {expandedSection === 'strategy' && (
            <div className="section-content">
              <div className="strategies-grid">
                {mockDecision.strategy.strategies.map((strat, idx) => (
                  <div key={idx} className={`strategy-card ${strat.name === mockDecision.strategy.selected ? 'selected' : ''}`}>
                    <h4>{strat.name}</h4>
                    <div className="strategy-metric">
                      <span className="label">Expected Uplift:</span>
                      <span className="value">{strat.uplift}</span>
                    </div>
                    <div className="strategy-metric">
                      <span className="label">Budget:</span>
                      <span className="value">{strat.budget}</span>
                    </div>
                    <div className="strategy-metric">
                      <span className="label">Risk:</span>
                      <span className={`value risk-${strat.risk.toLowerCase()}`}>{strat.risk}</span>
                    </div>
                    <div className="strategy-metric">
                      <span className="label">ROI:</span>
                      <span className="value">{strat.roi}</span>
                    </div>
                    {strat.name === mockDecision.strategy.selected && (
                      <div className="selected-badge">✓ SELECTED</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Simulation Section */}
        <div className="explorer-section">
          <button
            className="section-header"
            onClick={() => toggleSection('simulation')}
          >
            <span className="section-icon">📈</span>
            <h3>SIMULATION: Impact Prediction (500 trials)</h3>
            <span className="section-status">{mockDecision.simulation.confidence * 100 | 0}% confidence</span>
            <span className="expand-icon">{expandedSection === 'simulation' ? '▼' : '▶'}</span>
          </button>

          {expandedSection === 'simulation' && (
            <div className="section-content">
              <div className="simulation-results">
                <div className="sim-metric">
                  <span className="sim-label">Baseline Revenue:</span>
                  <span className="sim-value">{mockDecision.simulation.baselineRevenue}</span>
                </div>
                <div className="sim-metric">
                  <span className="sim-label">Median Projected:</span>
                  <span className="sim-value">{mockDecision.simulation.medianProjected}</span>
                </div>
                <div className="sim-metric">
                  <span className="sim-label">Expected Uplift:</span>
                  <span className="sim-value sim-uplift">{mockDecision.simulation.uplift}</span>
                </div>
                <div className="sim-metric">
                  <span className="sim-label">Confidence:</span>
                  <span className="sim-value">{(mockDecision.simulation.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>

              <div className="confidence-interval">
                <strong>90% Confidence Interval:</strong>
                <div className="interval-range">
                  <span>{mockDecision.simulation.p10}</span>
                  <div className="interval-bar"></div>
                  <span>{mockDecision.simulation.p90}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Decision Section */}
        <div className="explorer-section">
          <button
            className="section-header"
            onClick={() => toggleSection('decision')}
          >
            <span className="section-icon">✋</span>
            <h3>DECISION: Governance Review & Action</h3>
            <span className={`section-status severity-${mockDecision.decision.type.toLowerCase()}`}>
              {mockDecision.decision.type}
            </span>
            <span className="expand-icon">{expandedSection === 'decision' ? '▼' : '▶'}</span>
          </button>

          {expandedSection === 'decision' && (
            <div className="section-content">
              <div className={`decision-box decision-${mockDecision.decision.type.toLowerCase()}`}>
                <div className="decision-row">
                  <span className="decision-label">Decision ID:</span>
                  <span className="decision-value">{mockDecision.decision.decisionId}</span>
                </div>
                <div className="decision-row">
                  <span className="decision-label">Blast Radius:</span>
                  <span className={`decision-value blast-${mockDecision.decision.blastRadius.toLowerCase()}`}>
                    {mockDecision.decision.blastRadius}
                  </span>
                </div>
                <div className="decision-row">
                  <span className="decision-label">Reason:</span>
                  <span className="decision-value">{mockDecision.decision.reason}</span>
                </div>
              </div>

              {mockDecision.decision.violations.length > 0 && (
                <div className="violations">
                  <strong>Policy Violations:</strong>
                  <ul>
                    {mockDecision.decision.violations.map((v, idx) => (
                      <li key={idx}>{v}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="decision-actions">
                <button className="btn btn-success">✅ APPROVE</button>
                <button className="btn btn-danger">❌ REJECT</button>
                <button className="btn btn-secondary">💬 COMMENT</button>
              </div>
            </div>
          )}
        </div>

        {/* Audit Log */}
        <div className="audit-log">
          <h3>📋 AUDIT LOG</h3>
          <div className="log-entries">
            <div className="log-entry">
              <span className="log-time">12:35:01</span>
              <span className="log-agent">Signal Detection:</span>
              <span className="log-msg">alert=true, 5 signals detected, severity=HIGH</span>
            </div>
            <div className="log-entry">
              <span className="log-time">12:35:02</span>
              <span className="log-agent">Diagnosis:</span>
              <span className="log-msg">3 root causes identified, fraud_score=0.78</span>
            </div>
            <div className="log-entry">
              <span className="log-time">12:35:03</span>
              <span className="log-agent">Strategy:</span>
              <span className="log-msg">3 strategies generated, fraud_mitigation selected</span>
            </div>
            <div className="log-entry">
              <span className="log-time">12:35:05</span>
              <span className="log-agent">Simulation:</span>
              <span className="log-msg">500 trials completed, +$18M median uplift</span>
            </div>
            <div className="log-entry">
              <span className="log-time">12:35:07</span>
              <span className="log-agent">Decision:</span>
              <span className="log-msg">ESCALATE (fraud>0.65), blast_radius=CRITICAL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
