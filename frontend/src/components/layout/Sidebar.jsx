import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const role = user?.memberships?.[0]?.role;

  const allLinks = [
    { path: "/dashboard", label: "Dashboard", roles: ["OWNER", "MANAGER", "RECEPTIONIST", "ACCOUNTANT", "HOUSEKEEPER", "MAINTENANCE"] },
    { path: "/guests", label: "Guests", roles: ["OWNER", "MANAGER", "RECEPTIONIST"] },
    { path: "/reservations", label: "Reservations", roles: ["OWNER", "MANAGER", "RECEPTIONIST"] },
    { path: "/rooms", label: "Rooms", roles: ["OWNER", "MANAGER", "RECEPTIONIST", "HOUSEKEEPER", "MAINTENANCE"] },
    { path: "/room-types", label: "Room Types", roles: ["OWNER", "MANAGER"] },
    { path: "/housekeeping", label: "Housekeeping", roles: ["OWNER", "MANAGER", "HOUSEKEEPER"] },
    { path: "/maintenance", label: "Maintenance", roles: ["OWNER", "MANAGER", "MAINTENANCE"] },
    { path: "/billing", label: "Billing", roles: ["OWNER", "MANAGER", "ACCOUNTANT"] },
    { path: "/reports", label: "Reports", roles: ["OWNER", "MANAGER", "ACCOUNTANT"] },
    { path: "/staff", label: "Staff", roles: ["OWNER", "MANAGER"] },
  ];

  const visibleLinks = allLinks.filter((link) =>
    link.roles.includes(role)
  );

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">StayCore</div>

      <nav className="sidebar-nav">
        {visibleLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <small>
          {role ? role.replace("_", " ") : "User"} · v0.1
        </small>
      </div>
    </aside>
  );
}