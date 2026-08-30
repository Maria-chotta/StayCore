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

  useEffect(()=>{
    let mounted = true;
    async function load(){
      setLoading(true); setError(null);
      try{
        const res = await api.get(`/guests/${id}/`);
        if(!mounted) return;
        setGuest(res.data);
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
        </div>
      )}
    </div>
  )
}
