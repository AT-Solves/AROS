import React from "react";
import "../styles/theme.css";

export default function Layout({ sidebar, children }) {
  return (
    <div className="aros-app-shell">
      <aside className="aros-sidebar">{sidebar}</aside>
      <main className="aros-main">{children}</main>
    </div>
  );
}

