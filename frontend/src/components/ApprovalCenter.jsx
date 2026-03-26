import React, { useState } from 'react';
import './ApprovalCenter.css';

export default function ApprovalCenter({ ws }) {
  const [decisions, setDecisions] = useState([
    {
      id: 'DEC_001',
      priority: 'HIGH',
      signal: 'Revenue Drop 18% + Payment Failure 24%',
      strategy: 'Fraud Mitigation + Performance Fix',
      expectedUplift: '+6.0%',
      budget: '$50K',
      blastRadius: 'CRITICAL',
      riskLevel: 'HIGH',
      requiredApprovals: ['SECURITY_TEAM', 'CTO'],
      timeRemaining: '28m',
      status: 'pending',
    },
    {
      id: 'DEC_002',
      priority: 'MEDIUM',
      signal: 'Cart Abandonment +15%',
      strategy: 'Marketing Campaign + 15% Discount',
      expectedUplift: '+8.5%',
      budget: '$130K',
      blastRadius: 'HIGH',
      riskLevel: 'MEDIUM',
      requiredApprovals: ['OPERATIONS_MANAGER'],
      timeRemaining: '18m',
      status: 'pending',
    },
  ]);

  const [completedDecisions] = useState([
    { id: 'DEC_003', action: 'Approved', strategy: 'Fraud Lock', executionTime: '2h 15m' },
    { id: 'DEC_004', action: 'Rejected', strategy: '35% Discount (violates policy)', executionTime: 'N/A' },
    { id: 'DEC_005', action: 'Approved', strategy: 'UI Redesign (Gradual Rollout)', executionTime: 'In progress' },
  ]);

  const handleApprove = (id) => {
    alert(`Decision ${id} approved! Executing strategy...`);
    setDecisions(decisions.filter(d => d.id !== id));
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'decision_approved',
        decision_id: id,
        timestamp: new Date().toISOString(),
      }));
    }
  };

  const handleReject = (id) => {
    alert(`Decision ${id} rejected.`);
    setDecisions(decisions.filter(d => d.id !== id));
  };

  const handleDefer = (id) => {
    alert(`Decision ${id} deferred for 1 hour.`);
  };

  return (
    <div className="approval-center">
      <div className="approval-container">
        <div className="approval-header">
          <h2>✋ APPROVAL CENTER</h2>
          <div className="approval-stats">
            <div className="stat">
              <span className="stat-num">{decisions.length}</span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat">
              <span className="stat-num">{completedDecisions.length}</span>
              <span className="stat-label">Completed (24h)</span>
            </div>
          </div>
        </div>

        {/* Pending Decisions */}
        <div className="decisions-section">
          <h3 className="section-title">📋 PENDING DECISIONS</h3>
          
          {decisions.length === 0 ? (
            <div className="no-decisions">
              <p>✅ No pending decisions - all strategies are approved or completed!</p>
            </div>
          ) : (
            <div className="decisions-queue">
              {decisions.map((decision) => (
                <div key={decision.id} className={`decision-queue-card priority-${decision.priority.toLowerCase()}`}>
                  {/* Card Header */}
                  <div className="card-header">
                    <div className="header-left">
                      <h3>{decision.strategy}</h3>
                      <p className="signal-desc">{decision.signal}</p>
                    </div>
                    <div className="header-right">
                      <span className={`priority-badge priority-${decision.priority.toLowerCase()}`}>
                        {decision.priority} PRIORITY
                      </span>
                      <span className="time-remaining">⏱️ {decision.timeRemaining}</span>
                    </div>
                  </div>

                  {/* Card Metrics */}
                  <div className="card-metrics">
                    <div className="metric">
                      <span className="metric-label">Expected Uplift:</span>
                      <span className="metric-value">{decision.expectedUplift}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Budget:</span>
                      <span className="metric-value">{decision.budget}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Blast Radius:</span>
                      <span className={`metric-value blast-${decision.blastRadius.toLowerCase()}`}>
                        {decision.blastRadius}
                      </span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Risk Level:</span>
                      <span className={`metric-value risk-${decision.riskLevel.toLowerCase()}`}>
                        {decision.riskLevel}
                      </span>
                    </div>
                  </div>

                  {/* Approvals Required */}
                  <div className="approvals-required">
                    <strong>Approvals Required:</strong>
                    <div className="approvals-list">
                      {decision.requiredApprovals.map((approval, idx) => (
                        <span key={idx} className="approval-badge">
                          {approval.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="card-actions">
                    <button
                      className="btn btn-approve"
                      onClick={() => handleApprove(decision.id)}
                    >
                      ✅ APPROVE
                    </button>
                    <button
                      className="btn btn-reject"
                      onClick={() => handleReject(decision.id)}
                    >
                      ❌ REJECT
                    </button>
                    <button
                      className="btn btn-defer"
                      onClick={() => handleDefer(decision.id)}
                    >
                      ⏸️ DEFER (1h)
                    </button>
                    <button className="btn btn-comment">
                      💬 COMMENT
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Decisions */}
        <div className="completed-section">
          <h3 className="section-title">✅ COMPLETED (Last 24h)</h3>
          <div className="completed-table">
            <div className="table-header">
              <div className="col-id">Decision ID</div>
              <div className="col-action">Action</div>
              <div className="col-strategy">Strategy</div>
              <div className="col-time">Execution Time</div>
            </div>
            {completedDecisions.map((decision) => (
              <div key={decision.id} className="table-row">
                <div className="col-id">{decision.id}</div>
                <div className={`col-action action-${decision.action.toLowerCase()}`}>
                  {decision.action === 'Approved' && '✅ Approved'}
                  {decision.action === 'Rejected' && '❌ Rejected'}
                </div>
                <div className="col-strategy">{decision.strategy}</div>
                <div className="col-time">{decision.executionTime}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="instructions-box">
          <h3>📌 QUICK GUIDE</h3>
          <ul>
            <li><strong>APPROVE:</strong> Execute strategy immediately (pending governance rules)</li>
            <li><strong>REJECT:</strong> Block strategy and escalate for review</li>
            <li><strong>DEFER:</strong> Review later (decision expires in 30 minutes if not acted on)</li>
            <li><strong>COMMENT:</strong> Add context or ask questions before decision</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
