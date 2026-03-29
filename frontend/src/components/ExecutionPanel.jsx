import React from "react";

// ── Theme tokens ────────────────────────────────────────────────────────────
const T = {
  card:        "#ffffff",
  cardAlt:     "#f4f7f1",
  border:      "#d7e2d8",
  shadow:      "0 4px 18px rgba(31,56,43,0.07)",
  primary:     "#2f6f4f",
  primarySoft: "#e6f2ec",
  textMain:    "#1a2f23",
  textMuted:   "#5c6d62",
  textFaint:   "#8da898",
};

const RISK_COLOR = { high: "#dc2626", medium: "#ea580c", low: "#16a34a", HIGH: "#dc2626", MEDIUM: "#ea580c", LOW: "#16a34a" };
const SEV_COLOR  = { CRITICAL: "#dc2626", HIGH: "#ea580c", MEDIUM: "#ca8a04", LOW: "#16a34a" };
const METHOD_COLOR = { GET: "#2563eb", POST: "#7c3aed", PUT: "#0891b2", DELETE: "#dc2626" };

function pct(v) { return `${Math.round(Number(v || 0) * 100)}%`; }

function Section({ title, accent, children }) {
  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, overflow: "hidden" }}>
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${T.border}`, background: T.cardAlt, display: "flex", alignItems: "center", gap: 9 }}>
        {accent && <span style={{ width: 4, height: 16, borderRadius: 3, background: accent, flexShrink: 0 }} />}
        <h3 style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: T.textMain }}>{title}</h3>
      </div>
      <div style={{ padding: "16px 20px" }}>{children}</div>
    </div>
  );
}

function KV({ label, value, accent }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: "0.62rem", color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: "0.92rem", fontWeight: 700, color: accent || T.textMain, wordBreak: "break-word" }}>{value ?? "—"}</div>
    </div>
  );
}

function MethodBadge({ method }) {
  const m = String(method || "").toUpperCase();
  const color = METHOD_COLOR[m] || T.textMuted;
  return (
    <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 6, fontSize: "0.68rem", fontWeight: 700, background: color + "18", color, border: `1px solid ${color}44`, fontFamily: "monospace" }}>
      {m || "—"}
    </span>
  );
}

function StatusBanner({ mode, executed }) {
  const isAuto    = mode === "auto" && executed;
  const isDryRun  = mode === "dry_run";
  const color  = isAuto ? "#16a34a" : isDryRun ? "#ea580c" : "#ca8a04";
  const bg     = isAuto ? "#f0fdf4" : isDryRun ? "#fff7ed" : "#fefce8";
  const border = isAuto ? "#86efac" : isDryRun ? "#fed7aa" : "#fde68a";
  const label  = isAuto ? "EXECUTED (AUTO)" : isDryRun ? "DRY RUN — BLOCKED BY GUARDRAILS" : "PENDING APPROVAL";
  const msg    = isAuto
    ? "Action was automatically executed and applied to the target system."
    : isDryRun
    ? "Execution is blocked. A human operator must approve before any system change is applied."
    : "Awaiting operator approval to proceed with execution.";
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 9, padding: "12px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{ marginTop: 1, fontSize: "1rem" }}>{isAuto ? "✓" : "⚠"}</span>
      <div>
        <div style={{ fontWeight: 700, color, fontSize: "0.83rem", letterSpacing: "0.04em" }}>{label}</div>
        <div style={{ color: T.textMuted, fontSize: "0.8rem", marginTop: 2 }}>{msg}</div>
      </div>
    </div>
  );
}

export default function ExecutionPanel({ execution, executionMode, decision }) {
  const e = execution || {};
  const problem   = e.problem_context  || {};
  const dec       = e.decision_taken   || decision || {};
  const options   = e.execution_options || [];
  const issueTrace = e.issue_trace || [];
  const coverage = e.coverage_summary || {};
  const mode      = e.mode || executionMode || "dry_run";
  const executed  = e.executed === true;
  const notify    = e.notifications || {};
  const monitoring = e.monitoring || {};
  const rollback  = e.rollback || {};

  const causes        = problem.diagnosed_causes || [];
  const selectedOpt   = options.find((o) => o.is_selected) || options[0];
  const otherOpts     = options.filter((o) => !o.is_selected);
  const violations    = dec.violations || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: "0.65rem", color: T.primary, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 3 }}>Execution Agent</div>
            <h2 style={{ margin: 0, fontSize: "1.4rem", color: T.textMain, fontFamily: "Fraunces, serif" }}>Execution Plan</h2>
            <p style={{ margin: "4px 0 0", color: T.textMuted, fontSize: "0.82rem" }}>
              Translates the governance decision into concrete system actions for deployment.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.72rem", color: T.textMuted, background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 8, padding: "4px 12px" }}>
              Deployment: <strong style={{ color: T.textMain }}>{e.deployment_id ? e.deployment_id.slice(0, 12) + "…" : "—"}</strong>
            </span>
          </div>
        </div>
        <StatusBanner mode={mode} executed={executed} />
      </div>

      {/* ── Problem Context ─────────────────────────────────────────────── */}
      <Section title="Problem Context — What Triggered This Execution" accent="#dc2626">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: 10, marginBottom: causes.length > 0 ? 16 : 0 }}>
          <KV label="Primary Cause"  value={problem.primary_cause}              accent={T.primary} />
          <KV label="Signal Count"   value={problem.signal_count}               accent={T.textMain} />
          <KV label="Fraud Score"    value={problem.fraud_score != null ? (problem.fraud_score * 100).toFixed(0) + "%" : "—"} accent={problem.fraud_score > 0.65 ? "#dc2626" : "#16a34a"} />
          <KV label="Severity"       value={String(problem.severity || "—").toUpperCase()} accent={SEV_COLOR[String(problem.severity || "").toUpperCase()] || T.textMain} />
        </div>
        {causes.length > 0 && (
          <div>
            <div style={{ fontSize: "0.72rem", color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, fontWeight: 600 }}>Diagnosed Causes Considered</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {causes.map((c, i) => {
                const sc = SEV_COLOR[String(c.severity || "").toUpperCase()] || T.textFaint;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: T.cardAlt, borderRadius: 8, padding: "8px 12px", border: `1px solid ${T.border}` }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: sc, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: "0.83rem", color: T.textMain, fontWeight: 500 }}>{c.cause}</span>
                    <span style={{ fontSize: "0.7rem", color: T.textMuted, background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, padding: "1px 8px" }}>{c.signal_type}</span>
                    <span style={{ fontSize: "0.7rem", color: sc, fontWeight: 700, minWidth: 28, textAlign: "right" }}>{Math.round((c.confidence || 0) * 100)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Section>

      {/* ── Decision Taken ──────────────────────────────────────────────── */}
      <Section title="Decision Taken — Governance Ruling" accent={T.primary}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 10, marginBottom: dec.reason ? 14 : 0 }}>
          <KV label="Final Decision"   value={String(dec.decision || "INVESTIGATE").toUpperCase()}       accent={dec.decision === "EXECUTE" ? "#16a34a" : "#ea580c"} />
          <KV label="Policy"           value={String(dec.policy_decision || "NOTIFY").toUpperCase()}     accent={dec.policy_decision === "AUTO" ? "#16a34a" : dec.policy_decision === "ESCALATE" ? "#dc2626" : "#ea580c"} />
          <KV label="Selected Action"  value={dec.selected_action || "—"}                                accent={T.primary} />
          <KV label="Blast Radius"     value={String(dec.blast_radius || "LOW").toUpperCase()}           accent={RISK_COLOR[String(dec.blast_radius || "LOW").toUpperCase()] || T.textMuted} />
          <KV label="Confidence"       value={pct(dec.confidence)} />
          <KV label="Violations"       value={violations.length === 0 ? "None" : `${violations.length} violation${violations.length > 1 ? "s" : ""}`} accent={violations.length > 0 ? "#dc2626" : "#16a34a"} />
        </div>
        {dec.reason && (
          <div style={{ background: T.cardAlt, borderRadius: 8, padding: "10px 14px", fontSize: "0.81rem", color: T.textMuted, borderLeft: `3px solid ${T.border}` }}>
            {dec.reason}
          </div>
        )}
      </Section>

      {/* ── Issue Traceability ─────────────────────────────────────────── */}
      <Section title="Issue Coverage Trace — Strategy → Simulation → Decision" accent="#2563eb">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 10, marginBottom: issueTrace.length > 0 ? 14 : 0 }}>
          <KV label="Issues Total"         value={coverage.issues_total ?? issueTrace.length} />
          <KV label="With Strategy"        value={coverage.issues_with_strategy ?? 0} accent="#16a34a" />
          <KV label="With Simulation"      value={coverage.issues_with_simulation ?? 0} accent="#16a34a" />
          <KV label="Selected by Decision" value={coverage.issues_selected_by_decision ?? 0} accent="#ea580c" />
        </div>
        {issueTrace.length === 0 ? (
          <p style={{ margin: 0, color: T.textFaint, fontSize: "0.8rem" }}>No issue trace available.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
              <thead>
                <tr style={{ background: T.cardAlt }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${T.border}`, color: T.textMuted }}>Issue</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", borderBottom: `1px solid ${T.border}`, color: T.textMuted }}>Severity</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${T.border}`, color: T.textMuted }}>Strategy</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", borderBottom: `1px solid ${T.border}`, color: T.textMuted }}>Simulation</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", borderBottom: `1px solid ${T.border}`, color: T.textMuted }}>Decision</th>
                </tr>
              </thead>
              <tbody>
                {issueTrace.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "8px 10px", color: T.textMain, fontWeight: 600 }}>{row.issue}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center", color: SEV_COLOR[row.severity] || T.textMuted, fontWeight: 700 }}>{row.severity}</td>
                    <td style={{ padding: "8px 10px", color: T.textMuted }}>
                      {row.strategy_actions?.length ? row.strategy_actions.join(", ") : "—"}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      <span style={{ color: row.simulation_status === "SIMULATED" || row.simulation_status === "NOT_REQUIRED" ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
                        {row.simulation_status}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      <span style={{ color: row.decision_status === "SELECTED" ? "#ea580c" : T.textMuted, fontWeight: 700 }}>
                        {row.decision_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Selected Execution Option ────────────────────────────────────── */}
      {selectedOpt && (
        <Section title="Selected Execution Option" accent="#16a34a">
          <div style={{ background: T.primarySoft, border: `1.5px solid ${T.primary}44`, borderRadius: 10, padding: "16px 18px", marginBottom: otherOpts.length > 0 ? 14 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: "1rem", color: T.primary }}>{selectedOpt.label || selectedOpt.action_type}</span>
              <MethodBadge method={selectedOpt.method} />
              <span style={{ fontSize: "0.75rem", color: T.textMuted, background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, padding: "2px 10px", fontFamily: "monospace" }}>{selectedOpt.endpoint}</span>
              <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: RISK_COLOR[String(selectedOpt.risk_level || "medium").toLowerCase()] || T.textMuted, fontWeight: 700, textTransform: "uppercase" }}>{selectedOpt.risk_level} risk</span>
            </div>
            <p style={{ margin: "0 0 8px", fontSize: "0.83rem", color: T.textMuted }}>{selectedOpt.description}</p>
            <div style={{ fontSize: "0.78rem", color: T.primary, fontWeight: 600 }}>Expected impact: {selectedOpt.impact || "—"}</div>
            {selectedOpt.covers?.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {selectedOpt.covers.map((cv, i) => (
                  <span key={i} style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, padding: "2px 10px", fontSize: "0.72rem", color: T.textMuted }}>Covers: {cv}</span>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Other Available Options ──────────────────────────────────────── */}
      {otherOpts.length > 0 && (
        <Section title="Other Available Execution Options" accent="#6366f1">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {otherOpts.map((opt, i) => (
              <div key={i} style={{ background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 7 }}>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem", color: T.textMain }}>{opt.label || opt.action_type}</span>
                  <MethodBadge method={opt.method} />
                  <span style={{ fontSize: "0.72rem", color: T.textMuted, fontFamily: "monospace", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, padding: "2px 9px" }}>{opt.endpoint}</span>
                  <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: RISK_COLOR[String(opt.risk_level || "medium").toLowerCase()] || T.textMuted, fontWeight: 700, textTransform: "uppercase" }}>{opt.risk_level} risk</span>
                </div>
                <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: T.textMuted }}>{opt.description}</p>
                <div style={{ fontSize: "0.75rem", color: T.textFaint }}>Impact: {opt.impact || "—"}</div>
                {opt.covers?.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {opt.covers.map((cv, j) => (
                      <span key={j} style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, padding: "2px 9px", fontSize: "0.7rem", color: T.textMuted }}>Covers: {cv}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Monitoring + Rollback ───────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Section title="Monitoring" accent="#0891b2">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <KV label="Status"             value={String(monitoring.status || "pending").toUpperCase()} accent={monitoring.status === "initiated" ? "#16a34a" : "#ea580c"} />
            <KV label="Check After"        value={monitoring.check_after_minutes ? `${monitoring.check_after_minutes} min` : "—"} />
            <KV label="Deployment ID"      value={e.deployment_id ? e.deployment_id.slice(0, 16) + "…" : "—"} />
          </div>
        </Section>
        <Section title="Rollback &amp; Notifications" accent="#ca8a04">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <KV label="Rollback"  value={rollback.status ? rollback.status.replace(/_/g, " ").toUpperCase() : "AVAILABLE"} accent="#ca8a04" />
            <KV label="Slack"     value={notify.slack ? "Delivered" : "Not triggered"} accent={notify.slack ? "#16a34a" : T.textFaint} />
            <KV label="Email"     value={notify.email?.subject || (notify.email ? "Sent" : "Not triggered")} />
          </div>
        </Section>
      </div>

      {/* ── Log footer ────────────────────────────────────────────────────── */}
      {e.timestamp && (
        <div style={{ background: T.cardAlt, borderRadius: 10, padding: "9px 18px", border: `1px solid ${T.border}`, display: "flex", gap: 20, flexWrap: "wrap", fontSize: "0.74rem", color: T.textFaint }}>
          <span style={{ fontWeight: 600, color: T.textMuted }}>ExecutionAgent</span>
          <span>Mode: <strong style={{ color: T.textMain }}>{mode}</strong></span>
          <span>Options: <strong style={{ color: T.textMain }}>{options.length}</strong></span>
          <span>Causes considered: <strong style={{ color: T.textMain }}>{causes.length}</strong></span>
          <span style={{ marginLeft: "auto" }}>{new Date(e.timestamp).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
