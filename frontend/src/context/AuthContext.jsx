import { useState } from "react";
import api from "../services/api";
import { AuthContext } from "./AuthContext.js";

function getSavedUser() {
  const savedUser = localStorage.getItem("user");

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const savedUser = getSavedUser();

  const [user, setUser] = useState(savedUser);

  const login = async (email, password) => {
    const response = await api.post("/auth/login/", {
      email,
      password,
    });

    localStorage.setItem("access_token", response.data.access);
    localStorage.setItem("refresh_token", response.data.refresh);

    // Backwards compatibility
    localStorage.setItem("token", response.data.access);

    const loggedInUser = response.data.user;

    localStorage.setItem(
      "user",
      JSON.stringify(loggedInUser)
    );

    localStorage.setItem(
      "user_email",
      loggedInUser.email
    );

    setUser(loggedInUser);

    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user");

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}