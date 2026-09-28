import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, BedDouble, CalendarDays, CheckCircle2, LogIn, LogOut, RefreshCw, Search, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./FrontDesk.css";

const asList = (data) => (Array.isArray(data) ? data : data?.results || []);
const today = () => new Intl.DateTimeFormat("en-CA").format(new Date());
const guestName = (reservation) => `${reservation.guest_details?.first_name || ""} ${reservation.guest_details?.last_name || ""}`.trim() || `Guest #${reservation.guest}`;
const formatDate = (value) => value ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`)) : "—";

function QueueCard({ reservation, action, busy, onAction, onOpen }) {
  const isArrival = action === "check_in";
  const canAct = isArrival ? reservation.status === "CONFIRMED" : reservation.status === "CHECKED_IN";
  return (
    <article className="front-desk-queue-card">
      <div className="front-desk-guest-mark"><UserRound size={18} /></div>
      <div className="front-desk-guest-copy">
        <button className="front-desk-guest-name" onClick={onOpen}>{guestName(reservation)}</button>
        <span>{reservation.guest_details?.email || "Guest record"}</span>
      </div>
      <div className="front-desk-room">
        <small>Room</small>
        <strong>{reservation.room_details?.room_number || "Unassigned"}</strong>
      </div>
      <div className="front-desk-stay">
        <small>{isArrival ? "Arrival" : "Departure"}</small>
        <strong>{formatDate(isArrival ? reservation.check_in_date : reservation.check_out_date)}</strong>
      </div>
      <button className={`front-desk-action ${isArrival ? "front-desk-action--primary" : ""}`} disabled={!canAct || busy} onClick={() => onAction(reservation)}>
        {busy ? "Working…" : isArrival ? <><LogIn size={15} /> Check in</> : <><LogOut size={15} /> Check out</>}
      </button>
    </article>
  );
}

export default function FrontDesk() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [action, setAction] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    setLoading(!isRefresh);
    setRefreshing(isRefresh);
    setError("");
    try {
      const [reservationResponse, roomResponse] = await Promise.all([api.get("/reservations/"), api.get("/rooms/")]);
      setReservations(asList(reservationResponse.data));
      setRooms(asList(roomResponse.data));
    } catch (err) {
      setError(typeof err.response?.data === "string" ? err.response.data : err.message || "Front desk data could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return reservations;
    return reservations.filter((reservation) => `${guestName(reservation)} ${reservation.guest_details?.email || ""} ${reservation.room_details?.room_number || ""}`.toLowerCase().includes(normalized));
  }, [query, reservations]);

  const arrivals = filtered.filter((reservation) => reservation.check_in_date === today() && !["CANCELLED", "NO_SHOW", "CHECKED_OUT"].includes(reservation.status));
  const departures = filtered.filter((reservation) => reservation.check_out_date === today() && ["CONFIRMED", "CHECKED_IN"].includes(reservation.status));
  const readyRooms = rooms.filter((room) => room.status === "AVAILABLE").length;
  const occupiedRooms = rooms.filter((room) => room.status === "OCCUPIED").length;

  async function runAction(reservation, actionName) {
    setAction(`${reservation.id}:${actionName}`);
    setError("");
    try {
      await api.post(`/reservations/${reservation.id}/${actionName}/`);
      const fresh = await api.get("/reservations/");
      setReservations(asList(fresh.data));
    } catch (err) {
      const response = err.response?.data;
      setError(typeof response === "string" ? response : response ? Object.values(response).flat().join(" ") : err.message || "Reservation action failed.");
    } finally {
      setAction(null);
    }
  }

  return (
    <div className="front-desk-root">
      <header className="front-desk-header">
        <div>
          <div className="front-desk-eyebrow">Front desk workspace</div>
          <h1>Run today smoothly</h1>
          <p>Keep arrivals, departures, and room readiness moving from one place.</p>
        </div>
        <div className="front-desk-header-actions">
          <div className="front-desk-date"><CalendarDays size={16} /> {new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</div>
          <button className="front-desk-button front-desk-button--outline" onClick={() => load(true)} disabled={refreshing}><RefreshCw size={15} className={refreshing ? "front-desk-spin" : ""} /> {refreshing ? "Refreshing…" : "Refresh"}</button>
          <button className="front-desk-button front-desk-button--primary" onClick={() => navigate("/reservations/new")}>New reservation <ArrowRight size={15} /></button>
        </div>
      </header>

      {error && <div className="front-desk-error" role="alert">{error}</div>}

      <section className="front-desk-stat-grid" aria-label="Front desk overview">
        <div className="front-desk-stat"><span className="front-desk-stat-icon front-desk-stat-icon--teal"><LogIn size={18} /></span><div><strong>{arrivals.length}</strong><span>Arrivals today</span></div></div>
        <div className="front-desk-stat"><span className="front-desk-stat-icon front-desk-stat-icon--blue"><LogOut size={18} /></span><div><strong>{departures.length}</strong><span>Departures today</span></div></div>
        <div className="front-desk-stat"><span className="front-desk-stat-icon front-desk-stat-icon--green"><BedDouble size={18} /></span><div><strong>{readyRooms}</strong><span>Rooms ready</span></div></div>
        <div className="front-desk-stat"><span className="front-desk-stat-icon front-desk-stat-icon--amber"><CheckCircle2 size={18} /></span><div><strong>{occupiedRooms}</strong><span>Currently occupied</span></div></div>
      </section>

      <section className="front-desk-toolbar">
        <div className="front-desk-toolbar-title"><span className="front-desk-eyebrow">Live queue</span><h2>Guest movement</h2></div>
        <label className="front-desk-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search guest, email, or room" aria-label="Search front desk guests" /></label>
      </section>

      {loading ? <div className="front-desk-loading">Loading today's desk…</div> : <div className="front-desk-queues">
        <section className="front-desk-panel"><div className="front-desk-panel-heading"><div><h2>Arrivals</h2><p>Guests expected today</p></div><span className="front-desk-count">{arrivals.length}</span></div>{arrivals.length ? arrivals.map((reservation) => <QueueCard key={reservation.id} reservation={reservation} action="check_in" busy={action === `${reservation.id}:check_in`} onAction={(item) => runAction(item, "check_in")} onOpen={() => navigate(`/reservations/${reservation.id}`)} />) : <div className="front-desk-empty">No arrivals match your search.</div>}</section>
        <section className="front-desk-panel"><div className="front-desk-panel-heading"><div><h2>Departures</h2><p>Guests leaving today</p></div><span className="front-desk-count">{departures.length}</span></div>{departures.length ? departures.map((reservation) => <QueueCard key={reservation.id} reservation={reservation} action="check_out" busy={action === `${reservation.id}:check_out`} onAction={(item) => runAction(item, "check_out")} onOpen={() => navigate(`/reservations/${reservation.id}`)} />) : <div className="front-desk-empty">No departures match your search.</div>}</section>
      </div>}
    </div>
  );
}
