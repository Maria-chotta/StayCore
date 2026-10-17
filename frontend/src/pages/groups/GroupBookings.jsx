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

export default function GroupBookings() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/groups/");
      setGroups(asList(response.data));
    } catch (err) {
      setError(err.response?.data || err.message || "Failed to load group bookings.");
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
          <h1>Groups</h1>
          <p>Track group bookings, event blocks, and group arrivals.</p>
        </div>
        <div className="room-types-actions">
          <button className="btn-ghost small" disabled={loading} onClick={load}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button className="btn" onClick={() => navigate("/groups/new")}>Create Group</button>
        </div>
      </div>

      {loading && <div className="room-types-loading">Loading groups…</div>}
      {error && <div className="room-types-error">{typeof error === "string" ? error : JSON.stringify(error)}</div>}
      {!loading && !error && groups.length === 0 && <div className="room-types-empty">No groups yet.</div>}

      {!loading && !error && groups.length > 0 && (
        <div className="room-types-table-wrap">
          <table className="room-types-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Group size</th>
                <th>Dates</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr
                  key={group.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/groups/${group.id}/edit`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/groups/${group.id}/edit`);
                    }
                  }}
                >
                  <td data-label="Name">{group.name}</td>
                  <td data-label="Contact">{group.contact_name || "—"}<br />{group.contact_phone || ""}</td>
                  <td data-label="Group size">{group.group_size}</td>
                  <td data-label="Dates">{formatDate(group.start_date)} – {formatDate(group.end_date)}</td>
                  <td data-label="Status">{group.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
