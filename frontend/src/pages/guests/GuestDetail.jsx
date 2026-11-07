import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import "./Guests.css";

export default function GuestDetail(){
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guest, setGuest] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [historyError, setHistoryError] = useState(null);

  useEffect(()=>{
    let mounted = true;
    async function load(){
      setLoading(true); setError(null);
      try{
        const res = await api.get(`/guests/${id}/`);
        if(!mounted) return;
        setGuest(res.data);
        try {
          const history = await api.get(`/reservations/?guest=${id}`);
          if(!mounted) return;
          const historyData = history.data;
          setReservations(Array.isArray(historyData) ? historyData : historyData.results || []);
        } catch (historyErr) {
          if(!mounted) return;
          setHistoryError(historyErr.response?.data || historyErr.message || "Failed to load booking history");
        }
      }catch(err){
        if(!mounted) return;
        setError(err.response?.data || err.message || 'Failed to load guest');
      }finally{ if(mounted) setLoading(false) }
    }
    load();
    return ()=> mounted = false;
  },[id]);

  return (
    <div className="guest-detail-root">
      <div className="guest-detail-header">
        <button className="btn-ghost small" onClick={() => navigate('/guests')}>Back to Guests</button>
        <h1>Guest</h1>
      </div>

      {loading && <div className="guest-loading">Loading guest…</div>}
      {error && <div className="guest-error">Error: {JSON.stringify(error)}</div>}

      {!loading && !error && guest && (
        <div className="guest-card">
          <div className="guest-card-header">
            <h2>{(guest.first_name || '') + ' ' + (guest.last_name || '')}</h2>
            <div className="guest-badges">{guest.is_active ? <span className="badge badge-active">Active</span> : <span className="badge">Inactive</span>}</div>
          </div>

          <div className="guest-card-body">
            <div className="guest-row"><strong>Email:</strong> {guest.email || '-'}</div>
            <div className="guest-row"><strong>Phone:</strong> {guest.phone || '-'}</div>
            <div className="guest-row"><strong>Gender:</strong> {guest.gender || '-'}</div>
            <div className="guest-row"><strong>Date of birth:</strong> {guest.date_of_birth || '-'}</div>
            <div className="guest-row"><strong>Nationality:</strong> {guest.nationality || '-'}</div>
            <div className="guest-row"><strong>Address:</strong> {guest.address || '-'}</div>
            <div className="guest-row"><strong>City:</strong> {guest.city || '-'}</div>
            <div className="guest-row"><strong>Country:</strong> {guest.country || '-'}</div>
            <div className="guest-row"><strong>Identification:</strong> {(guest.identification_type ? guest.identification_type + ' ' : '') + (guest.identification_number || '-')}</div>
            <div className="guest-row"><strong>Notes:</strong> {guest.notes || '-'}</div>
            <div className="guest-row"><strong>Created:</strong> {guest.created_at || '-'}</div>
            <div className="guest-row"><strong>Updated:</strong> {guest.updated_at || '-'}</div>
          </div>
          <section className="guest-booking-history">
            <h2>Booking history</h2>
            {historyError && <div className="guest-error">Could not load booking history: {JSON.stringify(historyError)}</div>}
            {!historyError && reservations.length === 0 && <p>No reservations found for this guest.</p>}
            {!historyError && reservations.length > 0 && (
              <div className="room-types-table-wrap">
                <table className="room-types-table">
                  <thead><tr><th>Room</th><th>Check-in</th><th>Check-out</th><th>Status</th><th>Nights</th></tr></thead>
                  <tbody>{reservations.map((reservation) => (
                    <tr key={reservation.id}>
                      <td data-label="Room">{reservation.room_details?.room_number || `Room #${reservation.room}`}</td>
                      <td data-label="Check-in">{reservation.check_in_date}</td>
                      <td data-label="Check-out">{reservation.check_out_date}</td>
                      <td data-label="Status">{reservation.status}</td>
                      <td data-label="Nights">{reservation.number_of_nights}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
