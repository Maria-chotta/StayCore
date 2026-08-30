import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import "./Housekeeping.css";

function FieldError({ errors }){
  if(!errors) return null;
  if(Array.isArray(errors)) return <div className="field-error">{errors.join('; ')}</div>;
  return <div className="field-error">{String(errors)}</div>;
}

export default function HousekeepingForm({ mode = 'create' }){
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
    task_type: 'CLEANING',
    priority: 'NORMAL',
    scheduled_for: '',
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
        const res = await api.get(`/housekeeping/${id}/`);
        if(!mounted) return;
        const d = res.data;
        setForm({
          hotel: d.hotel || '',
          room: d.room || '',
          assigned_to: d.assigned_to || '',
          task_type: d.task_type || 'CLEANING',
          priority: d.priority || 'NORMAL',
          scheduled_for: d.scheduled_for || '',
          notes: d.notes || '',
        });
      }catch(err){
        if(!mounted) return;
        setError(err.response?.data || err.message || 'Failed to load task');
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
        task_type: form.task_type,
        priority: form.priority,
        scheduled_for: form.scheduled_for || null,
        notes: form.notes,
      };

      if(mode === 'create'){
        await api.post('/housekeeping/', payload);
      }else{
        await api.patch(`/housekeeping/${id}/`, payload);
      }
      navigate(`/housekeeping`);
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
    <div className="housekeeping-root">
      <h2>{mode === 'create' ? 'Create Housekeeping Task' : 'Edit Housekeeping Task'}</h2>
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

          <label>Task type
            <select name="task_type" value={form.task_type} onChange={handleChange}>
              <option value="CLEANING">Cleaning</option>
              <option value="DEEP_CLEANING">Deep Cleaning</option>
              <option value="INSPECTION">Inspection</option>
              <option value="LINEN_CHANGE">Linen Change</option>
            </select>
            <FieldError errors={fieldErrors.task_type} />
          </label>

          <label>Priority
            <select name="priority" value={form.priority} onChange={handleChange}>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
            <FieldError errors={fieldErrors.priority} />
          </label>

          <label>Scheduled for
            <input type="datetime-local" name="scheduled_for" value={form.scheduled_for || ''} onChange={handleChange} />
            <FieldError errors={fieldErrors.scheduled_for} />
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
            <button type="button" className="btn-ghost" onClick={()=> navigate('/housekeeping')}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
