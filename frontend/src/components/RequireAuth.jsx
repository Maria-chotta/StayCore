import { useAuth } from "../context/useAuth";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({ children }) {
  const { user } = useAuth();
  const token = localStorage.getItem("access_token");
  const location = useLocation();

  const isAuthenticated = Boolean(user) || Boolean(token);
  const needsHotelSetup = isAuthenticated && Array.isArray(user?.memberships) && user.memberships.length === 0;

  if (!isAuthenticated) {
    // redirect to login, preserve current location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (needsHotelSetup) {
    return <Navigate to="/properties/onboarding" state={{ from: location }} replace />;
  }

  return children;
}
