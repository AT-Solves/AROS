import React from "react";

function fmt(value, decimals = 2) {
  if (value == null || value === "") return "N/A";
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(decimals);
  }
  return String(value);
}

function fmtLarge(value) {
  if (value == null) return "N/A";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value}`;
}

function pctChange(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function DeltaBadge({ current, previous, lowerIsBetter = false }) {
  const delta = pctChange(current, previous);
  if (delta == null) return null;
  const positive = lowerIsBetter ? delta < 0 : delta > 0;
  const negative = lowerIsBetter ? delta > 0 : delta < 0;
  const style = {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 999,
    background: positive ? "#e6f2ec" : negative ? "#fde8e8" : "#f0f0f0",
    color: positive ? "#2f6f4f" : negative ? "#9e3a2f" : "#666",
  };
  const arrow = delta > 0 ? "▲" : "▼";
  return (
    <span style={style}>
      {arrow} {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

function KpiRow({ label, current, previous, format = "number", lowerIsBetter = false }) {
  const displayCurrent =
    format === "currency" ? fmtLarge(current) : format === "pct" ? `${fmt(current)}%` : fmt(current);
  const displayPrevious =
    format === "currency" ? fmtLarge(previous) : format === "pct" ? `${fmt(previous)}%` : fmt(previous);

  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: 13 }}>{label}</td>
      <td style={{ padding: "10px 12px", fontWeight: 600 }}>{displayCurrent}</td>
      <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>{displayPrevious}</td>
      <td style={{ padding: "10px 12px" }}>
        <DeltaBadge current={current} previous={previous} lowerIsBetter={lowerIsBetter} />
      </td>
    </tr>
  );
}

function SlopeIndicator({ value, lowerIsBetter = false }) {
  if (value == null) return <span style={{ color: "var(--text-muted)" }}>N/A</span>;
  const positive = lowerIsBetter ? value < 0 : value > 0;
  const negative = lowerIsBetter ? value > 0 : value < 0;
  const color = positive ? "#2f6f4f" : negative ? "#9e3a2f" : "#666";
  const label = value > 0 ? `▲ +${value.toFixed(4)}` : value < 0 ? `▼ ${value.toFixed(4)}` : "→ Flat";
  return <span style={{ color, fontWeight: 600, fontSize: 13 }}>{label}</span>;
}

export default function IngestionPanel({ details }) {
  const kpi = details?.kpi || {};
  const current = kpi.current || {};
  const previous = kpi.previous || {};
  const behavior = details?.behavior || {};
  const orders = details?.orders || {};
  const cart = details?.cart || {};
  const fraud = details?.fraud || {};
  const trends = details?.trends || {};
  const distribution = details?.distribution || {};
  const meta = details?.meta || {};

  const hasData = !!details && Object.keys(details).length > 0;

  if (!hasData) {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        <p className="muted-text">No ingestion data available yet. Run the pipeline to populate this section.</p>
      </div>
    );
  }

  const tableHeaderStyle = {
    padding: "8px 12px",
    textAlign: "left",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text-muted)",
    borderBottom: "2px solid var(--border)",
    background: "var(--bg-accent)",
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* ── KPI Comparison ── */}
      <article className="card">
        <h3 style={{ marginBottom: 4 }}>KPI Metrics — Current vs Previous</h3>
        <p className="muted-text" style={{ marginBottom: 14, fontSize: 13 }}>
          Baseline window split: first half = previous, second half = current.
          {meta.records_processed != null && ` ${meta.records_processed} total records processed.`}
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Metric</th>
                <th style={tableHeaderStyle}>Current</th>
                <th style={tableHeaderStyle}>Previous</th>
                <th style={tableHeaderStyle}>Change</th>
              </tr>
            </thead>
            <tbody>
              <KpiRow label="Revenue" current={current.revenue} previous={previous.revenue} format="currency" />
              <KpiRow
                label="Conversion Rate"
                current={current.conversion_rate}
                previous={previous.conversion_rate}
                format="pct"
              />
              <KpiRow
                label="Cart Abandonment Rate"
                current={current.cart_abandonment_rate}
                previous={previous.cart_abandonment_rate}
                format="pct"
                lowerIsBetter
              />
              <KpiRow
                label="Avg Latency (ms)"
                current={current.latency_ms}
                previous={previous.latency_ms}
                format="number"
                lowerIsBetter
              />
              <KpiRow
                label="Payment Failure Rate"
                current={current.payment_failure_rate}
                previous={previous.payment_failure_rate}
                format="pct"
                lowerIsBetter
              />
              <KpiRow label="Records in Window" current={current.records} previous={previous.records} />
            </tbody>
          </table>
        </div>
      </article>

      {/* ── Domain Metrics Grid ── */}
      <article className="card">
        <h3 style={{ marginBottom: 14 }}>Domain Metrics</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {/* Behavior */}
          <div
            style={{
              background: "var(--bg-accent)",
              borderRadius: 12,
              padding: 14,
              border: "1px solid var(--border)",
            }}
          >
            <p
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--primary)",
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              User Behavior
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              <MetricRow label="Total Events" value={fmt(behavior.total_events, 0)} />
              <MetricRow label="Avg Latency" value={`${fmt(behavior.avg_latency)} ms`} />
              <MetricRow label="Drop Actions" value={fmt(behavior.drop_actions, 0)} />
            </div>
          </div>

          {/* Orders */}
          <div
            style={{
              background: "var(--bg-accent)",
              borderRadius: 12,
              padding: 14,
              border: "1px solid var(--border)",
            }}
          >
            <p
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--primary)",
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              Order Fulfillment
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              <MetricRow label="Total Orders" value={fmt(orders.total_orders, 0)} />
              <MetricRow label="Conversion Rate" value={`${fmt(orders.conversion_rate)}%`} />
              <MetricRow label="Total Revenue" value={fmtLarge(orders.total_revenue)} />
            </div>
          </div>

          {/* Cart */}
          <div
            style={{
              background: "var(--bg-accent)",
              borderRadius: 12,
              padding: 14,
              border: "1px solid var(--border)",
            }}
          >
            <p
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--primary)",
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              Cart Abandonment
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              <MetricRow label="Abandonment Rate" value={`${fmt(cart.abandonment_rate)}%`} />
              <MetricRow label="Total Events" value={fmt(cart.events, 0)} />
            </div>
          </div>

          {/* Fraud */}
          <div
            style={{
              background: "var(--bg-accent)",
              borderRadius: 12,
              padding: 14,
              border: "1px solid var(--border)",
            }}
          >
            <p
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#9e3a2f",
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              Risk / Fraud
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              <MetricRow label="Fraud Cases" value={fmt(fraud.fraud_cases, 0)} />
            </div>
          </div>
        </div>
      </article>

      {/* ── Trends + Distribution side-by-side ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {/* Trends */}
        <article className="card">
          <h3 style={{ marginBottom: 4 }}>Trends (Linear Slope)</h3>
          <p className="muted-text" style={{ marginBottom: 14, fontSize: 13 }}>
            Positive slope = rising over time.
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Revenue</p>
              <SlopeIndicator value={trends.revenue_slope} />
            </div>
            <div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Conversion Rate</p>
              <SlopeIndicator value={trends.conversion_slope} />
            </div>
            <div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Latency</p>
              <SlopeIndicator value={trends.latency_slope} lowerIsBetter />
            </div>
          </div>
        </article>

        {/* Distribution */}
        <article className="card">
          <h3 style={{ marginBottom: 14 }}>Distribution (Percentiles)</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Metric</th>
                <th style={tableHeaderStyle}>P10</th>
                <th style={tableHeaderStyle}>P50</th>
                <th style={tableHeaderStyle}>P90</th>
              </tr>
            </thead>
            <tbody>
              <DistRow
                label="Revenue"
                dist={distribution.revenue}
                format="currency"
              />
              <DistRow
                label="Conversion Rate"
                dist={distribution.conversion_rate}
                format="pct"
              />
              <DistRow
                label="Latency (ms)"
                dist={distribution.latency}
              />
            </tbody>
          </table>
        </article>
      </div>

      {/* ── Meta ── */}
      {meta.timestamp_utc && (
        <article className="card" style={{ padding: "12px 18px" }}>
          <div style={{ display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              <strong>Records processed:</strong> {fmt(meta.records_processed, 0)}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              <strong>Ingestion timestamp:</strong> {new Date(meta.timestamp_utc).toLocaleString()}
            </span>
          </div>
        </article>
      )}
    </div>
  );
}

function MetricRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function DistRow({ label, dist, format }) {
  const fmt2 = (v) => {
    if (v == null) return "N/A";
    if (format === "currency") return fmtLarge(v);
    if (format === "pct") return `${v.toFixed(2)}%`;
    return v.toFixed(1);
  };
  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: 13 }}>{label}</td>
      <td style={{ padding: "8px 12px", fontSize: 13 }}>{fmt2(dist?.p10)}</td>
      <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 600 }}>{fmt2(dist?.p50)}</td>
      <td style={{ padding: "8px 12px", fontSize: 13 }}>{fmt2(dist?.p90)}</td>
    </tr>
  );
}
