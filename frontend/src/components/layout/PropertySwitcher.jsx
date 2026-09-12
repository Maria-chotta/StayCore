import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronDown, Grid2X2, Plus, BriefcaseBusiness } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

export default function PropertySwitcher() {
  const { user, activeHotel, activeHotelId, appMode, setAppMode, setActiveHotel } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);

  const memberships = useMemo(() => {
    if (!user || !Array.isArray(user.memberships)) {
      return [];
    }

    return [...user.memberships].sort((a, b) => {
      const left = a.hotel_name || "";
      const right = b.hotel_name || "";
      return left.localeCompare(right);
    });
  }, [user]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const currentLabel = appMode === "portfolio" ? "Portfolio" : (activeHotel?.hotel_name || "Select property");
  const currentMeta = appMode === "portfolio"
    ? "Overview"
    : (activeHotel?.role ? activeHotel.role.replaceAll("_", " ") : "Team member");

  const handleSelectHotel = (hotelId) => {
    if (!setActiveHotel(String(hotelId))) {
      setOpen(false);
      return;
    }
    setAppMode("property");
    setOpen(false);

    if (location.pathname === "/portfolio") {
      navigate("/dashboard");
    }
  };

  const handlePortfolio = () => {
    setAppMode("portfolio");
    setOpen(false);
    navigate("/portfolio");
  };

  const handleAddProperty = () => {
    setOpen(false);
    navigate("/properties/onboarding");
  };

  return (
    <div className="property-switcher" ref={containerRef}>
      <button
        type="button"
        className="property-switcher__button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Select property or portfolio context"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="property-switcher__icon">
          {appMode === "portfolio" ? <Grid2X2 size={16} /> : <Building2 size={16} />}
        </span>
        <span className="property-switcher__content">
          <span className="property-switcher__label">{currentLabel}</span>
          <span className="property-switcher__meta">{currentMeta}</span>
        </span>
        <ChevronDown size={16} className={`property-switcher__chevron ${open ? "is-open" : ""}`} />
      </button>

      {open && (
        <div className="property-switcher__menu" role="menu" aria-label="Property switcher">
          <div className="property-switcher__section-label">My properties</div>

          <button
            type="button"
            className={`property-switcher__item ${appMode === "portfolio" ? "is-active" : ""}`}
            onClick={handlePortfolio}
          >
            <span className="property-switcher__item-icon"><BriefcaseBusiness size={15} /></span>
            <span className="property-switcher__item-copy">
              <strong>Portfolio overview</strong>
              <small>Multi-property summary</small>
            </span>
          </button>

          {memberships.length ? memberships.map((membership) => {
            const hotelId = membership.hotel;
            const isSelected = String(hotelId) === String(activeHotelId) && appMode !== "portfolio";

            return (
              <button
                key={hotelId}
                type="button"
                className={`property-switcher__item ${isSelected ? "is-active" : ""}`}
                onClick={() => handleSelectHotel(hotelId)}
              >
                <span className="property-switcher__item-icon"><Building2 size={15} /></span>
                <span className="property-switcher__item-copy">
                  <strong>{membership.hotel_name || "Property"}</strong>
                  <small>{(membership.role || "MEMBER").replaceAll("_", " ")}</small>
                </span>
              </button>
            );
          }) : (
            <div className="property-switcher__empty">No active properties.</div>
          )}

          <div className="property-switcher__divider" />

          <button type="button" className="property-switcher__action" onClick={handleAddProperty}>
            <Plus size={15} />
            Add property
          </button>
        </div>
      )}
    </div>
  );
}
