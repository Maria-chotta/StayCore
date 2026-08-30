import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./Rooms.css";

function Rooms() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status");
  const q = searchParams.get("q") || "";
  // prefer server-side room_type param, fall back to legacy `type`
  const roomTypeParam = searchParams.get("room_type") || searchParams.get("type") || "";
  const activeParam = searchParams.get("active");

  const STATUS_OPTIONS = [
    { value: "", label: "All" },
    { value: "AVAILABLE", label: "Available" },
    { value: "OCCUPIED", label: "Occupied" },
    { value: "DIRTY", label: "Dirty" },
    { value: "CLEANING", label: "Cleaning" },
    { value: "MAINTENANCE", label: "Maintenance" },
    { value: "OUT_OF_ORDER", label: "Out of Order" },
  ];

  function handleStatusSelectChange(e) {
    const v = e.target.value;
    const sp = new URLSearchParams(searchParams.toString());
    if (!v) {
      sp.delete("status");
    } else {
      sp.set("status", v);
    }
    setSearchParams(sp, { replace: false });
  }

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roomsRaw, setRoomsRaw] = useState([]);
  const navigate = useNavigate();
  const [roomTypesList, setRoomTypesList] = useState([]);
  const [roomTypesLoading, setRoomTypesLoading] = useState(true);
  const [roomTypesError, setRoomTypesError] = useState(null);


  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Build request URL with status and server-side room_type if present
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        if (roomTypeParam) params.set('room_type', roomTypeParam);
        const qstr = params.toString();
        const url = `/rooms/${qstr ? `?${qstr}` : ''}`;
        const res = await api.get(url);
        const data = res.data;
        const list = Array.isArray(data) ? data : (data.results || []);
        if (!mounted) return;
        setRoomsRaw(list);
      } catch (err) {
        setError(err.response?.data || err.message || "Failed to load rooms");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => (mounted = false);
  }, [status, roomTypeParam]);

  // fetch room types from server
  useEffect(()=>{
    let mounted = true;
    async function loadTypes(){
      setRoomTypesLoading(true);
      setRoomTypesError(null);
      try{
        const res = await api.get('/room-types/');
        const data = res.data;
        const list = Array.isArray(data) ? data : (data.results || []);
        if(!mounted) return;
        setRoomTypesList(list);
      }catch(err){
        if(!mounted) return;
        setRoomTypesError(err.response?.data || err.message || 'Failed to load room types');
      }finally{ if(mounted) setRoomTypesLoading(false) }
    }
    loadTypes();
    return ()=> mounted = false;
  },[])

  // filtered rooms derived from raw list and query params
  const rooms = useMemo(() => {
    const v = (q || "").trim();
    let list = roomsRaw.slice();
    if (v) {
      list = list.filter((r) => String(r.room_number || r.id).toLowerCase().includes(v.toLowerCase()));
    }
    if (roomTypeParam && !roomTypesLoading) {
      // If server-side room_type param was used, the server already filtered; keep client-side check as fallback
      list = list.filter((r) => (r.room_type && String(r.room_type.id) === String(roomTypeParam)) || (String(r.room_type) === String(roomTypeParam)));
    }
    if (activeParam !== null) {
      if (activeParam === 'true') list = list.filter((r) => r.is_active === true);
      if (activeParam === 'false') list = list.filter((r) => r.is_active === false);
    }
    return list;
  }, [roomsRaw, q, roomTypeParam, activeParam, roomTypesLoading]);

  const heading = status ? `Rooms — ${status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c=>c.toUpperCase())}` : 'Rooms';

  function handleClearFilters() {
    setSearchParams(new URLSearchParams(), { replace: false });
  }

  return (
    <div className="rooms-root">
      <div className="rooms-header">
        <h1>{heading}</h1>
        <div className="rooms-filter">
          <label htmlFor="status-select" className="sr-only">Filter by status</label>
          <select id="status-select" value={status || ""} onChange={handleStatusSelectChange}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {loading && <div className="rooms-loading">Loading rooms…</div>}
        {!loading && !error && (
          <div className="rooms-count">{rooms.length} result{rooms.length !== 1 ? 's' : ''}</div>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn-ghost small" onClick={handleClearFilters}>Clear filters</button>
        </div>
      </div>
      {error && <div className="rooms-error">Error: {JSON.stringify(error)}</div>}

      {!loading && !error && rooms.length === 0 && (
        <div className="rooms-empty">No rooms found.</div>
      )}

      {!loading && !error && rooms.length > 0 && (
        <div className="rooms-wrap">
          <div className="rooms-filters-row" style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <input
              aria-label="Search room number"
              placeholder="Search room number"
              value={q}
              onChange={(e) => {
                const sp = new URLSearchParams(searchParams.toString());
                if (e.target.value) sp.set('q', e.target.value); else sp.delete('q');
                setSearchParams(sp, { replace: false });
              }}
              style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}
            />

            <select
              aria-label="Filter by room type"
              value={roomTypeParam}
              onChange={(e) => {
                const sp = new URLSearchParams(searchParams.toString());
                if (e.target.value) sp.set('room_type', e.target.value); else { sp.delete('room_type'); sp.delete('type'); }
                setSearchParams(sp, { replace: false });
              }}
              style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}
            >
              <option value="">All types</option>
              {roomTypesLoading ? (
                <option>Loading…</option>
              ) : roomTypesError ? (
                <option>Error loading types</option>
              ) : (
                roomTypesList.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))
              )}
            </select>

            <select
              aria-label="Filter by active"
              value={activeParam ?? ''}
              onChange={(e) => {
                const sp = new URLSearchParams(searchParams.toString());
                if (e.target.value === '') sp.delete('active'); else sp.set('active', e.target.value);
                setSearchParams(sp, { replace: false });
              }}
              style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <table className="rooms-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Type</th>
                <th>Floor</th>
                <th>Status</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => {
                const handleClick = () => navigate(`/rooms/${r.id}`);
                const onKeyDown = (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                  }
                };

                return (
                  <tr key={r.id} role="button" tabIndex={0} onClick={handleClick} onKeyDown={onKeyDown}>
                    <td data-label="Room">{r.room_number || r.id}</td>
                    <td data-label="Type">{r.room_type?.name || roomTypesList.find((type) => String(type.id) === String(r.room_type))?.name || (r.room_type || '-')}</td>
                    <td data-label="Floor">{r.floor ?? '-'}</td>
                    <td data-label="Status"><span className={`room-pill room-pill-${(r.status||'UNKNOWN').toLowerCase()}`}>{r.status}</span></td>
                    <td data-label="Active">{r.is_active ? 'Yes' : 'No'}</td>
                    <td data-label="Actions"><button className="btn-ghost small" onClick={(e)=>{e.stopPropagation(); navigate(`/rooms/${r.id}`);}}>View</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Rooms;
