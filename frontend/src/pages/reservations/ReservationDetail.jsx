import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import formatDate from "../../utils/formatDate";
import "./Reservations.css";

const STATUS_LABELS = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked In",
  CHECKED_OUT: "Checked Out",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

const LIFECYCLE = ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT"];

function Timeline({ status }) {
  const cancelled = status === "CANCELLED";
  const currentIndex = LIFECYCLE.indexOf(status);

  return (
    <div className="res-timeline">
      {LIFECYCLE.map((step, i) => {
        let state = "upcoming";
        if (cancelled) {
          if (i <= currentIndex && currentIndex !== -1) state = "reached-before-cancel";
        } else if (i < currentIndex) state = "done";
        else if (i === currentIndex) state = "current";
        return (
          <div key={step} className={`res-timeline-step ${state}`}>
            <span className="res-timeline-dot" />
            <span className="res-timeline-label">{STATUS_LABELS[step]}</span>
            {i < LIFECYCLE.length - 1 && <span className="res-timeline-bar" />}
          </div>
        );
      })}
      {cancelled && (
        <div className="res-timeline-step cancelled current">
          <span className="res-timeline-dot" />
          <span className="res-timeline-label">Cancelled</span>
        </div>
      )}
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <div className="res-detail-section">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="res-row">
      <span className="res-row-label">{label}</span>
      <span className="res-row-value">{children}</span>
    </div>
  );
}

export default function ReservationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reservation, setReservation] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/reservations/${id}/`);
        if (!mounted) return;
        setReservation(res.data);
      } catch (err) {
        if (!mounted) return;
        const data = err.response?.data;
        setError(typeof data === "string" ? data : err.message || "Failed to load reservation");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [id]);

  async function runAction(action, confirmMsg) {
    if (!window.confirm(confirmMsg)) return;
    setActionLoading(action);
    setActionError(null);
    try {
      await api.post(`/reservations/${id}/${action}/`);
      const fresh = await api.get(`/reservations/${id}/`);
      setReservation(fresh.data);
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

  const guest = reservation?.guest_details || {};
  const folio = reservation?.folio;

  return (
    <div className="reservation-detail-root">
      <div className="reservations-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/reservations")}>
            ← Back to Reservations
          </button>
          <h1>
            Reservation #{id}
            {reservation && (
              <span className={`res-pill res-pill-${(reservation.status || "").toLowerCase()}`}>
                {STATUS_LABELS[reservation.status] || reservation.status}
              </span>
            )}
          </h1>
        </div>
        <div className="res-header-actions">
          {["PENDING", "CONFIRMED"].includes(reservation?.status) && (
            <button className="btn btn-ghost" onClick={() => navigate(`/reservations/${id}/edit`)}>
              Edit
            </button>
          )}
          {reservation?.status === "PENDING" && (
            <button className="btn btn-primary" disabled={actionLoading === "confirm"} onClick={() => runAction("confirm", "Confirm this reservation?")}>
              {actionLoading === "confirm" ? "Confirming…" : "Confirm"}
            </button>
          )}
          {reservation?.status === "CONFIRMED" && (
            <button className="btn btn-primary" disabled={actionLoading === "check_in"} onClick={() => runAction("check_in", "Check in this guest?")}>
              {actionLoading === "check_in" ? "Checking in…" : "Check In"}
            </button>
          )}
          {reservation?.status === "CHECKED_IN" && (
            <button className="btn btn-primary" disabled={actionLoading === "check_out"} onClick={() => runAction("check_out", "Check out this guest?")}>
              {actionLoading === "check_out" ? "Checking out…" : "Check Out"}
            </button>
          )}
          {["PENDING", "CONFIRMED"].includes(reservation?.status) && (
            <button className="btn btn-danger" disabled={actionLoading === "cancel"} onClick={() => runAction("cancel", "Cancel this reservation?")}>
              Cancel Reservation
            </button>
          )}
          {folio && (
            <button className="btn btn-ghost" onClick={() => navigate(`/billing/${folio.id}`)}>
              Open Folio
            </button>
          )}
        </div>
      </div>

      {loading && <div className="reservations-loading">Loading reservation…</div>}
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

      {!loading && !error && reservation && (
        <div className="res-detail-grid">
          <div className="res-card res-detail-main">
            <DetailSection title="Guest Information">
              <Row label="Name">{[guest.first_name, guest.last_name].filter(Boolean).join(" ") || "-"}</Row>
              <Row label="Phone">{guest.phone || "-"}</Row>
              <Row label="Email">{guest.email || "-"}</Row>
            </DetailSection>

            <DetailSection title="Stay Information">
              <Row label="Room">
                {reservation.room_details
                  ? `Room ${reservation.room_details.room_number}${reservation.room_details.room_type?.name ? ` — ${reservation.room_details.room_type.name}` : ""}`
                  : "-"}
              </Row>
              <Row label="Check-in">{reservation.check_in_date || "-"}</Row>
              <Row label="Check-out">{reservation.check_out_date || "-"}</Row>
              <Row label="Nights">{reservation.number_of_nights ?? "-"}</Row>
              <Row label="Guests">{reservation.adults ?? 0} adult{(reservation.adults ?? 0) !== 1 ? "s" : ""}{reservation.children ? `, ${reservation.children} child${reservation.children !== 1 ? "ren" : ""}` : ""}</Row>
              <Row label="Status">
                <span className={`res-pill res-pill-${(reservation.status || "").toLowerCase()}`}>
                  {STATUS_LABELS[reservation.status] || reservation.status}
                </span>
              </Row>
              <Row label="Actual check-in">{formatDate(reservation.actual_check_in)}</Row>
              <Row label="Actual check-out">{formatDate(reservation.actual_check_out)}</Row>
              {reservation.special_requests && <Row label="Special requests">{reservation.special_requests}</Row>}
              {reservation.notes && <Row label="Notes">{reservation.notes}</Row>}
            </DetailSection>

            <DetailSection title="Timeline">
              <Timeline status={reservation.status} />
            </DetailSection>
          </div>

          <div className="res-card res-detail-side">
            <DetailSection title="Billing (Folio)">
              {folio ? (
                <>
                  <Row label="Folio">#{folio.id}</Row>
                  <Row label="Status">
                    <span className={`res-pill res-folio-${(folio.status || "").toLowerCase()}`}>
                      {(folio.status || "").replace("_", " ")}
                    </span>
                  </Row>
                  <Row label="Total charges">{folio.total_charges}</Row>
                  <Row label="Total paid">{folio.total_paid}</Row>
                  <Row label="Balance">
                    <strong className={Number(folio.balance) > 0 ? "res-balance-due" : "res-balance-clear"}>
                      {folio.balance}
                    </strong>
                  </Row>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/billing/${folio.id}`)}>
                    Manage Folio →
                  </button>
                </>
              ) : (
                <p className="res-muted">
                  No folio has been created for this reservation yet.
                </p>
              )}
            </DetailSection>

            <DetailSection title="Record">
              <Row label="Created">{formatDate(reservation.created_at)}</Row>
              <Row label="Updated">{formatDate(reservation.updated_at)}</Row>
            </DetailSection>
          </div>
        </div>
      )}
    </div>
  );
}
