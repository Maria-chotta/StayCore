import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./Rooms.css";

function RoomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [room, setRoom] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/rooms/${encodeURIComponent(id)}/`);
        if (!mounted) return;
        setRoom(res.data);
      } catch (err) {
        if (!mounted) return;
        if (err.response && err.response.status === 404) {
          setError({ message: 'Room not found', status: 404 });
        } else {
          setError(err.response?.data || err.message || 'Failed to load room');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => (mounted = false);
  }, [id]);

  function goBack() {
    navigate(-1);
  }

  return (
    <div className="rooms-root">
      <div className="rooms-header" style={{ alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="breadcrumbs" style={{ fontSize: 13, color: 'var(--muted, #6b7280)' }}>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>Dashboard</span>
            {' / '}
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/rooms')}>Rooms</span>
            {room && ` / Room ${room.room_number || room.id}`}
          </div>
          <h1 style={{ margin: '6px 0' }}>{room ? `Room ${room.room_number || room.id}` : 'Room Details'}</h1>
        </div>
        {room && (
          <div style={{ marginLeft: 'auto' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{room.room_type?.name || ''}</div>
              <div className={`room-pill ${'room-pill-' + (room.status || '').toLowerCase().replace(/\s+/g,'_')}`}>{room.status}</div>
            </div>
          </div>
        )}
      </div>

      {loading && <div className="rooms-loading">Loading room…</div>}

      {error && (
        <div className="rooms-error">
          {error.status === 404 ? 'Room not found.' : `Error: ${JSON.stringify(error)}`}
        </div>
      )}

      {!loading && !error && room && (
        <div className="room-detail">
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 220 }}>
              <div className="room-row"><strong>Room:</strong> {room.room_number || room.id}</div>
              <div className="room-row"><strong>Type:</strong> {room.room_type?.name || (room.room_type || '-')}</div>
              <div className="room-row"><strong>Floor:</strong> {room.floor ?? '-'}</div>
            </div>

            <div style={{ minWidth: 220 }}>
              <div className="room-row"><strong>Status:</strong> <span className={`room-pill ${'room-pill-' + (room.status || '').toLowerCase().replace(/\s+/g,'_')}`}>{room.status}</span></div>
              <div className="room-row"><strong>Active:</strong> {room.is_active ? 'Yes' : 'No'}</div>
              <div className="room-row"><strong>Hotel:</strong> {room.hotel?.name || (room.hotel || '-')}</div>
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <div className="room-row"><strong>Notes:</strong> {room.notes || '-'}</div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <div className="room-row"><strong>Created:</strong> {room.created_at || room.created || '-'}</div>
            <div className="room-row"><strong>Updated:</strong> {room.updated_at || room.updated || '-'}</div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button className="btn" onClick={goBack}>Back to Rooms</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoomDetail;
