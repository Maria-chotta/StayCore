import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Building2, ArrowRight } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/useAuth";

export default function PortfolioOverview() {
  const { setAppMode, setActiveHotel } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setAppMode("portfolio");
    let mounted = true;

    async function load() {
      try {
        const response = await api.get("/portfolio/overview/");
        if (mounted) {
          setProperties(response.data.properties || []);
        }
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.detail || "Unable to load portfolio overview.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [setAppMode]);

  const openProperty = (hotelId) => {
    if (!setActiveHotel(String(hotelId))) {
      return;
    }
    setAppMode("property");
    navigate("/dashboard");
  };

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header-row">
        <div>
          <div className="eyebrow">Portfolio overview</div>
          <h1>Portfolio performance</h1>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <div className="dashboard-loading"><span className="spinner" /><span>Loading portfolio…</span></div>
      ) : (
        <div className="dashboard-grid dashboard-grid--wide">
          <section className="dashboard-panel summary-panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">Authorized properties</div>
                <h2>{properties.length}</h2>
              </div>
              <BarChart3 size={22} />
            </div>
          </section>

          <section className="dashboard-panel summary-panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">Active mode</div>
                <h2>Portfolio</h2>
              </div>
              <Building2 size={22} />
            </div>
          </section>

          {properties.map((property) => (
            <section className="dashboard-panel" key={property.hotel_id}>
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">{property.status}</div>
                  <h2>{property.hotel_name}</h2>
                </div>
                <button className="panel-link" onClick={() => openProperty(property.hotel_id)}>
                  Open property <ArrowRight size={14} />
                </button>
              </div>

              <div className="summary-grid compact-grid">
                <div className="summary-card summary-card--mint">
                  <div className="summary-title">Role</div>
                  <div className="summary-value">{property.role || "Member"}</div>
                </div>
                <div className="summary-card summary-card--warm">
                  <div className="summary-title">Occupancy</div>
                  <div className="summary-value">{property.occupancy}%</div>
                </div>
                <div className="summary-card summary-card--violet">
                  <div className="summary-title">Reservations</div>
                  <div className="summary-value">{property.reservations}</div>
                </div>
                <div className="summary-card summary-card--slate">
                  <div className="summary-title">Alerts</div>
                  <div className="summary-value">{property.alerts}</div>
                </div>
              </div>
            </section>
          ))}

          {!properties.length && !loading && (
            <section className="dashboard-panel">
              <div className="reservations-empty">
                <Building2 size={22} />
                <strong>No authorized properties</strong>
                <span>You do not currently have any active hotel memberships for portfolio view.</span>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
