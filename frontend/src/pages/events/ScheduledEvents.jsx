import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "../room-types/RoomTypes.css";

const asList = (data) => (Array.isArray(data) ? data : data.results || []);

const formatDateTime = (value) => new Date(value).toLocaleString(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function ScheduledEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/events/");
      setEvents(asList(response.data));
    } catch (err) {
      setError(err.response?.data || err.message || "Failed to load scheduled events.");
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
          <h1>Event Management</h1>
          <p>Schedule events, assign venues, track participants, and manage event charges.</p>
        </div>
        <div className="room-types-actions">
          <button className="btn-ghost small" disabled={loading} onClick={load}>{loading ? "Refreshing…" : "Refresh"}</button>
          <button className="btn" onClick={() => navigate("/events/new")}>Schedule Event</button>
        </div>
      </div>

      {loading && <div className="room-types-loading">Loading events…</div>}
      {error && <div className="room-types-error">{typeof error === "string" ? error : JSON.stringify(error)}</div>}
      {!loading && !error && events.length === 0 && <div className="room-types-empty">No events scheduled yet.</div>}

      {!loading && !error && events.length > 0 && (
        <div className="room-types-table-wrap">
          <table className="room-types-table">
            <thead><tr><th>Event</th><th>Venue</th><th>Schedule</th><th>Participants</th><th>Charges</th><th>Status</th></tr></thead>
            <tbody>{events.map((event) => (
              <tr key={event.id} role="button" tabIndex={0} onClick={() => navigate(`/events/${event.id}/edit`)} onKeyDown={(keyEvent) => {
                if (keyEvent.key === "Enter" || keyEvent.key === " ") {
                  keyEvent.preventDefault();
                  navigate(`/events/${event.id}/edit`);
                }
              }}>
                <td data-label="Event">{event.name}</td>
                <td data-label="Venue">{event.venue}</td>
                <td data-label="Schedule">{formatDateTime(event.start_at)} – {formatDateTime(event.end_at)}</td>
                <td data-label="Participants">{event.participants?.length || 0}</td>
                <td data-label="Charges">{Number(event.charge_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td data-label="Status">{event.status}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
