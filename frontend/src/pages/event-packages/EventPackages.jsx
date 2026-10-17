import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "../room-types/RoomTypes.css";

const asList = (data) => (Array.isArray(data) ? data : data.results || []);

export default function EventPackages() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/event-packages/");
      setPackages(asList(response.data));
    } catch (err) {
      setError(err.response?.data || err.message || "Failed to load event packages.");
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
          <h1>Event Packages</h1>
          <p>Bundle Wedding, conference, and special event offers by property.</p>
        </div>
        <div className="room-types-actions">
          <button className="btn-ghost small" disabled={loading} onClick={load}>{loading ? "Refreshing…" : "Refresh"}</button>
          <button className="btn" onClick={() => navigate("/event-packages/new")}>Create Package</button>
        </div>
      </div>

      {loading && <div className="room-types-loading">Loading event packages…</div>}
      {error && <div className="room-types-error">{typeof error === "string" ? error : JSON.stringify(error)}</div>}
      {!loading && !error && packages.length === 0 && <div className="room-types-empty">No event packages yet.</div>}

      {!loading && !error && packages.length > 0 && (
        <div className="room-types-table-wrap">
          <table className="room-types-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Capacity</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((item) => (
                <tr key={item.id} role="button" tabIndex={0} onClick={() => navigate(`/event-packages/${item.id}/edit`)} onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/event-packages/${item.id}/edit`);
                  }
                }}>
                  <td data-label="Name">{item.name}</td>
                  <td data-label="Capacity">{item.capacity}</td>
                  <td data-label="Price">{Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td data-label="Status">{item.is_active ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
