import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import "./Maintenance.css";

function FieldError({ errors }){
  if(!errors) return null;
  if(Array.isArray(errors)) return <div className="field-error">{errors.join('; ')}</div>;
  return <div className="field-error">{String(errors)}</div>;
}

export default function MaintenanceForm({ mode = 'create' }){
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(mode === 'edit');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [roomOptions, setRoomOptions] = useState([]);

  const [form, setForm] = useState({
    hotel: '',
    room: '',
    assigned_to: '',
    title: '',
    description: '',
    priority: 'MEDIUM',
    status: 'OPEN',
    notes: '',
  });

  useEffect(()=>{
    let mounted = true;
    async function loadOptions(){
      try{
        const rRes = await api.get('/rooms/');
        const rData = Array.isArray(rRes.data) ? rRes.data : (rRes.data.results || []);
        if(!mounted) return;
        setRoomOptions(rData);
      }catch{
        // non-fatal
      }
    }
    loadOptions();
    return ()=> mounted = false;
  },[]);

  useEffect(()=>{
    if(mode !== 'edit') return;
    let mounted = true;
    async function load(){
      setLoading(true); setError(null);
      try{
        const res = await api.get(`/maintenance/${id}/`);
        if(!mounted) return;
        const d = res.data;
        setForm({
          hotel: d.hotel || '',
          room: d.room || '',
          assigned_to: d.assigned_to || '',
          title: d.title || '',
          description: d.description || '',
          priority: d.priority || 'MEDIUM',
          status: d.status || 'OPEN',
          notes: d.notes || '',
        });
      }catch(err){
        if(!mounted) return;
        setError(err.response?.data || err.message || 'Failed to load request');
      }finally{ if(mounted) setLoading(false) }
    }
    load();
    return ()=> mounted = false;
  },[mode, id]);

  function handleChange(e){
    const { name, value } = e.target;
    setForm((s)=> {
      const next = ({...s, [name]: value});
      if(name === 'room'){
        const roomObj = roomOptions.find(r => String(r.id) === String(value));
        if(roomObj){
          const hotelVal = (roomObj.hotel && typeof roomObj.hotel === 'object') ? roomObj.hotel.id : roomObj.hotel;
          if(hotelVal) next.hotel = hotelVal;
        }
      }
      return next;
    });
    setFieldErrors((fe)=> ({...fe, [name]: undefined}));
    setError(null);
  }

  function validate(){
    const fe = {};
    if(!form.room) fe.room = ['Room is required'];
    if(!form.title) fe.title = ['Title is required'];
    return fe;
  }

  async function handleSubmit(e){
    e.preventDefault();
    setFieldErrors({});
    const fe = validate();
    if(Object.keys(fe).length){ setFieldErrors(fe); return; }
    setSubmitting(true); setError(null);
    try{
      const payload = {
        hotel: form.hotel || null,
        room: form.room || null,
        assigned_to: form.assigned_to || null,
        title: form.title,
        description: form.description,
        priority: form.priority,
        status: form.status,
        notes: form.notes,
      };

      if(mode === 'create'){
        await api.post('/maintenance/', payload);
      }else{
        await api.patch(`/maintenance/${id}/`, payload);
      }

      navigate('/maintenance');
    }catch(err){
      const resp = err.response;
      if(resp && resp.data){
        const fld = {};
        Object.keys(resp.data).forEach(k=> fld[k]=resp.data[k]);
        setFieldErrors(fld);
        if(resp.data.non_field_errors) setError(resp.data.non_field_errors.join('; '));
      }else{
        setError(err.message || 'Submission failed');
      }
    }finally{ setSubmitting(false); }
  }

  return (
    <div className="maintenance-root">
      <h2>{mode === 'create' ? 'Create Maintenance Request' : 'Edit Maintenance Request'}</h2>
      {loading && <div>Loading…</div>}
      {error && <div className="form-error">{JSON.stringify(error)}</div>}
      {!loading && (
        <form onSubmit={handleSubmit}>
          <label>Room
            <select name="room" value={form.room} onChange={handleChange}>
              <option value="">Select room</option>
              {roomOptions.map(r=> (<option key={r.id} value={r.id}>{r.room_number} — {r.room_type?.name || r.room_type}</option>))}
            </select>
            <FieldError errors={fieldErrors.room} />
          </label>

          <label>Title
            <input name="title" value={form.title} onChange={handleChange} />
            <FieldError errors={fieldErrors.title} />
          </label>

          <label>Description
            <textarea name="description" value={form.description} onChange={handleChange} />
            <FieldError errors={fieldErrors.description} />
          </label>

          <label>Priority
            <select name="priority" value={form.priority} onChange={handleChange}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
            <FieldError errors={fieldErrors.priority} />
          </label>

          <label>Assigned user id
            <input name="assigned_to" value={form.assigned_to} onChange={handleChange} placeholder="User id (optional)" />
            <FieldError errors={fieldErrors.assigned_to} />
          </label>

          <label>Notes
            <textarea name="notes" value={form.notes} onChange={handleChange} />
            <FieldError errors={fieldErrors.notes} />
          </label>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn" type="submit" disabled={submitting}>{submitting ? 'Saving…' : (mode === 'create' ? 'Create' : 'Save')}</button>
            <button type="button" className="btn-ghost" onClick={()=> navigate('/maintenance')}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
