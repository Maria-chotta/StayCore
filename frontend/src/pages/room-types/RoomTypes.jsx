import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./RoomTypes.css";

const asList = (data) => (Array.isArray(data) ? data : data.results || []);

export default function RoomTypes() {
  const navigate = useNavigate(); const [types, setTypes] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { const response = await api.get("/room-types/"); setTypes(asList(response.data)); } catch (err) { setError(err.response?.data || err.message || "Failed to load room types."); } finally { setLoading(false); } }, []);
  useEffect(() => { Promise.resolve().then(load); }, [load]);
  return <div className="room-types-root"><div className="room-types-header"><div><h1>Room Types</h1><p>Manage the room categories available to your properties.</p></div><div className="room-types-actions"><button className="btn-ghost small" disabled={loading} onClick={load}>{loading ? "Refreshing…" : "Refresh"}</button><button className="btn" onClick={() => navigate("/room-types/new")}>Create Room Type</button></div></div>{loading && <div className="room-types-loading">Loading room types…</div>}{error && <div className="room-types-error">{typeof error === "string" ? error : JSON.stringify(error)}</div>}{!loading && !error && types.length === 0 && <div className="room-types-empty">No room types are available.</div>}{!loading && !error && types.length > 0 && <div className="room-types-table-wrap"><table className="room-types-table"><thead><tr><th>Name</th><th>Max occupancy</th><th>Base price</th><th>Active</th><th>Updated</th></tr></thead><tbody>{types.map((type) => <tr key={type.id} role="button" tabIndex={0} onClick={() => navigate(`/room-types/${type.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate(`/room-types/${type.id}`); } }}><td data-label="Name">{type.name}</td><td data-label="Max occupancy">{type.max_occupancy}</td><td data-label="Base price">{Number(type.base_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td data-label="Active">{type.is_active ? "Active" : "Inactive"}</td><td data-label="Updated">{type.updated_at ? new Date(type.updated_at).toLocaleString() : "—"}</td></tr>)}</tbody></table></div>}</div>;
}
