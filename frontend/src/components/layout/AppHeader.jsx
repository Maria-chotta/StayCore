import { Bell, ChevronDown, Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import "./shell.css";

const pageNames = {
  "/dashboard": "Dashboard",
  "/portfolio": "Portfolio",
  "/reservations": "Reservations", "/rooms": "Rooms",
  "/room-types": "Room Types", "/guests": "Guests", "/housekeeping": "Housekeeping",
  "/maintenance": "Maintenance", "/billing": "Billing", "/reports": "Reports", "/staff": "Staff",
};

export default function AppHeader({ onToggleSidebar }) {
  const { user, activeHotel } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const displayName = user?.first_name || user?.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const hotelName = activeHotel?.hotel_name || "StayCore Hotel";

  return (
    <header className="app-header">
      <div className="header-leading"><button className="menu-btn" onClick={onToggleSidebar} aria-label="Open navigation"><Menu size={21} /></button><div><div className="eyebrow">{hotelName}</div><h1>{pageNames[location.pathname] || "Workspace"}</h1></div></div>
      <div className="header-actions"><button className="icon-button notification-button" aria-label="Notifications"><Bell size={19} /><span /></button><div className="header-property"><span className="property-dot" />{hotelName}</div><button className="header-profile" onClick={() => navigate("/staff")}><div className="avatar">{initials}</div><div className="header-user"><strong>{displayName}</strong><span>{activeHotel?.role ? activeHotel.role.replaceAll("_", " ") : "Team member"}</span></div><ChevronDown size={16} /></button></div>
    </header>
  );
}
