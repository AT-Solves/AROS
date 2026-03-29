import React from "react";

const RISK = {
  low: { bg: "#e6f2ec", color: "#2f6f4f", border: "#a0d0b0" },
  medium: { bg: "#fff7e6", color: "#7a5200", border: "#f5dfa0" },
  high: { bg: "#fde8e8", color: "#9e3a2f", border: "#f5c2c2" }
};

function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function pct(value) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return "0%";
  return `${n.toFixed(1)}%`;
}

function confidencePct(value) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return "0%";
  return `${Math.round(n * 100)}%`;
}

function score(sim) {
  const uplift = Number(sim?.expected_impact?.revenue_change_pct || 0);
  const riskPenalty = { low: 1, medium: 3, high: 6 }[String(sim?.risk_level || "medium").toLowerCase()] ?? 3;
  return (uplift - riskPenalty).toFixed(1);
}

export default function SimulationPanel({ details, strategy }) {
  if (!details || Object.keys(details).length === 0) {
    return (
      <div style={{ padding: 32, color: "#94a3b8", textAlign: "center" }}>
        No simulation data available.
      </div>
    );
  }

  const simulations = details.simulations || [];
  const recommended = details.recommended_action || null;
  const strategyOptions = strategy?.strategies || [];

  const strategyActions = strategyOptions.map((s) => s.action_type);
  const simulatedActions = simulations.map((s) => s.action_type);
  const uncoveredStrategies = strategyActions.filter((action) => !simulatedActions.includes(action));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "0 2px" }}>
      {uncoveredStrategies.length > 0 && (
        <div style={{
          background: "#fde8e8",
          border: "1px solid #f5c2c2",
          borderLeft: "5px solid #c0392b",
          borderRadius: 10,
          padding: "14px 20px",
          color: "#9e3a2f",
          fontSize: 13,
          fontWeight: 600
        }}>
          Simulation coverage gap: {uncoveredStrategies.length} strategy option{uncoveredStrategies.length !== 1 ? "s" : ""} not simulated.
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .5, marginBottom: 14 }}>
          Simulation Summary
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Strategies Input</div>
            <div style={{ fontSize: 14, color: "#1e293b", fontWeight: 700 }}>{strategyOptions.length}</div>
          </div>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Scenarios Simulated</div>
            <div style={{ fontSize: 14, color: "#1e293b", fontWeight: 700 }}>{simulations.length}</div>
          </div>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Recommended Action</div>
            <div style={{ fontSize: 14, color: "#1e293b", fontWeight: 700 }}>{titleCase(recommended?.action_type || "none")}</div>
          </div>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Recommended Confidence</div>
            <div style={{ fontSize: 14, color: "#1e293b", fontWeight: 700 }}>{confidencePct(recommended?.confidence)}</div>
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .5, marginBottom: 14 }}>
          Scenario Outcomes
        </div>
        {simulations.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>No simulation scenarios available.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 12 }}>
            {simulations.map((sim, idx) => {
              const risk = String(sim.risk_level || "medium").toLowerCase();
              const riskStyle = RISK[risk] || RISK.medium;
              const isRecommended = recommended?.action_type === sim.action_type;

              return (
                <div key={`${sim.action_type}-${idx}`} style={{
                  border: `1px solid ${isRecommended ? "#cbd5e1" : "#e2e8f0"}`,
                  borderLeft: `4px solid ${isRecommended ? "#334155" : "#94a3b8"}`,
                  borderRadius: 10,
                  background: "#fff",
                  padding: "12px 14px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{titleCase(sim.action_type)}</div>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: riskStyle.bg,
                      color: riskStyle.color,
                      border: `1px solid ${riskStyle.border}`,
                      textTransform: "uppercase"
                    }}>
                      {risk}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>Revenue</div>
                      <div style={{ fontSize: 14, color: "#1e293b", fontWeight: 700 }}>{pct(sim?.expected_impact?.revenue_change_pct)}</div>
                    </div>
                    <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>Conversion</div>
                      <div style={{ fontSize: 14, color: "#1e293b", fontWeight: 700 }}>{pct(sim?.expected_impact?.conversion_change_pct)}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 9, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b" }}>
                    <span>Confidence</span>
                    <strong style={{ color: "#1e293b" }}>{confidencePct(sim.confidence)}</strong>
                  </div>
                  <div style={{ marginTop: 3, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b" }}>
                    <span>Score (uplift - risk)</span>
                    <strong style={{ color: "#1e293b" }}>{score(sim)}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .5, marginBottom: 14 }}>
          Strategy-to-Simulation Coverage
        </div>
        {strategyOptions.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: 16 }}>No strategy inputs found.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {strategyOptions.map((s) => {
              const covered = simulatedActions.includes(s.action_type);
              return (
                <div key={s.action_type} style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(220px, 1fr) 130px",
                  gap: 10,
                  alignItems: "center",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "8px 10px",
                  background: covered ? "#f8fafc" : "#fff5f5"
                }}>
                  <div style={{ fontSize: 12, color: "#1e293b", fontWeight: 600 }}>{titleCase(s.action_type)}</div>
                  <div style={{
                    justifySelf: "end",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    color: covered ? "#2f6f4f" : "#9e3a2f",
                    background: covered ? "#e6f2ec" : "#fde8e8",
                    border: `1px solid ${covered ? "#a0d0b0" : "#f5c2c2"}`
                  }}>
                    {covered ? "SIMULATED" : "NOT SIMULATED"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
