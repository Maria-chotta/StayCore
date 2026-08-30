import { useAuth } from "../context/useAuth";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({ children }) {
  const { user } = useAuth();
  const token = localStorage.getItem("access_token");
  const location = useLocation();

  const isAuthenticated = Boolean(user) || Boolean(token);

  if (!isAuthenticated) {
    // redirect to login, preserve current location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
