import React from "react";

function StatusDot({ status }) {
  return <span className={`status-dot status-${status}`} aria-hidden="true" />;
}

export default function Sidebar({
  selected,
  setSelected,
  stages,
  statusByStage,
  totalDecisions,
  latestDecisionId
}) {
  return (
    <div className="sidebar-content fade-in-up">
      <div className="brand-block">
        <p className="eyebrow">AROS CONTROL</p>
        <h1>Autonomous Revenue Optimization System</h1>
      </div>

      <div className="sidebar-metrics">
        <div className="metric-pill">
          <span>Total Decisions</span>
          <strong>{totalDecisions}</strong>
        </div>
        <div className="metric-pill">
          <span>Latest Decision ID</span>
          <strong>{latestDecisionId || "N/A"}</strong>
        </div>
      </div>

      <nav className="stage-nav" aria-label="Pipeline navigation">
        {stages.map((stage) => (
          <button
            key={stage.id}
            type="button"
            className={`stage-nav-item ${selected === stage.id ? "active" : ""}`}
            onClick={() => setSelected(stage.id)}
          >
            <span>{stage.label}</span>
            <span className="stage-state-inline">
              <StatusDot status={statusByStage[stage.id]} />
              {String(statusByStage[stage.id] || "pending").replace("_", " ")}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}