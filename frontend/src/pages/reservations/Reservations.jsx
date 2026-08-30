import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../services/api";
import "./Reservations.css";

const STATUS_OPTIONS = [
  ["PENDING", "Pending"],
  ["CONFIRMED", "Confirmed"],
  ["CHECKED_IN", "Checked In"],
  ["CHECKED_OUT", "Checked Out"],
  ["CANCELLED", "Cancelled"],
  ["NO_SHOW", "No Show"],
];

const PAGE_SIZE = 10;

function guestName(r) {
  return (
    (r.guest_details?.first_name || "") +
    " " +
    (r.guest_details?.last_name || "")
  ).trim();
}

export default function Reservations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const status = searchParams.get("status") || "";
  const roomParam = searchParams.get("room") || "";
  const hotelParam = searchParams.get("hotel") || "";
  const fromParam = searchParams.get("check_in_after") || "";
  const toParam = searchParams.get("check_in_before") || "";
  const q = searchParams.get("q") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState(null);

  function setParam(key, value) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    if (key !== "page") sp.delete("page");
    setSearchParams(sp);
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (roomParam) params.set("room", roomParam);
        if (hotelParam) params.set("hotel", hotelParam);
        if (q) params.set("q", q);
        if (fromParam) params.set("check_in_after", fromParam);
        if (toParam) params.set("check_in_before", toParam);

        const qstr = params.toString();
        const res = await api.get(`/reservations/${qstr ? `?${qstr}` : ""}`);
        if (!mounted) return;
        const data = res.data;
        setReservations(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        if (!mounted) return;
        setError(
          typeof err.response?.data === "string"
            ? err.response.data
            : err.message || "Failed to load reservations"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, [status, roomParam, hotelParam, q, fromParam, toParam]);

  useEffect(() => {
    let mounted = true;
    api
      .get("/rooms/")
      .then((res) => {
        if (!mounted) return;
        const data = res.data;
        setRooms(Array.isArray(data) ? data : data.results || []);
      })
      .catch(() => {});
    return () => (mounted = false);
  }, []);

  const totalPages = Math.max(1, Math.ceil(reservations.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => reservations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [reservations, page]
  );

  async function runAction(r, action, confirmMsg) {
    if (!window.confirm(confirmMsg)) return;
    setActionLoading(`${r.id}:${action}`);
    setActionError(null);
    try {
      await api.post(`/reservations/${r.id}/${action}/`);
      const fresh = await api.get(`/reservations/${r.id}/`);
      setReservations((list) =>
        list.map((item) => (item.id === fresh.data.id ? fresh.data : item))
      );
    } catch (err) {
      const data = err.response?.data;
      const msg =
        typeof data === "string"
          ? data
          : data
          ? Object.values(data).flat().join(" ")
          : err.message || "Action failed";
      setActionError(msg);
    } finally {
      setActionLoading(null);
    }
  }

  const hasFilters = status || roomParam || hotelParam || q || fromParam || toParam;

  return (
    <div className="reservations-root">
      <div className="reservations-header">
        <div>
          <h1>Reservations</h1>
          <p className="reservations-subtitle">
            Manage bookings, check-ins and check-outs.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/reservations/new")}>
          + New Reservation
        </button>
      </div>

      <div className="reservations-toolbar">
        <input
          className="res-input res-search"
          aria-label="Search reservations"
          placeholder="Search guest name, email or room number"
          value={q}
          onChange={(e) => setParam("q", e.target.value)}
        />
        <select
          className="res-input"
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setParam("status", e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          className="res-input"
          aria-label="Filter by room"
          value={roomParam}
          onChange={(e) => setParam("room", e.target.value)}
        >
          <option value="">All rooms</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              Room {room.room_number}
            </option>
          ))}
        </select>
        <input
          className="res-input"
          type="date"
          aria-label="Check-in from"
          value={fromParam}
          onChange={(e) => setParam("check_in_after", e.target.value)}
        />
        <input
          className="res-input"
          type="date"
          aria-label="Check-in to"
          value={toParam}
          onChange={(e) => setParam("check_in_before", e.target.value)}
        />
        {hasFilters ? (
          <button
            className="btn btn-ghost"
            onClick={() => setSearchParams(new URLSearchParams())}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="reservations-meta">
        {loading ? (
          <span className="reservations-loading">Loading reservations…</span>
        ) : (
          <span className="reservations-count">
            {reservations.length} reservation{reservations.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {error && (
        <div className="res-error-banner" role="alert">
          {error}
        </div>
      )}
      {actionError && (
        <div className="res-error-banner" role="alert">
          {actionError}
          <button className="res-error-close" onClick={() => setActionError(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {!loading && !error && reservations.length === 0 && (
        <div className="res-empty-state">
          <div className="res-empty-icon">🗓️</div>
          <h2>No reservations found</h2>
          <p>
            {hasFilters
              ? "Try adjusting or clearing the filters."
              : "Create your first reservation to get started."}
          </p>
          {!hasFilters && (
            <button className="btn btn-primary" onClick={() => navigate("/reservations/new")}>
              + New Reservation
            </button>
          )}
        </div>
      )}

      {!loading && !error && reservations.length > 0 && (
        <div className="reservations-wrap res-card">
          <table className="reservations-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Guest</th>
                <th>Room</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((r) => {
                const busy = actionLoading === `${r.id}:check_in` || actionLoading === `${r.id}:check_out` || actionLoading === `${r.id}:confirm`;
                return (
                  <tr key={r.id}>
                    <td data-label="ID">#{r.id}</td>
                    <td data-label="Guest">
                      <div className="guest-name">{guestName(r)}</div>
                      <div className="guest-contact">{r.guest_details?.email || ""}</div>
                    </td>
                    <td data-label="Room">{r.room_details?.room_number || "-"}</td>
                    <td data-label="Check-in">{r.check_in_date || "-"}</td>
                    <td data-label="Check-out">{r.check_out_date || "-"}</td>
                    <td data-label="Status">
                      <span className={`res-pill res-pill-${(r.status || "").toLowerCase()}`}>
                        {(STATUS_OPTIONS.find(([v]) => v === r.status) || [null, r.status])[1] || r.status}
                      </span>
                    </td>
                    <td data-label="Payment">
                      {r.folio ? (
                        <span className={`res-pill res-folio-${(r.folio.status || "").toLowerCase()}`}>
                          {r.folio.status.replace("_", " ")}
                        </span>
                      ) : (
                        <span className="res-pill res-folio-none">No folio</span>
                      )}
                    </td>
                    <td data-label="Actions">
                      <div className="res-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/reservations/${r.id}`)}>View</button>
                        {["PENDING", "CONFIRMED"].includes(r.status) && (
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/reservations/${r.id}/edit`)}>Edit</button>
                        )}
                        {r.status === "PENDING" && (
                          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => runAction(r, "confirm", "Confirm this reservation?")}>
                            Confirm
                          </button>
                        )}
                        {r.status === "CONFIRMED" && (
                          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => runAction(r, "check_in", "Check in this guest?")}>
                            Check-in
                          </button>
                        )}
                        {r.status === "CHECKED_IN" && (
                          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => runAction(r, "check_out", "Check out this guest?")}>
                            Check-out
                          </button>
                        )}
                        {["PENDING", "CONFIRMED"].includes(r.status) && (
                          <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => runAction(r, "cancel", "Cancel this reservation?")}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="res-pagination">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setParam("page", String(page - 1))}>
            ← Prev
          </button>
          <span>Page {page} of {totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setParam("page", String(page + 1))}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
