import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const localDate = (value) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const errorMessage = (error) => {
  const data = error.response?.data;
  if (typeof data === "string") return data;
  if (data?.detail) return data.detail;
  if (data) return Object.entries(data).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`).join(" · ");
  return error.message || "The request failed.";
};

export default function AvailabilityMatrix() {
  const [startDate, setStartDate] = useState(() => localDate(new Date()));
  const [dayCount, setDayCount] = useState(14);
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/rooms/availability/", {
        params: { start_date: startDate, days: dayCount },
      });
      setMatrix(response.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [startDate, dayCount]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const totals = useMemo(() => (matrix?.room_types || []).reduce((result, roomType) => {
    roomType.days.forEach((day) => {
      result.available += day.available;
      result.reserved += day.reserved;
      result.unavailable += day.unavailable;
    });
    return result;
  }, { available: 0, reserved: 0, unavailable: 0 }), [matrix]);

  return (
    <section className="finance-page availability-page">
      <header className="finance-header">
        <div><span className="finance-eyebrow">ROOM INVENTORY</span><h1>Availability Matrix</h1><p>Room availability by date, room type, and reservation status.</p></div>
        <button className="btn-ghost" type="button" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
      </header>
      <section className="finance-card availability-controls">
        <label>Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label>Range<select value={dayCount} onChange={(event) => setDayCount(Number(event.target.value))}><option value={7}>7 days</option><option value={14}>14 days</option><option value={31}>31 days</option></select></label>
        <div className="availability-legend"><span><i className="availability-dot available" />Available</span><span><i className="availability-dot reserved" />Reserved</span><span><i className="availability-dot unavailable" />Out of service</span></div>
      </section>
      {error && <div className="finance-alert" role="alert">{error}</div>}
      {!loading && matrix && <div className="finance-metrics">
        <article className="finance-metric"><span>Available room-nights</span><strong>{totals.available}</strong></article>
        <article className="finance-metric"><span>Reserved room-nights</span><strong>{totals.reserved}</strong></article>
        <article className="finance-metric"><span>Unavailable room-nights</span><strong>{totals.unavailable}</strong></article>
      </div>}
      <section className="finance-card availability-table-card">
        {loading ? <p className="finance-empty">Loading room availability…</p> : !matrix?.room_types.length ? <p className="finance-empty">No active room types or rooms are available for this property.</p> : (
          <>
            <div className="finance-card-heading"><div><h2>Daily room availability</h2><p>Available rooms exclude reserved and out-of-service inventory.</p></div></div>
            <div className="availability-table-scroll"><table className="finance-table availability-table">
              <thead><tr><th className="availability-room-heading">Room type</th><th>Total</th>{matrix.dates.map((date) => <th key={date}>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</th>)}</tr></thead>
              <tbody>{matrix.room_types.map((roomType) => <tr key={roomType.room_type_id}>
                <td className="availability-room-name"><strong>{roomType.room_type_name}</strong><span>{roomType.total_rooms} rooms</span></td>
                <td>{roomType.total_rooms}</td>
                {roomType.days.map((day) => {
                  const statusDescription = Object.entries(day.reservation_statuses || {}).map(([status, count]) => `${status.replaceAll("_", " ")} ${count}`).join(", ");
                  return <td key={day.date}><div className="availability-cell" title={statusDescription || "No reservations"}>
                    <strong>{day.available} free</strong>
                    <span>{day.reserved} reserved</span>
                    {day.unavailable > 0 && <span className="availability-unavailable-count">{day.unavailable} out</span>}
                  </div></td>;
                })}
              </tr>)}</tbody>
            </table></div>
          </>
        )}
      </section>
    </section>
  );
}
