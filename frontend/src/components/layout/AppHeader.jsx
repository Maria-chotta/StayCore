// header for authenticated app shell
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import "./shell.css";

export default function AppHeader({ onToggleSidebar }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="app-header">
      <button className="menu-btn" onClick={onToggleSidebar} aria-label="Toggle menu">☰</button>

      <div className="header-title">StayCore</div>

      <div className="header-actions">
        <span className="header-user">{user?.email}</span>
        <button onClick={handleLogout} className="btn-ghost small">Logout</button>
      </div>
    </header>
  );
}
