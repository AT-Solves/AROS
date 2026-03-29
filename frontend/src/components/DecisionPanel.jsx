import React from "react";

// ── Theme tokens (matches theme.css light palette) ─────────────────────────
const T = {
  card:        "#ffffff",
  cardAlt:     "#f4f7f1",
  border:      "#d7e2d8",
  shadow:      "0 4px 18px rgba(31, 56, 43, 0.07)",
  primary:     "#2f6f4f",
  primarySoft: "#e6f2ec",
  textMain:    "#1a2f23",
  textMuted:   "#5c6d62",
  textFaint:   "#8da898",
};

const SEV = { CRITICAL: "#dc2626", HIGH: "#ea580c", MEDIUM: "#ca8a04", LOW: "#16a34a" };
const BLAST = { CRITICAL: "#dc2626", HIGH: "#ea580c", MEDIUM: "#ca8a04", LOW: "#16a34a", critical: "#dc2626", high: "#ea580c", medium: "#ca8a04", low: "#16a34a" };

function pct(val) { return `${Math.round(Number(val || 0) * 100)}%`; }

// ── Reusable atoms ──────────────────────────────────────────────────────────

function Section({ title, accent, children, style = {} }) {
  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, overflow: "hidden", ...style }}>
      {title && (
        <div style={{ padding: "14px 22px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, background: accent ? accent + "0d" : T.cardAlt }}>
          {accent && <span style={{ width: 4, height: 18, borderRadius: 3, background: accent, flexShrink: 0 }} />}
          <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: T.textMain, letterSpacing: "0.01em" }}>{title}</h3>
        </div>
      )}
      <div style={{ padding: "18px 22px" }}>{children}</div>
    </div>
  );
}

function MetricTile({ label, value, sub, accent, highlight }) {
  const strLen = String(value ?? "").length;
  const valueFontSize = strLen > 9 ? "0.9rem" : strLen > 6 ? "1.1rem" : "1.35rem";
  return (
    <div style={{ background: highlight ? accent + "0f" : T.cardAlt, borderRadius: 10, padding: "12px 14px", border: `1px solid ${highlight ? accent + "55" : T.border}`, minWidth: 0 }}>
      <div style={{ fontSize: "0.63rem", color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ fontSize: valueFontSize, fontWeight: 700, color: accent || T.textMain, lineHeight: 1.2, wordBreak: "break-word" }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize: "0.63rem", color: T.textFaint, marginTop: 3, whiteSpace: "nowrap" }}>{sub}</div>}
    </div>
  );
}

function Pill({ label, color, bg, border }) {
  return (
    <span style={{ display: "inline-block", padding: "3px 14px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700, background: bg || color + "18", color, border: `1.5px solid ${border || color + "55"}`, letterSpacing: "0.04em" }}>
      {label}
    </span>
  );
}

function DecisionHeroBadge({ decision }) {
  const d = String(decision || "INVESTIGATE").toUpperCase();
  const color = d === "EXECUTE" ? "#16a34a" : d === "INVESTIGATE" ? "#ea580c" : "#5c6d62";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 22px", borderRadius: 24, fontWeight: 700, fontSize: "1rem", background: color + "14", color, border: `2px solid ${color + "55"}`, letterSpacing: "0.05em" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {d}
    </span>
  );
}

function buildCoverageRows(simulations, selectedAction) {
  return (simulations || []).map((action) => ({
    action,
    isSelected: action === selectedAction,
  }));
}

// ── Main component ──────────────────────────────────────────────────────────

export default function DecisionPanel({ details, simulation }) {
  const d = details || {};
  const decision       = String(d.decision || "INVESTIGATE").toUpperCase();
  const policyDecision = String(d.policy_decision || "NOTIFY").toUpperCase();
  const blastRadius    = String(d.blast_radius || "LOW").toUpperCase();
  const violations     = d.violations || [];
  const approvals      = d.requires_human_approval || [];
  const channels       = d.channels || [];
  const simulationsEval = d.simulations_evaluated || (simulation?.simulations || []).map((s) => s.action_type).filter(Boolean);
  const strategiesInput = d.strategies_evaluated || [];
  const selectedAction  = d.selected_action || "";
  const log             = d.log || {};

  const hasCritical  = violations.some((v) => (v.severity || "").toUpperCase() === "CRITICAL");
  const isCompliant  = violations.length === 0;
  const coverageRows = buildCoverageRows(simulationsEval, selectedAction);
  const blastColor   = BLAST[blastRadius] || T.textMuted;
  const policyColor  = policyDecision === "AUTO" ? "#16a34a" : policyDecision === "ESCALATE" ? "#dc2626" : "#ea580c";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* ── Hero Header ─────────────────────────────────────────────────── */}
      <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: "24px 26px" }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: "0.68rem", color: T.primary, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 4 }}>Decision Agent</div>
            <h2 style={{ margin: 0, fontSize: "1.5rem", color: T.textMain, fontFamily: "Fraunces, serif" }}>Governance &amp; Policy Decision</h2>
            <p style={{ margin: "5px 0 0", color: T.textMuted, fontSize: "0.85rem" }}>
              Applies policy rules to the recommended simulation action and issues a final execution decision.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Pill label={policyDecision} color={policyColor} />
            <DecisionHeroBadge decision={decision} />
          </div>
        </div>

        {/* Critical violation banner */}
        {hasCritical && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 16px", color: "#dc2626", fontSize: "0.85rem", fontWeight: 600, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
            <span>⚠</span> Critical policy violation detected — human approval required before execution.
          </div>
        )}

        {/* Compliance ribbon */}
        {isCompliant && (
          <div style={{ background: T.primarySoft, border: `1px solid ${T.primary}44`, borderRadius: 8, padding: "10px 16px", color: T.primary, fontSize: "0.85rem", fontWeight: 600, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
            <span>✓</span> All policy rules passed — strategy is fully compliant.
          </div>
        )}

        {/* Summary metric grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          <MetricTile label="Final Decision"      value={decision}               accent={decision === "EXECUTE" ? "#16a34a" : "#ea580c"} highlight />
          <MetricTile label="Blast Radius"        value={blastRadius}            accent={blastColor} highlight={blastRadius !== "LOW"} />
          <MetricTile label="Policy Check"        value={policyDecision}         accent={policyColor} />
          <MetricTile label="Violations"          value={violations.length}      accent={violations.length > 0 ? "#dc2626" : "#16a34a"} sub={violations.length === 0 ? "Compliant" : "Review required"} highlight={violations.length > 0} />
          <MetricTile label="Approvals Needed"    value={approvals.length}       accent={approvals.length > 0 ? "#ea580c" : "#16a34a"} />
          <MetricTile label="Confidence"          value={pct(d.confidence)} />
          <MetricTile label="Strategies Input"    value={strategiesInput.length} sub="from strategy agent" />
          <MetricTile label="Scenarios Evaluated" value={simulationsEval.length} sub="from simulation agent" />
        </div>
      </div>

      {/* ── Selected Action ─────────────────────────────────────────────── */}
      <Section title="Selected Action from Simulation" accent={T.primary}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>

          {/* Highlighted action tile */}
          <div style={{ flex: "1 1 180px", background: T.primarySoft, border: `1.5px solid ${T.primary}55`, borderRadius: 10, padding: "14px 20px" }}>
            <div style={{ fontSize: "0.68rem", color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Recommended Action</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: T.primary }}>{selectedAction || "—"}</div>
          </div>

          <div style={{ flex: "1 1 120px", background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 20px" }}>
            <div style={{ fontSize: "0.68rem", color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Risk Level</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: BLAST[String(d.risk_level || "low")] || T.textMain }}>{String(d.risk_level || "—").toUpperCase()}</div>
          </div>

          <div style={{ flex: "1 1 120px", background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 20px" }}>
            <div style={{ fontSize: "0.68rem", color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Confidence</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: T.textMain }}>{pct(d.confidence)}</div>
          </div>

          {channels.length > 0 && (
            <div style={{ flex: "1 1 160px", background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 20px" }}>
              <div style={{ fontSize: "0.68rem", color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Notify Via</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {channels.map((ch) => (
                  <span key={ch} style={{ background: "#fff", color: T.primary, border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 12px", fontSize: "0.78rem", fontWeight: 600 }}>{ch}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── Simulation → Decision Coverage ──────────────────────────────── */}
      <Section title="Simulation → Decision Coverage" accent="#6366f1">
        {coverageRows.length === 0 ? (
          <p style={{ color: T.textFaint, fontSize: "0.85rem" }}>No simulation scenarios available.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: T.cardAlt }}>
                <th style={{ textAlign: "left", padding: "9px 14px", color: T.textMuted, fontWeight: 600, borderBottom: `1px solid ${T.border}` }}>Simulated Scenario</th>
                <th style={{ textAlign: "center", padding: "9px 14px", color: T.textMuted, fontWeight: 600, borderBottom: `1px solid ${T.border}` }}>Status</th>
                <th style={{ textAlign: "center", padding: "9px 14px", color: T.textMuted, fontWeight: 600, borderBottom: `1px solid ${T.border}` }}>Role in Decision</th>
              </tr>
            </thead>
            <tbody>
              {coverageRows.map((row, i) => (
                <tr key={i} style={{ background: row.isSelected ? T.primarySoft : T.card, borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "11px 14px", color: T.textMain, fontWeight: row.isSelected ? 700 : 400 }}>
                    {row.action}
                    {row.isSelected && (
                      <span style={{ marginLeft: 8, background: T.primary, color: "#fff", borderRadius: 6, padding: "1px 8px", fontSize: "0.7rem", fontWeight: 700 }}>SELECTED</span>
                    )}
                  </td>
                  <td style={{ padding: "11px 14px", textAlign: "center" }}>
                    <span style={{ padding: "3px 14px", borderRadius: 20, fontSize: "0.74rem", fontWeight: 700, background: row.isSelected ? T.primarySoft : "#f1f5f9", color: row.isSelected ? T.primary : T.textMuted, border: `1.5px solid ${row.isSelected ? T.primary + "55" : T.border}` }}>
                      {row.isSelected ? "DECIDED" : "EVALUATED"}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px", textAlign: "center", color: row.isSelected ? T.primary : T.textFaint, fontSize: "0.78rem", fontWeight: row.isSelected ? 600 : 400 }}>
                    {row.isSelected ? "Selected for execution" : "Policy evaluated, not selected"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* ── Policy Violations ───────────────────────────────────────────── */}
      <Section title="Policy Violations" accent={violations.length > 0 ? "#dc2626" : "#16a34a"}>
        {violations.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#16a34a", fontSize: "0.88rem", fontWeight: 600 }}>
            <span style={{ fontSize: "1.2rem" }}>✓</span> No policy violations detected — strategy is fully compliant.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {violations.map((v, i) => {
              const sev = String(v.severity || "MEDIUM").toUpperCase();
              const col = SEV[sev] || T.textMuted;
              return (
                <div key={i} style={{ background: col + "0d", border: `1px solid ${col}44`, borderRadius: 9, padding: "12px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <span style={{ background: col + "1a", color: col, borderRadius: 6, padding: "3px 11px", fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap", border: `1px solid ${col}55` }}>{sev}</span>
                  <div>
                    <div style={{ color: T.textMain, fontWeight: 700, fontSize: "0.88rem" }}>{v.rule || "policy_rule"}</div>
                    <div style={{ color: T.textMuted, fontSize: "0.82rem", marginTop: 3 }}>{v.message}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── Required Approvals ──────────────────────────────────────────── */}
      {approvals.length > 0 && (
        <Section title="Required Approvals" accent="#ea580c">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {approvals.map((a, i) => (
              <div key={i} style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 9, padding: "10px 20px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ea580c", flexShrink: 0 }} />
                <span style={{ color: "#9a3412", fontWeight: 700, fontSize: "0.88rem" }}>{a}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Policy Reasoning ────────────────────────────────────────────── */}
      <Section title="Policy Reasoning" accent={T.primary}>
        <p style={{ margin: 0, color: T.textMuted, fontSize: "0.88rem", lineHeight: 1.7 }}>
          {d.reason || "No decision rationale available."}
        </p>
      </Section>

      {/* ── Log Footer ──────────────────────────────────────────────────── */}
      {log.timestamp && (
        <div style={{ background: T.cardAlt, borderRadius: 10, padding: "10px 18px", border: `1px solid ${T.border}`, display: "flex", gap: 24, flexWrap: "wrap", fontSize: "0.75rem", color: T.textFaint }}>
          <span style={{ fontWeight: 600, color: T.textMuted }}>DecisionAgent</span>
          <span>Strategies: <strong style={{ color: T.textMain }}>{log.strategies_input ?? strategiesInput.length}</strong></span>
          <span>Simulations: <strong style={{ color: T.textMain }}>{log.simulations_input ?? simulationsEval.length}</strong></span>
          <span>Violations: <strong style={{ color: violations.length > 0 ? "#dc2626" : "#16a34a" }}>{log.violations_count ?? violations.length}</strong></span>
          <span>Fraud score: <strong style={{ color: T.textMain }}>{log.fraud_score ?? "—"}</strong></span>
          <span>Coverage: <strong style={{ color: T.textMain }}>{d.coverage_mode || "recommended_only"}</strong></span>
          <span style={{ marginLeft: "auto", color: T.textFaint }}>{new Date(log.timestamp).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

