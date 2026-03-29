import React from "react";

const T = {
  card: "#ffffff",
  cardAlt: "#f4f7f1",
  border: "#d7e2d8",
  shadow: "0 4px 18px rgba(31,56,43,0.07)",
  primary: "#2f6f4f",
  textMain: "#1a2f23",
  textMuted: "#5c6d62",
  textFaint: "#8da898",
};

function statusColor(status) {
  const s = String(status || "needs_improvement").toLowerCase();
  if (s === "strong") return "#16a34a";
  if (s === "moderate") return "#ea580c";
  return "#dc2626";
}

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
    <div>
      <div style={{ fontSize: "0.62rem", color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: "0.92rem", fontWeight: 700, color: accent || T.textMain }}>{value ?? "-"}</div>
    </div>
  );
}

export default function ReflectionPanel({ reflection, execution, decision, simulation }) {
  const r = reflection || {};
  const inputs = r.inputs_considered || {};
  const evaln = r.evaluation || {};
  const learning = r.learning || {};
  const issueFeedback = r.issue_feedback || [];
  const selectedAction = inputs.selected_action || (decision || {}).selected_action || (simulation?.recommended_action || {}).action_type || "-";
  const score = Number(evaln.score || 0);
  const color = statusColor(evaln.status);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: "0.65rem", color: T.primary, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 3 }}>Reflection Agent</div>
            <h2 style={{ margin: 0, fontSize: "1.4rem", color: T.textMain, fontFamily: "Fraunces, serif" }}>Reflection and Learning Loop</h2>
            <p style={{ margin: "4px 0 0", color: T.textMuted, fontSize: "0.82rem" }}>
              Reviews whether each issue was covered by strategy, simulation, and final decision.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ background: color + "18", border: `1px solid ${color}55`, color, borderRadius: 20, padding: "4px 14px", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase" }}>
              {String(evaln.status || "needs_improvement").replace("_", " ")}
            </span>
            <span style={{ background: "#fff", border: `1px solid ${T.border}`, color: T.textMain, borderRadius: 20, padding: "4px 14px", fontSize: "0.78rem", fontWeight: 700 }}>
              Score: {score}
            </span>
          </div>
        </div>
        <div style={{ height: 8, borderRadius: 6, background: "#ecf2ed", overflow: "hidden" }}>
          <div style={{ width: `${Math.max(0, Math.min(100, score))}%`, height: "100%", background: color }} />
        </div>
      </div>

      <Section title="Inputs Considered" accent="#2563eb">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 10 }}>
          <KV label="Signals" value={inputs.signal_count ?? 0} />
          <KV label="Causes" value={inputs.causes_count ?? 0} />
          <KV label="Strategies" value={inputs.strategies_count ?? 0} />
          <KV label="Simulations" value={inputs.simulations_count ?? 0} />
          <KV label="Issues Total" value={inputs.issues_total ?? 0} />
          <KV label="With Strategy" value={inputs.issues_with_strategy ?? 0} accent="#16a34a" />
          <KV label="With Simulation" value={inputs.issues_with_simulation ?? 0} accent="#16a34a" />
          <KV label="Selected by Decision" value={inputs.issues_selected_by_decision ?? 0} accent="#ea580c" />
          <KV label="Selected Action" value={selectedAction} accent={T.primary} />
          <KV label="Execution Mode" value={inputs.execution_mode || execution?.mode || "dry_run"} />
        </div>
      </Section>

      <Section title="Issue Feedback" accent="#dc2626">
        {issueFeedback.length === 0 ? (
          <p style={{ margin: 0, color: T.textFaint, fontSize: "0.8rem" }}>No issue feedback available.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {issueFeedback.map((item, i) => (
              <div key={i} style={{ background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 9, padding: "10px 12px" }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: "0.86rem", fontWeight: 700, color: T.textMain }}>{item.issue}</span>
                  <span style={{ fontSize: "0.68rem", borderRadius: 12, border: `1px solid ${T.border}`, padding: "2px 8px", color: T.textMuted }}>{item.severity}</span>
                  <span style={{ marginLeft: "auto", fontSize: "0.68rem", color: T.textMuted }}>
                    Strategy: <strong>{item.strategy_status}</strong> | Simulation: <strong>{item.simulation_status}</strong> | Decision: <strong>{item.decision_status}</strong>
                  </span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: T.textMuted, fontSize: "0.78rem" }}>
                  {(item.recommended_actions || []).map((a, j) => <li key={j}>{a}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Learning Actions" accent={T.primary}>
        <p style={{ margin: "0 0 8px", fontSize: "0.84rem", color: T.textMain, fontWeight: 600 }}>{learning.summary || "No learning summary."}</p>
        <ul style={{ margin: 0, paddingLeft: 18, color: T.textMuted, fontSize: "0.8rem" }}>
          {(learning.actions || ["No actions generated."]).map((a, i) => <li key={i}>{a}</li>)}
        </ul>
      </Section>
    </div>
  );
}
