import React, { useState } from "react";

// ─── Design tokens (match theme) ────────────────────────────────────────────
const T = {
  card: "#ffffff",
  cardAlt: "#f4f7f1",
  border: "#d7e2d8",
  primary: "#2f6f4f",
  primarySoft: "#e6f2ec",
  text: "#1a2e22",
  muted: "#5a7a65",
};

// ─── Alert signal types (operational → notify, don't approve) ───────────────
const ALERT_TYPES = new Set([
  "latency_spike",
  "user_latency_high",
  "payment_failures_high",
  "cart_abandonment_high",
  "user_drop_off_high",
]);

// ─── Human-readable signal labels ───────────────────────────────────────────
const SIGNAL_LABELS = {
  revenue_drop: "Revenue Drop",
  conversion_drop: "Conversion Drop",
  latency_spike: "Latency Spike",
  payment_failures_high: "Payment Failures High",
  cart_abandonment_high: "Cart Abandonment High",
  user_latency_high: "User Latency High",
  user_drop_off_high: "User Drop-off High",
  order_conversion_low: "Order Conversion Low",
};

// ─── Severity palette ────────────────────────────────────────────────────────
function severityPalette(severity) {
  if (severity === "HIGH") return { bg: "#fdecea", color: "#b02020", border: "#f5c6cb" };
  if (severity === "MEDIUM") return { bg: "#fffbea", color: "#b08b00", border: "#ffe082" };
  return { bg: T.primarySoft, color: T.primary, border: T.border };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatChange(changePct) {
  if (typeof changePct === "number") {
    const sign = changePct > 0 ? "+" : "";
    return `${sign}${changePct.toFixed(1)}%`;
  }
  return changePct === "threshold_breach" ? "Threshold breach" : String(changePct || "—");
}

function changeColor(changePct, type) {
  if (typeof changePct !== "number") return T.muted;
  // For alert types, upward spikes are bad
  if (ALERT_TYPES.has(type)) return changePct > 0 ? "#b02020" : T.primary;
  return changePct < 0 ? "#b02020" : "#b08b00";
}

function buildReason(signal) {
  const metric = signal.metric?.replace(/_/g, " ") || "metric";
  if (typeof signal.change_pct === "number") {
    const dir = signal.change_pct > 0 ? "increased" : "dropped";
    return `${metric.charAt(0).toUpperCase() + metric.slice(1)} ${dir} by ${Math.abs(signal.change_pct).toFixed(1)}% — current: ${signal.current_value ?? "—"}, previous: ${signal.previous_value ?? "—"}.`;
  }
  return `${metric.charAt(0).toUpperCase() + metric.slice(1)} exceeded threshold at ${signal.current_value ?? "—"}.`;
}

function policyItemToText(item) {
  if (item == null) return "Unknown policy detail";
  if (typeof item === "string") return item;
  if (typeof item === "number" || typeof item === "boolean") return String(item);

  if (typeof item === "object") {
    const parts = [
      item.code,
      item.policy,
      item.rule,
      item.name,
      item.role,
      item.message,
      item.reason,
      item.description,
      item.required_by,
      item.requiredBy,
    ]
      .filter((v) => v !== undefined && v !== null && String(v).trim() !== "")
      .map((v) => String(v).trim());

    if (parts.length > 0) {
      return parts.join(" - ");
    }

    try {
      return JSON.stringify(item);
    } catch {
      return "Unrecognized policy detail";
    }
  }

  return String(item);
}

function normalizePolicyItems(value) {
  if (!Array.isArray(value)) return [];
  return value.map(policyItemToText).filter(Boolean);
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && w.length >= 4);
}

function unique(arr) {
  return [...new Set(arr)];
}

function metricAliases(metric) {
  const m = String(metric || "").toLowerCase();
  const aliases = new Set([m]);
  if (m === "latency_ms") aliases.add("avg_latency");
  if (m === "avg_latency") aliases.add("latency_ms");
  if (m === "cart_abandonment_rate") aliases.add("abandonment_rate");
  if (m === "abandonment_rate") aliases.add("cart_abandonment_rate");
  return aliases;
}

function isViolationRelevantToSignal(signal, violation) {
  const signalMetricAliases = metricAliases(signal?.metric);
  const violationMetric = String(violation?.metric || "").toLowerCase();

  // Strongest mapping: explicit metric match from backend violation payload.
  if (violationMetric && signalMetricAliases.has(violationMetric)) {
    return true;
  }

  const signalType = String(signal?.type || "").toLowerCase();
  const signalText = `${signalType} ${String(signal?.metric || "")}`.toLowerCase();
  const violationText = JSON.stringify(violation || {}).toLowerCase();

  // Fraud policy usually maps to payment/fraud-related signals.
  if (String(violation?.rule || "").toLowerCase() === "fraud_threshold") {
    return signalText.includes("payment") || signalText.includes("fraud");
  }

  // Fallback: keyword overlap between violation payload and signal descriptors.
  return tokenize(violationText).some((kw) => signalText.includes(kw));
}

function buildSignalDecisionContext(signal, context) {
  const decision = context?.decision || {};
  const diagnosisRows = context?.diagnosis?.diagnosed_causes || [];
  const strategyRows = context?.strategy?.strategies || [];
  const simulation = context?.simulation || {};

  const signalKeywords = unique([
    ...tokenize(signal?.type),
    ...tokenize(signal?.metric),
  ]);

  const relatedCauses = diagnosisRows.filter((cause) => {
    const affectedMetric = String(cause?.affected_metric || "").toLowerCase();
    if (affectedMetric && String(signal?.metric || "").toLowerCase() === affectedMetric) {
      return true;
    }
    const causeText = `${cause?.cause || ""} ${(cause?.evidence || []).join(" ")}`.toLowerCase();
    return signalKeywords.some((kw) => causeText.includes(kw));
  });

  const causeKeywords = unique(relatedCauses.flatMap((c) => tokenize(`${c?.cause || ""} ${(c?.evidence || []).join(" ")}`)));
  const allKeywords = unique([...signalKeywords, ...causeKeywords]);

  const matchedStrategies = strategyRows.filter((s) => {
    const text = `${s?.action_type || ""} ${s?.description || ""} ${s?.rationale || ""}`.toLowerCase();
    return allKeywords.some((kw) => text.includes(kw));
  });

  const selectedAction = String(decision?.action_type || decision?.selected_action || "").toLowerCase();
  const selectedForSignal = matchedStrategies.some((s) => String(s?.action_type || "").toLowerCase() === selectedAction);

  const signalDecision = selectedForSignal
    ? String(decision?.decision || "INVESTIGATE").toUpperCase()
    : matchedStrategies.length > 0
      ? "INVESTIGATE"
      : "MONITOR";

  const strategyConfidence = matchedStrategies.length > 0 ? Math.max(...matchedStrategies.map((s) => Number(s?.confidence || 0))) : null;
  const decisionConfidence = Number(decision?.confidence || 0);
  const signalConfidence = Math.max(Number(signal?.confidence || 0), strategyConfidence || 0, decisionConfidence || 0);

  const primaryCause = relatedCauses[0] || null;
  const riskLevel =
    (primaryCause?.severity && String(primaryCause.severity).toUpperCase()) ||
    String(decision?.risk_level || decision?.blast_radius || signal?.severity || "UNKNOWN").toUpperCase();

  const reason = primaryCause?.cause || buildReason(signal);

  const governance = decision?.governance_check || {};
  const rawViolations = Array.isArray(governance?.violations)
    ? governance.violations
    : Array.isArray(decision?.violations)
      ? decision.violations
      : [];

  const relevantViolations = rawViolations.filter((v) => isViolationRelevantToSignal(signal, v));

  const policyViolationDetails = relevantViolations.map((v) => {
    const violationMetric = String(v?.metric || "").toLowerCase();
    const metricMatch = violationMetric
      ? metricAliases(signal?.metric).has(violationMetric)
      : false;
    return {
      text: policyItemToText(v),
      metric: violationMetric || null,
      metricMatch,
    };
  });

  const policyViolations = policyViolationDetails.map((v) => v.text);

  const rawApprovals =
    governance?.required_approvals ||
    decision?.requires_human_approval ||
    [];
  const requiresApproval = normalizePolicyItems(
    relevantViolations.length > 0 || selectedForSignal ? rawApprovals : []
  );

  const policyOk = policyViolations.length === 0;
  const simulationMatched = simulation?.action_type && matchedStrategies.some((s) => s.action_type === simulation.action_type);

  const strategySuggested = matchedStrategies.map((s) => ({
    label: String(s?.action_type || "").replace(/_/g, " "),
    source: "strategy",
  }));

  const fallbackBySignal = {
    payment_failure_rate: ["fraud mitigation", "investigate payments", "payment gateway failover"],
    latency_ms: ["infrastructure optimization", "autoscale services", "performance profiling"],
    cart_abandonment_rate: ["improve checkout", "apply discount", "abandonment retargeting"],
    abandonment_rate: ["improve checkout", "apply discount", "abandonment retargeting"],
    conversion_rate: ["optimize conversion funnel", "improve checkout", "targeted offer"],
  };

  const fallbackActions = fallbackBySignal[String(signal?.metric || "").toLowerCase()] || ["investigate issue", "monitor trend"];

  const suggestedActions = unique([
    ...strategySuggested.map((x) => x.label),
    ...fallbackActions,
  ]).slice(0, 5);

  return {
    signalDecision,
    signalConfidence,
    riskLevel,
    reason,
    policyViolations,
    policyViolationDetails,
    requiresApproval,
    policyOk,
    selectedForSignal,
    matchedStrategies,
    simulationMatched,
    suggestedActions,
  };
}

function buildSlackMessage(signal) {
  const label = SIGNAL_LABELS[signal.type] || signal.type;
  const conf = signal.confidence != null ? `${Math.round(signal.confidence * 100)}%` : "—";
  const reason = buildReason(signal);
  return [
    `:warning: *AROS Alert — ${label}*`,
    `> *Metric:* ${signal.metric?.replace(/_/g, " ")}`,
    `> *Current Value:* ${signal.current_value ?? "—"}`,
    `> *Severity:* ${signal.severity}`,
    `> *Confidence:* ${conf}`,
    ``,
    reason,
    ``,
    `Please review the AROS dashboard and take immediate action.`,
  ].join("\n");
}

function buildEmailDraft(signal) {
  const label = SIGNAL_LABELS[signal.type] || signal.type;
  const conf = signal.confidence != null ? `${Math.round(signal.confidence * 100)}%` : "—";
  const reason = buildReason(signal);
  return [
    `Subject: AROS Alert — ${label} Detected`,
    ``,
    `Dear Team,`,
    ``,
    `The AROS Autonomous Revenue Optimization System has detected the following anomaly:`,
    ``,
    `  Metric       : ${signal.metric?.replace(/_/g, " ")}`,
    `  Current Value: ${signal.current_value ?? "—"}`,
    `  Severity     : ${signal.severity}`,
    `  Confidence   : ${conf}`,
    ``,
    `Details: ${reason}`,
    ``,
    `Action Required:`,
    `Please log in to the AROS dashboard to review and respond to this alert.`,
    ``,
    `Regards,`,
    `AROS — Autonomous Revenue Optimization System`,
  ].join("\n");
}

// ─── Icons ───────────────────────────────────────────────────────────────────
function ChevronIcon({ open }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16" fill="none"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Suggested message block ──────────────────────────────────────────────────
function SuggestedMessage({ msgType, message, isCopied, onCopy }) {
  const isSlack = msgType === "slack";
  const accentColor = isSlack ? "#4a154b" : "#1a73e8";
  const label = isSlack ? "Slack Message" : "Email Draft";
  const icon = isSlack ? "💬" : "✉️";

  return (
    <div style={{ marginTop: 10, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 14px", background: T.cardAlt, borderBottom: `1px solid ${T.border}`,
      }}>
        <span style={{ fontSize: "0.76rem", fontWeight: 600, color: T.muted }}>
          {icon} Suggested {label}
        </span>
        <button
          type="button"
          onClick={onCopy}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "3px 11px", border: `1px solid ${isCopied ? accentColor : T.border}`,
            borderRadius: 4, cursor: "pointer", fontSize: "0.74rem", fontWeight: 600,
            background: isCopied ? accentColor : T.card,
            color: isCopied ? "#fff" : T.muted, transition: "all 0.15s",
          }}
        >
          {isCopied ? <CheckIcon /> : <CopyIcon />}
          {isCopied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre style={{
        margin: 0, padding: "12px 14px", fontSize: "0.77rem", color: T.text,
        lineHeight: 1.65, whiteSpace: "pre-wrap", fontFamily: "'Courier New', Courier, monospace",
        background: T.card, overflowX: "auto",
      }}>
        {message}
      </pre>
    </div>
  );
}

// ─── Action button ─────────────────────────────────────────────────────────────
function ActionBtn({ label, icon, phase, activeColor, activeBg, onClick, disabled }) {
  const isDone = phase === "done";
  const isLoading = phase === "loading";
  return (
    <button
      type="button"
      disabled={disabled || isLoading || isDone}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 18px", borderRadius: 7, fontWeight: 600, fontSize: "0.84rem",
        cursor: disabled || isLoading || isDone ? "default" : "pointer",
        transition: "all 0.15s",
        border: `1px solid ${isDone ? activeColor : T.border}`,
        background: isDone ? activeBg : T.card,
        color: isDone ? activeColor : T.text,
        opacity: isLoading ? 0.65 : 1,
      }}
    >
      {isLoading ? "…" : isDone ? `✓ ${label}` : `${icon ?? ""} ${label}`.trim()}
    </button>
  );
}

// ─── Individual signal row ──────────────────────────────────────────────────
function SignalRow({ signal, decision, diagnosis, strategy, simulation, isExpanded, onToggle }) {
  const isAlert = ALERT_TYPES.has(signal.type);
  const label = SIGNAL_LABELS[signal.type] || signal.type?.replace(/_/g, " ");
  const sev = severityPalette(signal.severity);
  const signalCtx = buildSignalDecisionContext(signal, { decision, diagnosis, strategy, simulation });
  const conf = signalCtx.signalConfidence != null ? `${Math.round(signalCtx.signalConfidence * 100)}%` : "—";
  const confFraction = signalCtx.signalConfidence ?? 0;

  const [actions, setActions] = useState({});  // { approve: null|"loading"|"done" }
  const [copied, setCopied] = useState({});     // { slack: bool, email: bool }
  const [showMsg, setShowMsg] = useState(null); // "slack" | "email" | null

  const slack = buildSlackMessage(signal);
  const email = buildEmailDraft(signal);
  const reason = signalCtx.reason;

  const policyViolations = signalCtx.policyViolations;
  const policyViolationDetails = signalCtx.policyViolationDetails || [];
  const requiresApproval = signalCtx.requiresApproval;
  const policyOk = signalCtx.policyOk;
  const suggestedActions = signalCtx.suggestedActions || [];

  function fireAction(key) {
    setActions((p) => ({ ...p, [key]: "loading" }));
    setTimeout(() => {
      setActions((p) => ({ ...p, [key]: "done" }));
      setTimeout(() => setActions((p) => ({ ...p, [key]: null })), 2800);
    }, 700);
  }

  function copyText(text, key) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied((p) => ({ ...p, [key]: true }));
    setTimeout(() => setCopied((p) => ({ ...p, [key]: false })), 2200);
  }

  return (
    <div style={{
      border: `1px solid ${isExpanded ? T.primary : T.border}`,
      borderRadius: 10, overflow: "hidden",
      transition: "border-color 0.2s, box-shadow 0.2s",
      boxShadow: isExpanded ? `0 0 0 3px ${T.primarySoft}` : "none",
      background: T.card,
    }}>
      {/* ── Collapsed header row ── */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", background: isExpanded ? T.primarySoft : T.card,
          border: "none", cursor: "pointer", textAlign: "left",
          transition: "background 0.15s",
        }}
      >
        {/* Alert / Signal type pill */}
        <span style={{
          fontSize: "0.66rem", fontWeight: 800, padding: "2px 8px", borderRadius: 3,
          background: isAlert ? "#fdecea" : T.primarySoft,
          color: isAlert ? "#b02020" : T.primary,
          letterSpacing: "0.07em", flexShrink: 0, textTransform: "uppercase",
        }}>
          {isAlert ? "ALERT" : "SIGNAL"}
        </span>

        {/* Name */}
        <span style={{ fontSize: "0.88rem", fontWeight: 600, color: T.text, flex: 1 }}>
          {label}
        </span>

        {/* Metric monospace tag */}
        <span style={{
          fontSize: "0.72rem", color: T.muted, fontFamily: "monospace",
          background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 4,
          padding: "2px 7px", display: "none",
        }}
          className="sig-metric"
        >
          {signal.metric?.replace(/_/g, "_")}
        </span>

        {/* Change */}
        <span style={{
          fontSize: "0.82rem", fontWeight: 700,
          color: changeColor(signal.change_pct, signal.type),
          minWidth: 80, textAlign: "right", flexShrink: 0,
        }}>
          {formatChange(signal.change_pct)}
        </span>

        {/* Severity badge */}
        <span style={{
          background: sev.bg, color: sev.color, border: `1px solid ${sev.border}`,
          borderRadius: 4, padding: "2px 9px", fontSize: "0.7rem", fontWeight: 700,
          minWidth: 58, textAlign: "center", flexShrink: 0,
        }}>
          {signal.severity || "—"}
        </span>

        {/* Confidence mini-bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 72, flexShrink: 0 }}>
          <div style={{ flex: 1, height: 4, background: T.border, borderRadius: 2 }}>
            <div style={{
              width: `${confFraction * 100}%`, height: "100%",
              background: T.primary, borderRadius: 2, transition: "width 0.3s",
            }} />
          </div>
          <span style={{ fontSize: "0.7rem", color: T.muted }}>{conf}</span>
        </div>

        {/* Chevron */}
        <span style={{ color: T.muted, flexShrink: 0, display: "flex", alignItems: "center" }}>
          <ChevronIcon open={isExpanded} />
        </span>
      </button>

      {/* ── Expanded content ── */}
      {isExpanded && (
        <div style={{ borderTop: `1px solid ${T.border}`, padding: "20px 20px 18px" }}>

          {/* Metric detail row */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: T.cardAlt, border: `1px solid ${T.border}`,
            borderRadius: 5, padding: "4px 12px", marginBottom: 16,
          }}>
            <span style={{ fontSize: "0.72rem", color: T.muted }}>metric</span>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: T.text, fontFamily: "monospace" }}>
              {signal.metric}
            </span>
          </div>

          {/* KV grid: Decision / Confidence / Risk / Current / Previous */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Decision", value: signalCtx.signalDecision || "N/A", accent: true },
              { label: "Confidence", value: conf },
              { label: "Risk Level", value: signalCtx.riskLevel || signal.severity || "—" },
              { label: "Current Value", value: signal.current_value != null ? String(signal.current_value) : "—" },
              { label: "Previous Value", value: signal.previous_value != null ? String(signal.previous_value) : "—" },
            ].map(({ label, value, accent }) => (
              <div key={label} style={{
                background: T.cardAlt, border: `1px solid ${T.border}`,
                borderRadius: 7, padding: "10px 14px",
              }}>
                <div style={{ fontSize: "0.68rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: accent ? T.primary : T.text }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Reason */}
          <div style={{
            padding: "10px 14px", background: T.cardAlt, border: `1px solid ${T.border}`,
            borderRadius: 7, marginBottom: 10,
          }}>
            <div style={{ fontSize: "0.68rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
              Reason
            </div>
            <div style={{ fontSize: "0.86rem", color: T.text, lineHeight: 1.55 }}>{reason}</div>
          </div>

          {/* Policy Check */}
          <div style={{
            padding: "10px 14px",
            background: policyOk ? T.primarySoft : "#fdecea",
            border: `1px solid ${policyOk ? T.border : "#f5c6cb"}`,
            borderRadius: 7, marginBottom: 20,
          }}>
            <div style={{ fontSize: "0.68rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
              Policy Check
            </div>
            {policyOk ? (
              <div style={{ fontSize: "0.86rem", fontWeight: 600, color: T.primary }}>
                {requiresApproval.length
                  ? `Requires approval from: ${requiresApproval.join(", ")}`
                  : "✓ No policy violations"}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#b02020" }}>
                  {policyViolations.length} violation{policyViolations.length > 1 ? "s" : ""}
                </div>
                {policyViolationDetails.map((item, idx) => (
                  <div
                    key={`${item.text}-${idx}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "1px solid #f5c6cb",
                      background: "#fff5f5",
                    }}
                  >
                    <span style={{ fontSize: "0.8rem", color: "#8e1f1f", lineHeight: 1.35 }}>
                      {item.text}
                    </span>
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        borderRadius: 999,
                        padding: "2px 8px",
                        border: `1px solid ${item.metricMatch ? "#9fd5b4" : "#f0b9b9"}`,
                        background: item.metricMatch ? "#ebf8f0" : "#fdeaea",
                        color: item.metricMatch ? "#226b49" : "#9b2c2c",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {item.metric ? (item.metricMatch ? `metric match: ${item.metric}` : `metric: ${item.metric}`) : "no metric"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Suggested Actions */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: "0.68rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Suggested Actions
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {suggestedActions.map((action) => (
                <span
                  key={action}
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: T.text,
                    background: T.cardAlt,
                    border: `1px solid ${T.border}`,
                    borderRadius: 999,
                    padding: "5px 10px",
                    textTransform: "capitalize",
                  }}
                >
                  {action}
                </span>
              ))}
            </div>
          </div>

          {/* ── Actions ── */}
          {isAlert ? (
            /* Alert path → notify team */
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                Notify Team
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setShowMsg((p) => (p === "slack" ? null : "slack"))}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "8px 18px", borderRadius: 7, fontWeight: 600, fontSize: "0.84rem",
                    cursor: "pointer", transition: "all 0.15s",
                    border: `1px solid ${showMsg === "slack" ? "#4a154b" : T.border}`,
                    background: showMsg === "slack" ? "#4a154b" : T.card,
                    color: showMsg === "slack" ? "#fff" : T.text,
                  }}
                >
                  💬 Slack
                </button>
                <button
                  type="button"
                  onClick={() => setShowMsg((p) => (p === "email" ? null : "email"))}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "8px 18px", borderRadius: 7, fontWeight: 600, fontSize: "0.84rem",
                    cursor: "pointer", transition: "all 0.15s",
                    border: `1px solid ${showMsg === "email" ? "#1a73e8" : T.border}`,
                    background: showMsg === "email" ? "#1a73e8" : T.card,
                    color: showMsg === "email" ? "#fff" : T.text,
                  }}
                >
                  ✉️ Email
                </button>
              </div>

              {showMsg === "slack" && (
                <SuggestedMessage
                  msgType="slack"
                  message={slack}
                  isCopied={!!copied.slack}
                  onCopy={() => copyText(slack, "slack")}
                />
              )}
              {showMsg === "email" && (
                <SuggestedMessage
                  msgType="email"
                  message={email}
                  isCopied={!!copied.email}
                  onCopy={() => copyText(email, "email")}
                />
              )}
            </div>
          ) : (
            /* Decision path → approve / reject / re-simulate */
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                Actions
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ActionBtn
                  label="Approve"
                  icon="✓"
                  phase={actions.approve}
                  activeColor={T.primary}
                  activeBg={T.primarySoft}
                  onClick={() => fireAction("approve")}
                />
                <ActionBtn
                  label="Reject"
                  icon="✕"
                  phase={actions.reject}
                  activeColor="#b02020"
                  activeBg="#fdecea"
                  onClick={() => fireAction("reject")}
                />
                <ActionBtn
                  label="Simulate Again"
                  icon="↻"
                  phase={actions.simulate}
                  activeColor="#b08b00"
                  activeBg="#fffbea"
                  onClick={() => fireAction("simulate")}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Filter pill ──────────────────────────────────────────────────────────────
function FilterPill({ label, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "4px 14px", borderRadius: 20, fontWeight: 600, fontSize: "0.77rem",
        cursor: "pointer", transition: "all 0.15s",
        border: `1px solid ${active ? T.primary : T.border}`,
        background: active ? T.primarySoft : T.card,
        color: active ? T.primary : T.muted,
      }}
    >
      {label} <span style={{ fontWeight: 400 }}>({count})</span>
    </button>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────
const FILTERS = ["ALL", "HIGH", "MEDIUM", "LOW"];

export default function ActionCenterSignals({ signals, decision, diagnosis, strategy, simulation }) {
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState("ALL");

  const counts = {
    ALL: signals?.length || 0,
    HIGH: signals?.filter((s) => s.severity === "HIGH").length || 0,
    MEDIUM: signals?.filter((s) => s.severity === "MEDIUM").length || 0,
    LOW: signals?.filter((s) => s.severity === "LOW").length || 0,
  };

  const filtered = (signals || []).filter((s) => filter === "ALL" || s.severity === filter);

  if (!signals?.length) {
    return (
      <div style={{ padding: "28px 0", textAlign: "center", color: T.muted, fontSize: "0.9rem" }}>
        No signals detected in the current pipeline run.
      </div>
    );
  }

  return (
    <div>
      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <FilterPill
            key={f}
            label={f}
            count={counts[f]}
            active={filter === f}
            onClick={() => setFilter(f)}
          />
        ))}
        <span style={{ marginLeft: "auto", fontSize: "0.74rem", color: T.muted, alignSelf: "center" }}>
          Click a row to expand details
        </span>
      </div>

      {/* Signal rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "20px 0", textAlign: "center", color: T.muted, fontSize: "0.85rem" }}>
            No {filter} severity signals.
          </div>
        ) : (
          filtered.map((signal, idx) => {
            const rowId = signal.type || String(idx);
            return (
              <SignalRow
                key={rowId}
                signal={signal}
                decision={decision}
                diagnosis={diagnosis}
                strategy={strategy}
                simulation={simulation}
                isExpanded={expandedId === rowId}
                onToggle={() => setExpandedId((prev) => (prev === rowId ? null : rowId))}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
