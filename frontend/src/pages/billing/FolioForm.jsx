import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./Billing.css";

const asList = (data) => (Array.isArray(data) ? data : data.results || []);

export default function FolioForm() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]); const [existingFolios, setExistingFolios] = useState([]); const [reservationId, setReservationId] = useState(""); const [notes, setNotes] = useState(""); const [loading, setLoading] = useState(true); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState(null);
  useEffect(() => { Promise.resolve().then(async () => { try { const [reservationRes, folioRes] = await Promise.all([api.get("/reservations/"), api.get("/folios/")]); setReservations(asList(reservationRes.data)); setExistingFolios(asList(folioRes.data)); } catch (err) { setError(err.response?.data || err.message || "Failed to load reservations."); } finally { setLoading(false); } }); }, []);
  const availableReservations = reservations.filter((reservation) => !existingFolios.some((folio) => String(folio.reservation) === String(reservation.id)));
  const submit = async (event) => { event.preventDefault(); setError(null); const reservation = reservations.find((item) => String(item.id) === String(reservationId)); if (!reservation) { setError("Select a reservation that does not already have a folio."); return; } setSubmitting(true); try { const response = await api.post("/folios/", { reservation: reservation.id, hotel: reservation.hotel, guest: reservation.guest, notes }); navigate(`/billing/${response.data.id}`); } catch (err) { setError(err.response?.data || err.message || "Could not create folio."); } finally { setSubmitting(false); } };
  return (
    <div className="billing-root">
      <div className="billing-header">
        <div>
          <button className="btn-ghost small" type="button" onClick={() => navigate("/billing")}>Back to Billing</button>
          <span className="folio-form-eyebrow">ACCOUNTS RECEIVABLE</span>
          <h1>Create folio</h1>
          <p>Open a guest account for an upcoming or current reservation.</p>
        </div>
      </div>
      {loading && <div className="billing-loading">Loading reservations…</div>}
      {error && <div className="billing-error">{typeof error === "string" ? error : JSON.stringify(error)}</div>}
      {!loading && (
        <form className="folio-create-form" onSubmit={submit}>
          <fieldset className="folio-form-section">
            <legend>Folio details</legend>
            <label>Reservation
              <select value={reservationId} disabled={submitting} onChange={(event) => setReservationId(event.target.value)} required>
                <option value="">Select a reservation</option>
                {availableReservations.map((reservation) => (
                  <option key={reservation.id} value={reservation.id}>
                    #{reservation.id} — {reservation.guest_details ? `${reservation.guest_details.first_name} ${reservation.guest_details.last_name}` : `Guest #${reservation.guest}`}
                  </option>
                ))}
              </select>
            </label>
            {availableReservations.length === 0 && <p>No reservations without a folio are available.</p>}
            <label>Notes <small>Optional</small>
              <textarea value={notes} disabled={submitting} onChange={(event) => setNotes(event.target.value)} rows={3} />
            </label>
          </fieldset>
          <div className="folio-form-actions">
            <button className="btn-ghost" type="button" disabled={submitting} onClick={() => navigate("/billing")}>Cancel</button>
            <button className="btn" type="submit" disabled={submitting || availableReservations.length === 0}>{submitting ? "Creating…" : "Create folio"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
