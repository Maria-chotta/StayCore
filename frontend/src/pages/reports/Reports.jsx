import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "./Reports.css";

const asList = (data) => Array.isArray(data) ? data : data?.results || [];
const display = (value) => String(value || "—").replaceAll("_", " ");
const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const reportOptions = ["Reservations", "Rooms", "Guests", "Maintenance", "Housekeeping", "Billing"];

function exportCsv(name, headers, rows) {
  const text = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" })); link.download = `${name}.csv`; link.click(); URL.revokeObjectURL(link.href);
}
export default function Reports() {
  const [type, setType] = useState("Reservations"); const [status, setStatus] = useState(""); const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [data, setData] = useState({ rooms: [], reservations: [], guests: [], maintenance: [], housekeeping: [], folios: [] });
  const load = useCallback(async () => { setLoading(true); setError(""); try {
    const [roomsRes, reservationsRes, guestsRes, maintenanceRes, housekeepingRes, foliosRes] = await Promise.all([api.get("/rooms/"), api.get("/reservations/"), api.get("/guests/"), api.get("/maintenance/"), api.get("/housekeeping/"), api.get("/folios/")]);
    const rooms = asList(roomsRes.data); const guests = asList(guestsRes.data); const hotelIds = new Set([...rooms.map((item) => String(item.hotel)), ...guests.map((item) => String(item.hotel))]);
    setData({ rooms, reservations: asList(reservationsRes.data), guests, maintenance: asList(maintenanceRes.data).filter((item) => hotelIds.has(String(item.hotel))), housekeeping: asList(housekeepingRes.data).filter((item) => hotelIds.has(String(item.hotel))), folios: asList(foliosRes.data).filter((item) => hotelIds.has(String(item.hotel))) });
  } catch (err) { setError(typeof err.response?.data === "string" ? err.response.data : "Reports data could not be loaded."); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const roomMap = useMemo(() => new Map(data.rooms.map((item) => [String(item.id), item])), [data.rooms]);
  const guestMap = useMemo(() => new Map(data.guests.map((item) => [String(item.id), item])), [data.guests]);
  const reservationMap = useMemo(() => new Map(data.reservations.map((item) => [String(item.id), item])), [data.reservations]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase(); let list = []; let headers = [];
    if (type === "Reservations") { headers = ["Reservation", "Guest", "Room", "Hotel", "Check-in", "Check-out", "Status"]; list = data.reservations.map((item) => [item.id, item.guest_details ? `${item.guest_details.first_name} ${item.guest_details.last_name}` : `Guest #${item.guest}`, item.room_details?.room_number || `Room #${item.room}`, `Hotel #${item.hotel}`, item.check_in_date, item.check_out_date, display(item.status)]); }
    if (type === "Rooms") { headers = ["Room", "Room type", "Status", "Hotel", "Floor", "Active"]; list = data.rooms.map((item) => [item.room_number, item.room_type?.name || `Type #${item.room_type}`, display(item.status), `Hotel #${item.hotel}`, item.floor, item.is_active ? "Yes" : "No"]); }
    if (type === "Guests") { headers = ["Guest", "Email", "Phone", "Hotel", "Reservations"]; list = data.guests.map((item) => [`${item.first_name} ${item.last_name}`, item.email, item.phone, `Hotel #${item.hotel}`, data.reservations.filter((reservation) => String(reservation.guest) === String(item.id)).length]); }
    if (type === "Maintenance") { headers = ["Request", "Room", "Priority", "Status", "Assigned staff", "Reported"]; list = data.maintenance.map((item) => [item.title, roomMap.get(String(item.room))?.room_number || (item.room ? `Room #${item.room}` : "—"), display(item.priority), display(item.status), item.assigned_to ? `Staff #${item.assigned_to}` : "Unassigned", item.reported_at]); }
    if (type === "Housekeeping") { headers = ["Task", "Room", "Priority", "Status", "Assigned staff", "Scheduled"]; list = data.housekeeping.map((item) => [display(item.task_type), roomMap.get(String(item.room))?.room_number || `Room #${item.room}`, display(item.priority), display(item.status), item.assigned_to ? `Staff #${item.assigned_to}` : "Unassigned", item.scheduled_for || item.created_at]); }
    if (type === "Billing") { headers = ["Folio", "Guest", "Reservation", "Charges", "Payments", "Balance", "Status"]; list = data.folios.map((item) => { const guest = guestMap.get(String(item.guest)); const reservation = reservationMap.get(String(item.reservation)); return [`#${item.id}`, guest ? `${guest.first_name} ${guest.last_name}` : `Guest #${item.guest}`, reservation ? `#${reservation.id} / ${reservation.room_details?.room_number || `Room #${reservation.room}`}` : `#${item.reservation}`, item.total_charges, item.total_paid, item.balance, display(item.status)]; }); }
    return { headers, list: list.filter((row) => (!status || String(row[row.length - 1]).replaceAll(" ", "_").toUpperCase() === status) && (!q || row.join(" ").toLowerCase().includes(q))) };
  }, [data, guestMap, query, reservationMap, roomMap, status, type]);
  const statusOptions = type === "Reservations" ? ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"] : type === "Rooms" ? ["AVAILABLE", "OCCUPIED", "DIRTY", "CLEANING", "MAINTENANCE", "OUT_OF_ORDER"] : type === "Maintenance" ? ["OPEN", "IN_PROGRESS", "RESOLVED", "CANCELLED"] : type === "Housekeeping" ? ["PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] : type === "Billing" ? ["OPEN", "PARTIALLY_PAID", "PAID", "VOID"] : [];
  const summary = type === "Reservations" ? `${data.reservations.length} reservations across ${Object.keys(data.reservations.reduce((all, item) => ({ ...all, [item.status]: true }), {})).length} statuses` : `${rows.list.length} matching record${rows.list.length === 1 ? "" : "s"}`;
  return <div className="reports-root"><div className="reports-header"><div><h1>Reports</h1><p>Generated from the current data available to your account.</p></div><button className="btn-ghost small" disabled={loading} onClick={load}>{loading ? "Refreshing…" : "Refresh"}</button></div>
    {error && <div className="reports-error">{error} <button className="btn-ghost small" onClick={load}>Try again</button></div>}
    <div className="report-controls"><label>Report<select value={type} onChange={(event) => { setType(event.target.value); setStatus(""); }}><>{reportOptions.map((item) => <option key={item}>{item}</option>)}</></select></label>{statusOptions.length > 0 && <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{statusOptions.map((item) => <option key={item} value={item}>{display(item)}</option>)}</select></label>}<label className="report-search">Search<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter loaded data" /></label><button className="btn" disabled={loading || rows.list.length === 0} onClick={() => exportCsv(type.toLowerCase(), rows.headers, rows.list)}>Export CSV</button></div>
    {!loading && !error && <p className="report-summary">{summary}. Filters apply locally to the already-loaded report data.</p>}
    {loading ? <div className="reports-empty">Loading report…</div> : !error && rows.list.length === 0 ? <div className="reports-empty">No records match this report.</div> : !error && <div className="reports-table-wrap"><table className="reports-table"><thead><tr>{rows.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.list.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td key={rows.headers[cellIndex]} data-label={rows.headers[cellIndex]}>{cell || "—"}</td>)}</tr>)}</tbody></table></div>}
  </div>;
}
