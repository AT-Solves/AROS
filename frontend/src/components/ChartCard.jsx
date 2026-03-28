import React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar
} from "recharts";

function EmptyState({ label }) {
  return <p className="empty-state">{label}</p>;
}

function ChartBlock({ title, children }) {
  return (
    <article className="card chart-card stagger-in">
      <h3>{title}</h3>
      {children}
    </article>
  );
}

export default function ChartCard({ trendSeries, simulationSeries }) {
  return (
    <section className="chart-grid">
      <ChartBlock title="Revenue and Conversion Trend">
        {trendSeries.length === 0 ? (
          <EmptyState label="No KPI trend data available yet." />
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dce5dc" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#2f6f4f" strokeWidth={2.5} />
              <Line yAxisId="right" type="monotone" dataKey="conversion" stroke="#74a78d" strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartBlock>

      <ChartBlock title="Latency and Payment Failure Indicators">
        {trendSeries.length === 0 ? (
          <EmptyState label="No latency or failure indicators available." />
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dce5dc" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="latency" stroke="#8d654f" strokeWidth={2.5} />
              <Line yAxisId="right" type="monotone" dataKey="paymentFailure" stroke="#b56f54" strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartBlock>

      <ChartBlock title="Simulation Outcome Comparison">
        {simulationSeries.length === 0 ? (
          <EmptyState label="No simulation outputs returned." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={simulationSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dce5dc" />
              <XAxis dataKey="scenario" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenueChange" fill="#2f6f4f" radius={[8, 8, 0, 0]} />
              <Bar dataKey="conversionChange" fill="#86baa1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartBlock>
    </section>
  );
}