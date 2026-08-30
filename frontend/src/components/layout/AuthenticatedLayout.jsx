import { useState } from "react";
import Sidebar from "./Sidebar";
import AppHeader from "./AppHeader";
import "./shell.css";

export default function AuthenticatedLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-main">
        <AppHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}
