import React from "react";

const RISK = {
  low: { bg: "#e6f2ec", color: "#2f6f4f", border: "#a0d0b0" },
  medium: { bg: "#fff7e6", color: "#7a5200", border: "#f5dfa0" },
  high: { bg: "#fde8e8", color: "#9e3a2f", border: "#f5c2c2" }
};

function toPct(value) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return "0%";
  return `${Math.round(n * 100)}%`;
}

function titleCase(value) {
  return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizePrimary(details) {
  const p = details?.primary_strategy;
  if (!p) return "none";
  if (typeof p === "string") return p;
  if (typeof p === "object") return p.action_type || "none";
  return "none";
}

function buildCoverageRows(diagnosisCauses, strategies) {
  const rows = [];
  const allCovers = new Set();

  strategies.forEach((s) => {
    (s.covers || []).forEach((c) => allCovers.add(c));
  });

  diagnosisCauses.forEach((cause) => {
    const name = cause?.cause || "unknown";
    const coveredBy = strategies
      .filter((s) => (s.covers || []).includes(name))
      .map((s) => s.action_type);

    rows.push({
      cause: name,
      severity: cause?.severity || "MEDIUM",
      covered: coveredBy.length > 0,
      coveredBy
    });
  });

  return { rows, uniqueCovered: allCovers.size };
}

export default function StrategyPanel({ details, diagnosis }) {
  if (!details || Object.keys(details).length === 0) {
    return (
      <div style={{ padding: 32, color: "#94a3b8", textAlign: "center" }}>
        No strategy data available.
      </div>
    );
  }

  const strategies = details.strategies || [];
  const primaryStrategy = normalizePrimary(details);
  const diagnosisCauses = diagnosis?.diagnosed_causes || [];

  const causesAnalyzed = details?.log?.causes_analyzed ?? diagnosisCauses.length;
  const coverageMode = details?.log?.coverage_mode || "not_set";
  const reasoning = details?.reasoning || "";

  const { rows, uniqueCovered } = buildCoverageRows(diagnosisCauses, strategies);
  const uncoveredCount = rows.filter((r) => !r.covered).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "0 2px" }}>
      {uncoveredCount > 0 && (
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
          Coverage gap detected: {uncoveredCount} diagnosis cause{uncoveredCount !== 1 ? "s" : ""} not mapped to a strategy.
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .5, marginBottom: 14 }}>
          Strategy Summary
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Primary Strategy</div>
            <div style={{ fontSize: 14, color: "#1e293b", fontWeight: 700 }}>{titleCase(primaryStrategy)}</div>
          </div>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Options Generated</div>
            <div style={{ fontSize: 14, color: "#1e293b", fontWeight: 700 }}>{strategies.length}</div>
          </div>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Causes Analyzed</div>
            <div style={{ fontSize: 14, color: "#1e293b", fontWeight: 700 }}>{causesAnalyzed}</div>
          </div>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Coverage Mode</div>
            <div style={{ fontSize: 14, color: "#1e293b", fontWeight: 700 }}>{titleCase(coverageMode)}</div>
          </div>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Unique Causes Covered</div>
            <div style={{ fontSize: 14, color: "#1e293b", fontWeight: 700 }}>{uniqueCovered}</div>
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .5, marginBottom: 14 }}>
          Strategy Options
        </div>

        {strategies.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>No strategy options generated.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {strategies.map((strategy, idx) => {
              const risk = String(strategy.risk_level || "medium").toLowerCase();
              const riskStyle = RISK[risk] || RISK.medium;
              const isPrimary = strategy.action_type === primaryStrategy;

              return (
                <div key={`${strategy.action_type}-${idx}`} style={{
                  border: `1px solid ${isPrimary ? "#cbd5e1" : "#e2e8f0"}`,
                  borderLeft: `4px solid ${isPrimary ? "#334155" : "#94a3b8"}`,
                  borderRadius: 10,
                  background: "#fff",
                  padding: "12px 14px",
                  boxShadow: "0 1px 4px rgba(0,0,0,.04)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{titleCase(strategy.action_type)}</div>
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

                  <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{strategy.description || "No description"}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>{strategy.expected_impact || "No expected impact"}</div>

                  <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b" }}>
                    <span>Confidence</span>
                    <strong style={{ color: "#1e293b" }}>{toPct(strategy.confidence)}</strong>
                  </div>

                  {(strategy.covers || []).length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", marginBottom: 5 }}>Covers</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {strategy.covers.map((item) => (
                          <span key={item} style={{
                            fontSize: 10,
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            color: "#475569",
                            borderRadius: 999,
                            padding: "2px 8px"
                          }}>
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .5, marginBottom: 14 }}>
            Diagnosis-To-Strategy Coverage
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map((row) => (
              <div key={row.cause} style={{
                display: "grid",
                gridTemplateColumns: "minmax(220px, 1fr) minmax(160px, 1fr) 120px",
                gap: 10,
                alignItems: "center",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "8px 10px",
                background: row.covered ? "#f8fafc" : "#fff5f5"
              }}>
                <div style={{ fontSize: 12, color: "#1e293b", fontWeight: 600 }}>{row.cause}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  {row.coveredBy.length > 0 ? row.coveredBy.map(titleCase).join(", ") : "No strategy mapped"}
                </div>
                <div style={{
                  justifySelf: "end",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 999,
                  color: row.covered ? "#2f6f4f" : "#9e3a2f",
                  background: row.covered ? "#e6f2ec" : "#fde8e8",
                  border: `1px solid ${row.covered ? "#a0d0b0" : "#f5c2c2"}`
                }}>
                  {row.covered ? "COVERED" : "UNMAPPED"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reasoning && (
        <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>
            Agent Reasoning
          </div>
          <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, margin: 0 }}>{reasoning}</p>
        </div>
      )}
    </div>
  );
}
