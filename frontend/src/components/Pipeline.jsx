import React from "react";

function StageBadge({ status }) {
  return <span className={`pipeline-badge pipeline-badge-${status}`}>{status || "pending"}</span>;
}

export default function Pipeline({ stages, current, statusByStage, onSelect }) {
  return (
    <section className="card pipeline-card fade-in-up" aria-label="Pipeline flow">
      <div className="section-header-row">
        <h2>Agentic Workflow</h2>
        <p>Click a stage to inspect explainability, input, and output details.</p>
      </div>

      <div className="pipeline-track" role="list">
        {stages.map((stage, index) => (
          <div className="pipeline-step-wrapper" key={stage.id} role="listitem">
            <button
              type="button"
              onClick={() => onSelect(stage.id)}
              className={`pipeline-step ${current === stage.id ? "is-current" : ""}`}
              aria-current={current === stage.id ? "step" : undefined}
            >
              <span className="pipeline-label">{stage.label}</span>
              <StageBadge status={statusByStage[stage.id]} />
            </button>

            {index < stages.length - 1 ? <span className="pipeline-arrow" aria-hidden="true">{"->"}</span> : null}
          </div>
        ))}
      </div>
    </section>
  );
}