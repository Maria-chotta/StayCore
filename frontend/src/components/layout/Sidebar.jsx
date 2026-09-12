import {
  BarChart3,
  BedDouble,
  Building2,
  ClipboardList,
  ConciergeBell,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

const sections = [
  { label: "Operations", links: [
    { path: "/reservations", label: "Reservations", icon: ClipboardList, roles: ["OWNER", "MANAGER", "RECEPTIONIST"] },
    { path: "/rooms", label: "Rooms", icon: BedDouble, roles: ["OWNER", "MANAGER", "RECEPTIONIST", "HOUSEKEEPER", "MAINTENANCE"] },
    { path: "/room-types", label: "Room Types", icon: Building2, roles: ["OWNER", "MANAGER"] },
    { path: "/guests", label: "Guests", icon: Users, roles: ["OWNER", "MANAGER", "RECEPTIONIST"] },
  ]},
  { label: "Housekeeping", links: [
    { path: "/housekeeping", label: "Housekeeping", icon: ConciergeBell, roles: ["OWNER", "MANAGER", "HOUSEKEEPER"] },
    { path: "/maintenance", label: "Maintenance", icon: Wrench, roles: ["OWNER", "MANAGER", "MAINTENANCE"] },
  ]},
  { label: "Finance", links: [
    { path: "/billing", label: "Billing", icon: FileBarChart, roles: ["OWNER", "MANAGER", "ACCOUNTANT"] },
    { path: "/reports", label: "Reports", icon: FileBarChart, roles: ["OWNER", "MANAGER", "ACCOUNTANT"] },
  ]},
  { label: "Management", links: [
    { path: "/staff", label: "Staff", icon: Users, roles: ["OWNER", "MANAGER"] },
  ]},
];

export default function Sidebar({ isOpen, onNavigate }) {
  const { user, activeHotel, logout } = useAuth();
  const navigate = useNavigate();
  const role = activeHotel?.role || user?.role || "";
  const displayName = user?.first_name || user?.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <aside className={`app-sidebar ${isOpen ? "is-open" : ""}`}>
      <div className="sidebar-topline">
        <div className="sidebar-brand-mark">S</div>
        <div><strong>STAYCORE</strong><span>Hotel Management</span></div>
        <button className="sidebar-close" onClick={onNavigate} aria-label="Close navigation"><X size={18} /></button>
      </div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        <NavLink to="/dashboard" onClick={onNavigate} className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
          <LayoutDashboard size={18} /><span>Dashboard</span>
        </NavLink>
        <NavLink to="/portfolio" onClick={onNavigate} className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
          <BarChart3 size={18} /><span>Portfolio</span>
        </NavLink>
        {sections.map((section) => {
          const links = section.links.filter((link) => link.roles.includes(role));
          if (!links.length) return null;
          return <div className="nav-section" key={section.label}>
            <div className="nav-section-label">{section.label}</div>
            {links.map(({ path, label, icon: Icon }) => (
              <NavLink key={path} to={path} onClick={onNavigate} className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
                <Icon size={18} /><span>{label}</span>
              </NavLink>
            ))}
          </div>;
        })}
      </nav>
      <div className="sidebar-footer">
        <div className="profile-row"><div className="avatar avatar--small">{initials}</div><div className="profile-copy"><strong>{displayName}</strong><span>{role ? role.replaceAll("_", " ") : "Team member"}</span></div><button className="logout-button" onClick={() => { logout(); onNavigate?.(); navigate("/login", { replace: true }); }} aria-label="Logout"><LogOut size={17} /></button></div>
      </div>
    </aside>
  );
}