import React from "react";

function effectivenessLabel(reflection) {
  const success = reflection?.success;
  if (success === true) {
    return "high";
  }
  if (success === false) {
    return "medium";
  }
  return "low";
}

export default function ReflectionPanel({ reflection, simulation }) {
  const expectedRevenueChange = simulation?.recommended_action?.expected_impact?.revenue_change_pct;
  const actualRevenueChange = reflection?.actual_revenue_change_pct;
  const learning = reflection?.learning || reflection?.lesson || "No learning insight captured yet.";
  const effectiveness = effectivenessLabel(reflection?.evaluation || reflection);

  return (
    <section className="card stagger-in">
      <div className="section-header-row">
        <h3>Reflection and Learning Loop</h3>
        <span className={`effectiveness-pill effectiveness-${effectiveness}`}>{effectiveness.toUpperCase()}</span>
      </div>

      <div className="reflection-grid">
        <article>
          <h4>Expected vs Actual</h4>
          <p>Expected revenue change: {expectedRevenueChange ?? "N/A"}%</p>
          <p>Actual revenue change: {actualRevenueChange ?? "N/A"}%</p>
        </article>

        <article>
          <h4>Effectiveness</h4>
          <p>{reflection?.evaluation?.status || reflection?.status || "insufficient_data"}</p>
        </article>

        <article>
          <h4>Learning Insight</h4>
          <p>{typeof learning === "string" ? learning : JSON.stringify(learning)}</p>
        </article>
      </div>
    </section>
  );
}
