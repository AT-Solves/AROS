import React from "react";

function confidencePercent(value) {
  const normalized = Number(value || 0);
  return `${Math.round(normalized * 100)}%`;
}

export default function DecisionCard({ decision, onAction }) {
  const decisionType = String(decision?.decision || "NO_ACTION").toUpperCase();
  const riskLevel = String(decision?.risk_level || "unknown").toUpperCase();
  const violations = decision?.violations || [];
  const approvals = decision?.requires_human_approval || [];

  return (
    <section className="card decision-card stagger-in">
      <div className="decision-header">
        <h3>Decision Control</h3>
        <span className={`decision-pill decision-${decisionType.toLowerCase()}`}>{decisionType}</span>
      </div>

      <div className="decision-metrics">
        <div>
          <span className="label">Confidence</span>
          <strong>{confidencePercent(decision?.confidence)}</strong>
        </div>
        <div>
          <span className="label">Risk Level</span>
          <strong>{riskLevel}</strong>
        </div>
        <div>
          <span className="label">Policy Validation</span>
          <strong>{violations.length === 0 ? "Compliant" : "Review Required"}</strong>
        </div>
      </div>

      <div className="decision-reasoning">
        <h4>Reasoning</h4>
        <p>{decision?.reason || "No decision rationale available."}</p>
      </div>

      <div className="policy-grid">
        <article>
          <h5>Violations</h5>
          <p>{violations.length === 0 ? "No policy violations found." : `${violations.length} violation(s)`}</p>
        </article>
        <article>
          <h5>Required Approvals</h5>
          <p>{approvals.length === 0 ? "None" : approvals.join(", ")}</p>
        </article>
      </div>

      <div className="decision-actions">
        <button type="button" className="action-btn approve" onClick={() => onAction("approve")}>Approve</button>
        <button type="button" className="action-btn reject" onClick={() => onAction("reject")}>Reject</button>
        <button type="button" className="action-btn defer" onClick={() => onAction("defer")}>Defer</button>
      </div>
    </section>
  );
}