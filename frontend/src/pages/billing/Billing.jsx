import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./Billing.css";

const asList = (data) => (Array.isArray(data) ? data : data.results || []);
const amount = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Billing() {
  const navigate = useNavigate();
  const [folios, setFolios] = useState([]);
  const [references, setReferences] = useState({ reservations: [], guests: [], rooms: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [folioRes, reservationRes, guestRes, roomRes] = await Promise.all([
        api.get("/folios/"), api.get("/reservations/"), api.get("/guests/"), api.get("/rooms/"),
      ]);
      setFolios(asList(folioRes.data));
      setReferences({ reservations: asList(reservationRes.data), guests: asList(guestRes.data), rooms: asList(roomRes.data) });
    } catch (err) {
      setError(err.response?.data || err.message || "Failed to load folios.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { Promise.resolve().then(load); }, [load]);
  const guestFor = (folio) => references.guests.find((guest) => String(guest.id) === String(folio.guest));
  const reservationFor = (folio) => references.reservations.find((reservation) => String(reservation.id) === String(folio.reservation));

  return <div className="billing-root">
    <div className="billing-header"><div><h1>Billing & Folios</h1><p>Review guest charges, payments, and balances.</p></div><div className="billing-header-actions"><button className="btn-ghost small" disabled={loading} onClick={load}>{loading ? "Refreshing…" : "Refresh"}</button><button className="btn" onClick={() => navigate("/billing/new")}>Create Folio</button></div></div>
    {loading && <div className="billing-loading">Loading folios…</div>}
    {error && <div className="billing-error">{typeof error === "string" ? error : JSON.stringify(error)}</div>}
    {!loading && !error && folios.length === 0 && <div className="billing-empty">No folios are available. The current backend does not create folios automatically.</div>}
    {!loading && !error && folios.length > 0 && <div className="billing-table-wrap"><table className="billing-table"><thead><tr><th>Folio</th><th>Guest</th><th>Reservation</th><th>Room</th><th>Charges</th><th>Paid</th><th>Balance due</th><th>Status</th></tr></thead><tbody>{folios.map((folio) => {
      const guest = guestFor(folio); const reservation = reservationFor(folio); const room = references.rooms.find((item) => String(item.id) === String(reservation?.room));
      return <tr key={folio.id} role="button" tabIndex={0} onClick={() => navigate(`/billing/${folio.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate(`/billing/${folio.id}`); } }}>
        <td data-label="Folio">#{folio.id}</td><td data-label="Guest">{guest ? `${guest.first_name} ${guest.last_name}` : `Guest #${folio.guest}`}</td><td data-label="Reservation">#{folio.reservation}</td><td data-label="Room">{room?.room_number || "—"}</td><td data-label="Charges">{amount(folio.total_charges)}</td><td data-label="Paid">{amount(folio.total_paid)}</td><td data-label="Balance due" className="balance-cell">{amount(folio.balance)}</td><td data-label="Status"><span className={`folio-status folio-status-${folio.status.toLowerCase()}`}>{folio.status.replaceAll("_", " ")}</span></td>
      </tr>;
    })}</tbody></table></div>}
  </div>;
}
