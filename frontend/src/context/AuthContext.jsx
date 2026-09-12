import { useEffect, useMemo, useState } from "react";
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

function getValidHotel(user, hotelId) {
  if (!user || !Array.isArray(user.memberships)) {
    return null;
  }

  if (!hotelId) {
    return user.memberships[0] || null;
  }

  const membership = user.memberships.find((m) => String(m.hotel) === String(hotelId));
  return membership || user.memberships[0] || null;
}

export function AuthProvider({ children }) {
  const savedUser = getSavedUser();
  const [user, setUser] = useState(savedUser);
  const [appMode, setAppModeState] = useState(() => {
    const storedMode = localStorage.getItem("app_mode");
    return storedMode === "portfolio" ? "portfolio" : "property";
  });
  const [selectedHotelId, setSelectedHotelIdState] = useState(() => {
    const stored = localStorage.getItem("active_hotel_id");
    const valid = getValidHotel(savedUser, stored);
    return valid ? String(valid.hotel) : "";
  });

  const activeHotelId = useMemo(() => {
    const currentUser = user || savedUser;
    const nextHotel = getValidHotel(currentUser, selectedHotelId);
    return nextHotel ? String(nextHotel.hotel) : "";
  }, [savedUser, selectedHotelId, user]);

  useEffect(() => {
    if (activeHotelId) {
      localStorage.setItem("active_hotel_id", activeHotelId);
    } else {
      localStorage.removeItem("active_hotel_id");
    }
  }, [activeHotelId]);

  const activeHotel = useMemo(() => {
    if (!user || !Array.isArray(user.memberships)) {
      return null;
    }

    const membership = user.memberships.find((m) => String(m.hotel) === String(activeHotelId));
    return membership || user.memberships[0] || null;
  }, [user, activeHotelId]);

  const setAppMode = (nextMode) => {
    const nextModeValue = nextMode === "portfolio" ? "portfolio" : "property";
    localStorage.setItem("app_mode", nextModeValue);
    setAppModeState(nextModeValue);
  };

  const persistUser = (nextUser) => {
    if (!nextUser) {
      localStorage.removeItem("user");
      setUser(null);
      localStorage.removeItem("active_hotel_id");
      setSelectedHotelIdState("");
      return null;
    }

    localStorage.setItem("user", JSON.stringify(nextUser));
    setUser(nextUser);

    const memberships = Array.isArray(nextUser.memberships) ? nextUser.memberships : [];
    const validActiveHotel = memberships.find((m) => String(m.hotel) === String(selectedHotelId));
    const nextHotelId = validActiveHotel ? String(validActiveHotel.hotel) : memberships[0] ? String(memberships[0].hotel) : "";

    if (nextHotelId) {
      localStorage.setItem("active_hotel_id", nextHotelId);
      setSelectedHotelIdState(nextHotelId);
    } else {
      localStorage.removeItem("active_hotel_id");
      setSelectedHotelIdState("");
    }

    return nextUser;
  };

  const setActiveHotel = (hotelId) => {
    const membership = user?.memberships?.find((m) => String(m.hotel) === String(hotelId));

    if (!membership) {
      return false;
    }

    localStorage.setItem("active_hotel_id", String(hotelId));
    setSelectedHotelIdState(String(hotelId));
    return true;
  };

  const updateHotelMemberships = (hotel) => {
    const currentUser = user || getSavedUser();

    if (!currentUser) {
      return null;
    }

    const currentMemberships = Array.isArray(currentUser.memberships) ? [...currentUser.memberships] : [];
    const hasHotel = currentMemberships.some((m) => String(m.hotel) === String(hotel.id));

    if (!hasHotel) {
      currentMemberships.unshift({
        hotel: hotel.id,
        hotel_name: hotel.name,
        role: hotel.role || "OWNER",
      });
    }

    const nextUser = {
      ...currentUser,
      memberships: currentMemberships,
    };

    persistUser(nextUser);
    return nextUser;
  };

  const login = async (email, password) => {
    const response = await api.post("/auth/login/", {
      email,
      password,
    });

    localStorage.setItem("access_token", response.data.access);
    localStorage.setItem("refresh_token", response.data.refresh);
    localStorage.setItem("token", response.data.access);

    const loggedInUser = response.data.user;
    localStorage.setItem("user_email", loggedInUser.email);

    const nextUser = persistUser(loggedInUser);

    return { ...response.data, user: nextUser };
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user");
    localStorage.removeItem("active_hotel_id");

    setUser(null);
    setSelectedHotelIdState("");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeHotel,
        activeHotelId,
        appMode,
        setAppMode,
        setActiveHotel,
        updateHotelMemberships,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
