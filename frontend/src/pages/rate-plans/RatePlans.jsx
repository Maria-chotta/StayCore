import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "../room-types/RoomTypes.css";

const asList = (data) => (Array.isArray(data) ? data : data.results || []);

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function RatePlans() {
  const navigate = useNavigate();
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/rate-plans/");
      setRates(asList(response.data));
    } catch (err) {
      setError(err.response?.data || err.message || "Failed to load rate plans.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  return (
    <div className="room-types-root">
      <div className="room-types-header">
        <div>
          <h1>Rate Plans</h1>
          <p>Manage promotional room and package pricing by date and type.</p>
        </div>
        <div className="room-types-actions">
          <button className="btn-ghost small" disabled={loading} onClick={load}>{loading ? "Refreshing…" : "Refresh"}</button>
          <button className="btn" onClick={() => navigate("/rate-plans/new")}>Create Rate Plan</button>
        </div>
      </div>

      {loading && <div className="room-types-loading">Loading rate plans…</div>}
      {error && <div className="room-types-error">{typeof error === "string" ? error : JSON.stringify(error)}</div>}
      {!loading && !error && rates.length === 0 && <div className="room-types-empty">No rate plans yet.</div>}

      {!loading && !error && rates.length > 0 && (
        <div className="room-types-table-wrap">
          <table className="room-types-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Price</th>
                <th>Dates</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => (
                <tr key={rate.id} role="button" tabIndex={0} onClick={() => navigate(`/rate-plans/${rate.id}/edit`)} onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/rate-plans/${rate.id}/edit`);
                  }
                }}>
                  <td data-label="Name">{rate.name}</td>
                  <td data-label="Type">{rate.rate_type}</td>
                  <td data-label="Price">{Number(rate.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td data-label="Dates">{formatDate(rate.start_date)} – {formatDate(rate.end_date)}</td>
                  <td data-label="Status">{rate.is_active ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
