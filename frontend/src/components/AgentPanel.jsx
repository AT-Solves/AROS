import React from "react";

function formatValue(value) {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (value == null || value === "") {
    return "N/A";
  }
  return String(value);
}

function buildSummary(details) {
  if (!details || typeof details !== "object") {
    return ["No output is available for this stage yet."];
  }

  const summaryLines = [];
  const entries = Object.entries(details).slice(0, 5);
  entries.forEach(([key, value]) => {
    if (Array.isArray(value)) {
      summaryLines.push(`${key}: ${value.length} item(s)`);
      return;
    }
    if (value && typeof value === "object") {
      summaryLines.push(`${key}: ${Object.keys(value).length} field(s)`);
      return;
    }
    summaryLines.push(`${key}: ${formatValue(value)}`);
  });

  if (summaryLines.length === 0) {
    summaryLines.push("No output fields were returned.");
  }
  return summaryLines;
}

export default function AgentPanel({ stage, stageMeta, details, tableSummaries }) {
  const stageInfo = stageMeta[stage] || {
    title: "Agent",
    description: "No stage metadata available.",
    workflow: [],
    inputSources: []
  };

  const inputPreview = {
    data_sources: stageInfo.inputSources,
    available_tables: Object.keys(tableSummaries || {}),
    table_summaries: tableSummaries || {}
  };

  return (
    <section className="agent-panel-grid stagger-in">
      <article className="card">
        <h3>{stageInfo.title}</h3>
        <p className="muted-text">{stageInfo.description}</p>
        <h4>What this workflow does</h4>
        <ul className="workflow-list">
          {stageInfo.workflow.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </article>

      <article className="card">
        <h3>Input</h3>
        <p className="muted-text">Data sources and the structured context provided to this stage.</p>
        <pre className="json-preview">{JSON.stringify(inputPreview, null, 2)}</pre>
      </article>

      <article className="card">
        <h3>Output</h3>
        <p className="muted-text">Human-readable summary before deep raw data inspection.</p>
        <ul className="summary-list">
          {buildSummary(details).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <details className="raw-json-collapsible">
          <summary>View raw JSON</summary>
          <pre className="json-preview">{JSON.stringify(details || {}, null, 2)}</pre>
        </details>
      </article>
    </section>
  );
}