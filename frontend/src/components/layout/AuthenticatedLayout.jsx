import { useState } from "react";
import Sidebar from "./Sidebar";
import AppHeader from "./AppHeader";
import "./shell.css";

export default function AuthenticatedLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-is-open" : ""}`}>
      <Sidebar isOpen={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="app-main">
        <AppHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
