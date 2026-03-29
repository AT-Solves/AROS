import React from "react";

/* ─── severity palette ─────────────────────────────────────── */
const SEV = {
  HIGH:   { bg: "#fde8e8", color: "#9e3a2f", border: "#f5c2c2", dot: "#c0392b" },
  MEDIUM: { bg: "#fff7e6", color: "#7a5200", border: "#f5dfa0", dot: "#e67e22" },
  LOW:    { bg: "#e6f2ec", color: "#2f6f4f", border: "#a0d0b0", dot: "#27ae60" },
};

/* ─── human labels ─────────────────────────────────────────── */
const SIGNAL_LABELS = {
  latency_spike:        "Latency Spike",
  cart_abandonment_high:"Cart Abandonment",
  payment_failures_high:"Payment Failures",
  user_latency_high:    "User Latency",
  user_drop_off_high:   "User Drop-Off",
  order_conversion_low: "Order Conversion",
};

const METRIC_LABELS = {
  avg_latency_ms:           "API Latency",
  cart_abandonment_rate:    "Cart Abandonment Rate",
  payment_failure_rate:     "Payment Failure Rate",
  bounce_rate:              "Bounce Rate",
  session_count:            "Sessions",
  conversion_rate:          "Conversion Rate",
  order_conversion_rate:    "Order Conversion Rate",
  avg_order_value:          "Avg Order Value",
  revenue:                  "Revenue",
  new_users:                "New Users",
  returning_users:          "Returning Users",
};

const METRIC_UNIT = {
  avg_latency_ms:        "ms",
  cart_abandonment_rate: "%",
  payment_failure_rate:  "%",
  bounce_rate:           "%",
  conversion_rate:       "%",
  order_conversion_rate: "%",
};

const SOURCE_DEFS = [
  { key: "kpi",      label: "KPI Metrics",      signals: ["latency_spike", "cart_abandonment_high"] },
  { key: "payment",  label: "Payment Data",      signals: ["payment_failures_high"] },
  { key: "behavior", label: "Behavior Data",     signals: ["user_latency_high", "user_drop_off_high"] },
  { key: "cart",     label: "Cart / Domain",     signals: ["cart_abandonment_high"] },
  { key: "orders",   label: "Orders / Revenue",  signals: ["order_conversion_low"] },
];

/* ─── helpers ──────────────────────────────────────────────── */
function fmtVal(value, metric) {
  if (value === undefined || value === null || value === "N/A") return "—";
  const unit = METRIC_UNIT[metric] || "";
  const n = parseFloat(value);
  if (isNaN(n)) return String(value);
  const formatted = Number.isInteger(n) ? n.toLocaleString() : n.toFixed(2);
  return unit ? `${formatted}${unit}` : formatted;
}

function parseReasoning(str) {
  if (!str) return [];
  return str
    .split("|")
    .map(s => s.trim())
    .filter(Boolean)
    .map(part => {
      const idx = part.indexOf(":");
      if (idx === -1) return { label: part, value: "" };
      return { label: part.slice(0, idx).trim(), value: part.slice(idx + 1).trim() };
    });
}

/* ─── sub-components ───────────────────────────────────────── */
function SevBadge({ severity }) {
  const s = SEV[severity] || SEV.LOW;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      letterSpacing: 0.5, textTransform: "uppercase",
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
      {severity}
    </span>
  );
}

function ConfBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "#e8ecf0", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#3b82f6", borderRadius: 3, transition: "width .4s" }} />
      </div>
      <span style={{ fontSize: 11, color: "#64748b", minWidth: 34, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 10, padding: "14px 18px",
      border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,.05)", flex: 1, minWidth: 110,
      borderTop: `3px solid ${accent || "#3b82f6"}`,
    }}>
      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#1e293b" }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SignalCard({ sig }) {
  const sevStyle = SEV[sig.severity] || SEV.LOW;
  const change = parseFloat(sig.change_pct);
  const isNeg  = !isNaN(change) && change < 0;
  const isPos  = !isNaN(change) && change > 0;
  const changeColor = sig.severity === "HIGH" ? sevStyle.color : (isNeg ? "#27ae60" : isPos ? "#c0392b" : "#64748b");
  const changeStr = !isNaN(change) ? `${change > 0 ? "+" : ""}${change.toFixed(1)}%` : null;

  return (
    <div style={{
      background: "#fff", borderRadius: 10, border: `1px solid ${sevStyle.border}`,
      borderLeft: `4px solid ${sevStyle.dot}`,
      padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,.05)",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
            {SIGNAL_LABELS[sig.type] || sig.type}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
            {METRIC_LABELS[sig.metric] || sig.metric || ""}
          </div>
        </div>
        <SevBadge severity={sig.severity} />
      </div>

      {/* values row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ background: sevStyle.bg, borderRadius: 8, padding: "8px 12px", textAlign: "center", minWidth: 80 }}>
          <div style={{ fontSize: 10, color: sevStyle.color, fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Current</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: sevStyle.color }}>
            {fmtVal(sig.current_value, sig.metric)}
          </div>
        </div>
        {sig.previous_value !== undefined && sig.previous_value !== null && sig.previous_value !== "N/A" && (
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px", textAlign: "center", minWidth: 80 }}>
            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Previous</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#475569" }}>
              {fmtVal(sig.previous_value, sig.metric)}
            </div>
          </div>
        )}
        {changeStr && (
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px", textAlign: "center", minWidth: 80 }}>
            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Change</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: changeColor }}>{changeStr}</div>
          </div>
        )}
      </div>

      {/* confidence */}
      <div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Confidence</div>
        <ConfBar value={sig.confidence} />
      </div>
    </div>
  );
}

/* ─── main panel ───────────────────────────────────────────── */
export default function SignalDetectionPanel({ details }) {
  if (!details) {
    return (
      <div style={{ padding: 32, color: "#94a3b8", textAlign: "center" }}>
        No signal detection data available.
      </div>
    );
  }

  const {
    alert = false,
    severity = "LOW",
    confidence = 0,
    signal_count = 0,
    primary_signal = "—",
    next_agent = "—",
    requires_attention = false,
    reasoning = "",
    signals = [],
    signal_sources = {},
    log = {},
  } = details;

  const reasoningItems = parseReasoning(reasoning);

  /* which source columns actually fired? */
  const firedTypes = new Set(signals.map(s => s.type));
  const sourceFired = (src) => src.signals.some(t => firedTypes.has(t));

  /* group signals by severity */
  const highSigs   = signals.filter(s => s.severity === "HIGH");
  const medSigs    = signals.filter(s => s.severity === "MEDIUM");
  const lowSigs    = signals.filter(s => s.severity === "LOW");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "0 2px" }}>

      {/* ── Alert Banner ──────────────────────────────────── */}
      {(alert || requires_attention) && (
        <div style={{
          background: "#fde8e8", border: "1px solid #f5c2c2", borderLeft: "5px solid #c0392b",
          borderRadius: 10, padding: "14px 20px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 18 }}>&#9888;</span>
          <div>
            <div style={{ fontWeight: 700, color: "#9e3a2f", fontSize: 14 }}>
              Attention Required — {signal_count} Signal{signal_count !== 1 ? "s" : ""} Detected
            </div>
            <div style={{ fontSize: 12, color: "#b94040", marginTop: 2 }}>
              Primary: <strong>{SIGNAL_LABELS[primary_signal] || primary_signal}</strong>
              &nbsp;&middot;&nbsp;Overall Severity: <strong>{severity}</strong>
              &nbsp;&middot;&nbsp;Next Agent: <strong>{next_agent}</strong>
            </div>
          </div>
        </div>
      )}

      {/* ── Detection Summary ─────────────────────────────── */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .5, marginBottom: 14 }}>
          Detection Summary
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <StatCard
            label="Overall Severity"
            value={severity}
            accent={SEV[severity]?.dot || "#3b82f6"}
          />
          <StatCard
            label="Signals Detected"
            value={signal_count}
            sub={`${highSigs.length} High · ${medSigs.length} Medium · ${lowSigs.length} Low`}
            accent="#3b82f6"
          />
          <StatCard
            label="Primary Signal"
            value={SIGNAL_LABELS[primary_signal] || primary_signal}
            sub={requires_attention ? "Requires attention" : "Monitoring"}
            accent={SEV[severity]?.dot || "#3b82f6"}
          />
          <StatCard
            label="Next Agent"
            value={next_agent}
            accent="#8b5cf6"
          />
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>
            Overall Confidence&nbsp;
            <span style={{ fontWeight: 600, color: "#1e293b" }}>{Math.round(confidence * 100)}%</span>
          </div>
          <ConfBar value={confidence} />
        </div>
      </div>

      {/* ── Signal Cards ──────────────────────────────────── */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .5, marginBottom: 14 }}>
          Detected Signals
        </div>

        {signals.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>No signals detected.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {signals.map((sig, i) => <SignalCard key={i} sig={sig} />)}
          </div>
        )}
      </div>

      {/* ── KPI Context (Reasoning) ───────────────────────── */}
      {reasoningItems.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .5, marginBottom: 14 }}>
            KPI Context
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {reasoningItems.map((item, i) => (
              <div key={i} style={{
                background: "#f8fafc", borderRadius: 8, padding: "10px 14px",
                border: "1px solid #e2e8f0",
              }}>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                  {item.value || "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Source Breakdown ──────────────────────────────── */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .5, marginBottom: 14 }}>
          Signal Source Breakdown
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {SOURCE_DEFS.map(src => {
            const fired = sourceFired(src);
            const srcSignals = signals.filter(s => src.signals.includes(s.type));
            return (
              <div key={src.key} style={{
                borderRadius: 8, padding: "12px 14px",
                background: fired ? "#fde8e8" : "#f8fafc",
                border: `1px solid ${fired ? "#f5c2c2" : "#e2e8f0"}`,
                borderTop: `3px solid ${fired ? "#c0392b" : "#e2e8f0"}`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: fired ? "#9e3a2f" : "#64748b", textTransform: "uppercase", marginBottom: 6 }}>
                  {src.label}
                </div>
                <div style={{ fontSize: 11, color: fired ? "#b94040" : "#94a3b8" }}>
                  {fired
                    ? srcSignals.map(s => SIGNAL_LABELS[s.type] || s.type).join(", ")
                    : "No signals"}
                </div>
                <div style={{
                  marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700,
                  background: fired ? "#c0392b" : "#e2e8f0",
                  color: fired ? "#fff" : "#94a3b8",
                }}>
                  {fired ? "FIRED" : "CLEAR"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Log Footer ────────────────────────────────────── */}
      {Object.keys(log).length > 0 && (
        <div style={{
          background: "#1e293b", borderRadius: 10, padding: "14px 18px",
          display: "flex", gap: 20, flexWrap: "wrap",
        }}>
          {Object.entries(log).map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: .5 }}>{k.replace(/_/g, " ")}</div>
              <div style={{ fontSize: 12, color: "#e2e8f0", marginTop: 2 }}>{String(v)}</div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
