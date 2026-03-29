import React, { useState } from "react";

/* ─── severity palette ─────────────────────────────────────── */
const SEV = {
  HIGH:   { bg: "#fde8e8", color: "#9e3a2f", border: "#f5c2c2", dot: "#c0392b", bar: "#c0392b" },
  MEDIUM: { bg: "#fff7e6", color: "#7a5200", border: "#f5dfa0", dot: "#e67e22", bar: "#e67e22" },
  LOW:    { bg: "#e6f2ec", color: "#2f6f4f", border: "#a0d0b0", dot: "#27ae60", bar: "#27ae60" },
};

const METRIC_LABELS = {
  payment_failure_rate: "Payment Failure Rate",
  latency_ms:          "API Latency",
  avg_latency_ms:      "API Latency",
  cart_abandonment_rate:"Cart Abandonment",
  conversion_rate:     "Conversion Rate",
  revenue:             "Revenue",
  bounce_rate:         "Bounce Rate",
  session_count:       "Session Count",
};

/* ─── helpers ──────────────────────────────────────────────── */
function cleanReasoning(str) {
  if (!str) return "";
  // strip garbled multi-byte sequences that result from emoji encoding issues
  return str.replace(/[\uFFFD\u00E2\u0080\u0099\u009C\u009D\u00A0]+/g, "").trim();
}

function ConfBar({ value, color }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "#e8ecf0", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color || "#3b82f6", borderRadius: 3, transition: "width .4s" }} />
      </div>
      <span style={{ fontSize: 11, color: "#64748b", minWidth: 34, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

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

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 10, padding: "14px 18px",
      border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,.05)", flex: 1, minWidth: 120,
      borderTop: `3px solid ${accent || "#3b82f6"}`,
    }}>
      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", lineHeight: 1.2 }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function EvidenceList({ items, expanded }) {
  if (!items || items.length === 0) return null;
  return (
    <ul style={{ margin: "6px 0 0 0", paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3 }}>
      {items.map((ev, i) => (
        <li key={i} style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{ev}</li>
      ))}
    </ul>
  );
}

function CauseCard({ cause, index, isPrimary }) {
  const [expanded, setExpanded] = useState(true);
  const sev = SEV[cause.severity] || SEV.MEDIUM;
  const metricLabel = METRIC_LABELS[cause.affected_metric] || cause.affected_metric || "";

  return (
    <div style={{
      background: "#fff", borderRadius: 10,
      border: `1px solid ${isPrimary ? sev.border : "#e2e8f0"}`,
      borderLeft: `4px solid ${sev.dot}`,
      boxShadow: isPrimary ? `0 2px 8px rgba(0,0,0,.08)` : "0 1px 4px rgba(0,0,0,.04)",
      overflow: "hidden",
    }}>
      {/* header */}
      <div
        style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            {isPrimary && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10, background: "#1e293b", color: "#fff", textTransform: "uppercase" }}>
                Primary
              </span>
            )}
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{cause.cause}</span>
          </div>
          {metricLabel && (
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Affected metric: {metricLabel}</div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <SevBadge severity={cause.severity} />
          <span style={{ fontSize: 14, color: "#94a3b8" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* body */}
      {expanded && (
        <div style={{ padding: "0 16px 16px 16px", borderTop: "1px solid #f1f5f9" }}>
          <div style={{ paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: .4 }}>
              Confidence
            </div>
            <ConfBar value={cause.confidence} color={sev.bar} />
          </div>
          {cause.evidence && cause.evidence.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: .4, marginBottom: 4 }}>
                Evidence
              </div>
              <EvidenceList items={cause.evidence} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── main panel ───────────────────────────────────────────── */
export default function DiagnosisPanel({ details, liveSignals = [] }) {
  if (!details || Object.keys(details).length === 0) {
    return (
      <div style={{ padding: 32, color: "#94a3b8", textAlign: "center" }}>
        No diagnosis data available. Run the pipeline to generate diagnosis.
      </div>
    );
  }

  /* normalise both DB format and live agent format */
  const diagnosedCauses =
    details.diagnosed_causes ||
    (details.diagnosis?.root_causes || []).map(rc => ({ cause: rc, severity: details.severity || "MEDIUM", confidence: details.diagnosis?.confidence || 0.5 }));

  const primaryCause   = details.primary_cause || details.diagnosis?.primary_cause || "—";
  const fraudScore     = details.fraud_score ?? null;
  const fraudHigh      = fraudScore !== null && fraudScore > 0.65;
  const nextAgent      = details.next_agent || "StrategyAgent";
  const reasoning      = cleanReasoning(details.reasoning || "");

  const log            = details.log || {};
  const causesFound    = log.causes_identified ?? diagnosedCauses.length;

  /* prefer live signals from signal_detection; fall back to what the DB record stored */
  const displaySignals  = liveSignals.length > 0 ? liveSignals : (details.signals || []);
  const signalsAnalyzed = displaySignals.length || log.signals_analyzed || details.signal_count || 0;
  const isStale         = log.signals_analyzed != null && log.signals_analyzed < displaySignals.length;
  const timestamp      = log.timestamp ? new Date(log.timestamp).toLocaleString() : null;

  /* overall confidence = average of cause confidences, or top-level */
  const avgConf = diagnosedCauses.length
    ? diagnosedCauses.reduce((s, c) => s + (c.confidence || 0), 0) / diagnosedCauses.length
    : (details.confidence || 0);

  /* severity from highest-severity cause */
  const sevOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const overallSev = diagnosedCauses.reduce((best, c) => {
    return (sevOrder[c.severity] || 0) > (sevOrder[best] || 0) ? c.severity : best;
  }, details.severity || "MEDIUM");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "0 2px" }}>

      {/* ── Fraud Risk Banner ────────────────────────────── */}
      {fraudHigh && (
        <div style={{
          background: "#fde8e8", border: "1px solid #f5c2c2", borderLeft: "5px solid #c0392b",
          borderRadius: 10, padding: "14px 20px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 20, color: "#c0392b" }}>&#9888;</span>
          <div>
            <div style={{ fontWeight: 700, color: "#9e3a2f", fontSize: 14 }}>
              Fraud Risk Detected — Score: {Math.round(fraudScore * 100)}%
            </div>
            <div style={{ fontSize: 12, color: "#b94040", marginTop: 2 }}>
              Fraud score exceeds threshold (65%). Escalation and manual review required.
            </div>
          </div>
        </div>
      )}

      {/* ── Summary Cards ─────────────────────────────────── */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .5, marginBottom: 14 }}>
          Diagnosis Summary
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <StatCard
            label="Overall Severity"
            value={overallSev}
            accent={SEV[overallSev]?.dot || "#e67e22"}
          />
          <StatCard
            label="Causes Identified"
            value={causesFound}
            sub={`from ${signalsAnalyzed} signal${signalsAnalyzed !== 1 ? "s" : ""}`}
            accent="#3b82f6"
          />
          <StatCard
            label="Avg Confidence"
            value={`${Math.round(avgConf * 100)}%`}
            accent="#8b5cf6"
          />
          {fraudScore !== null && (
            <StatCard
              label="Fraud Score"
              value={`${Math.round(fraudScore * 100)}%`}
              sub={fraudHigh ? "HIGH RISK" : "within range"}
              accent={fraudHigh ? "#c0392b" : "#27ae60"}
            />
          )}
          <StatCard
            label="Next Agent"
            value={nextAgent}
            accent="#64748b"
          />
        </div>
      </div>

      {/* ── Primary Cause Highlight ────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #1e293b 0%, #2d3f55 100%)",
        borderRadius: 12, padding: "18px 20px",
        display: "flex", alignItems: "flex-start", gap: 14,
      }}>
        <div style={{ background: "#c0392b", borderRadius: 10, padding: "10px 12px", flexShrink: 0 }}>
          <span style={{ fontSize: 20, color: "#fff" }}>&#128270;</span>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 6 }}>
            Primary Root Cause
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc", lineHeight: 1.4 }}>
            {primaryCause}
          </div>
        </div>
      </div>

      {/* ── Diagnosed Causes ──────────────────────────────── */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .5, marginBottom: 14 }}>
          Root Cause Analysis ({diagnosedCauses.length})
        </div>
        {diagnosedCauses.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>No causes identified.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {diagnosedCauses.map((cause, i) => (
              <CauseCard
                key={i}
                cause={cause}
                index={i}
                isPrimary={cause.cause === primaryCause || i === 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Signals from Signal Detection ─────────────────── */}
      {displaySignals.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .5 }}>
              Signals Feeding Diagnosis ({displaySignals.length})
            </div>
            {isStale && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                background: "#fff7e6", color: "#7a5200", border: "1px solid #f5dfa0",
              }}>
                &#9888; Diagnosis ran on {log.signals_analyzed} signals — {displaySignals.length} now active
              </span>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {displaySignals.map((sig, i) => {
              const sev = SEV[sig.severity] || SEV.LOW;
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px", borderRadius: 8,
                  background: sev.bg, border: `1px solid ${sev.border}`,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: sev.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: sev.color, flex: 1 }}>
                    {sig.type?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                  <SevBadge severity={sig.severity} />
                  {sig.change_pct && (
                    <span style={{ fontSize: 12, color: sev.color, fontWeight: 600 }}>
                      {sig.change_pct > 0 ? "+" : ""}{parseFloat(sig.change_pct).toFixed(1)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Reasoning ─────────────────────────────────────── */}
      {reasoning && (
        <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>
            Agent Reasoning
          </div>
          <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, margin: 0 }}>{reasoning}</p>
        </div>
      )}

      {/* ── Log Footer ────────────────────────────────────── */}
      {Object.keys(log).length > 0 && (
        <div style={{
          background: "#1e293b", borderRadius: 10, padding: "14px 18px",
          display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center",
        }}>
          {timestamp && (
            <div>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: .5 }}>Timestamp</div>
              <div style={{ fontSize: 12, color: "#e2e8f0", marginTop: 2 }}>{timestamp}</div>
            </div>
          )}
          {signalsAnalyzed > 0 && (
            <div>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: .5 }}>Signals Analyzed</div>
              <div style={{ fontSize: 12, color: "#e2e8f0", marginTop: 2 }}>{signalsAnalyzed}</div>
            </div>
          )}
          {causesFound > 0 && (
            <div>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: .5 }}>Causes Identified</div>
              <div style={{ fontSize: 12, color: "#e2e8f0", marginTop: 2 }}>{causesFound}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: .5 }}>Agent</div>
            <div style={{ fontSize: 12, color: "#e2e8f0", marginTop: 2 }}>{details.agent || "DiagnosisAgent"}</div>
          </div>
        </div>
      )}

    </div>
  );
}
