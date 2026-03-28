import React from "react";

function toStatusLabel(mode) {
  const key = String(mode || "pending").toLowerCase();
  if (key === "applied") {
    return "Applied";
  }
  if (key === "recommended") {
    return "Recommended";
  }
  return "Pending";
}

export default function ExecutionPanel({ execution, executionMode }) {
  const emailPreview = execution?.notifications?.email || null;
  const slackEnabled = execution?.notifications?.slack === true;

  return (
    <section className="card stagger-in">
      <div className="section-header-row">
        <h3>Alerts and Execution</h3>
        <span className={`execution-badge execution-${executionMode}`}>{toStatusLabel(executionMode)}</span>
      </div>

      <div className="execution-grid">
        <article>
          <h4>Execution Status</h4>
          <p>
            {executionMode === "applied"
              ? "Action has been applied to target infrastructure."
              : executionMode === "recommended"
                ? "Action is recommended and awaiting operator approval."
                : "Execution remains pending until decision gates are met."}
          </p>
          <p className="muted-text">
            Deployment ID: {execution?.deployment_id || "N/A"}
          </p>
        </article>

        <article>
          <h4>Slack Notification</h4>
          <p>{slackEnabled ? "Delivered to configured channel." : "No Slack message triggered."}</p>
        </article>

        <article>
          <h4>Email Preview</h4>
          {emailPreview ? (
            <div className="email-preview">
              <p><strong>Subject:</strong> {emailPreview.subject}</p>
              <p><strong>Body:</strong> {emailPreview.body}</p>
            </div>
          ) : (
            <p>No email preview available.</p>
          )}
        </article>
      </div>
    </section>
  );
}
