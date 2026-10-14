import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import "./RoomTypes.css";

const initialForm = { name: "", description: "", max_occupancy: 2, base_price: "", is_active: true };

export default function RoomTypeForm({ mode = "create" }) {
  const { id } = useParams(); const navigate = useNavigate(); const [form, setForm] = useState(initialForm); const [loading, setLoading] = useState(mode === "edit"); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState(null);
  useEffect(() => { if (mode !== "edit") return; Promise.resolve().then(async () => { try { const response = await api.get(`/room-types/${id}/`); setForm({ name: response.data.name || "", description: response.data.description || "", max_occupancy: response.data.max_occupancy ?? 2, base_price: response.data.base_price || "", is_active: response.data.is_active }); } catch (err) { setError(err.response?.data || err.message || "Failed to load room type."); } finally { setLoading(false); } }); }, [id, mode]);
  const submit = async (event) => { event.preventDefault(); setError(null); if (!form.name.trim() || Number(form.max_occupancy) < 1 || !Number.isFinite(Number(form.base_price))) { setError("Enter a name, occupancy of at least 1, and a valid base price."); return; } setSubmitting(true); const payload = { ...form, name: form.name.trim(), max_occupancy: Number(form.max_occupancy), base_price: form.base_price }; try { const response = mode === "create" ? await api.post("/room-types/", payload) : await api.patch(`/room-types/${id}/`, payload); navigate(mode === "create" ? "/room-types" : `/room-types/${response.data.id}`); } catch (err) { setError(err.response?.data || err.message || "Could not save room type."); } finally { setSubmitting(false); } };
  return (
    <div className="room-types-root">
      <div className="room-types-header">
        <div>
          <button className="btn-ghost small" type="button" onClick={() => navigate("/room-types")}>Back to Room Types</button>
          <span className="config-form-eyebrow">ROOM INVENTORY</span>
          <h1>{mode === "create" ? "Create Room Type" : "Edit Room Type"}</h1>
          <p>Define a room category and its default occupancy and price.</p>
        </div>
      </div>
      {loading && <div className="room-types-loading">Loading room type…</div>}
      {error && <div className="room-types-error">{typeof error === "string" ? error : JSON.stringify(error)}</div>}
      {!loading && (
        <form className="room-type-form room-type-form-enhanced" onSubmit={submit}>
          <fieldset className="form-section">
            <legend>Room type details</legend>
            <div className="form-section-grid">
              <label className="form-field form-field-wide">Room type name<input value={form.name} disabled={submitting} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
              <label className="form-field">Maximum occupancy<input type="number" min="1" value={form.max_occupancy} disabled={submitting} onChange={(event) => setForm({ ...form, max_occupancy: event.target.value })} /></label>
              <label className="form-field">Base price<input type="number" min="0" step="0.01" value={form.base_price} disabled={submitting} onChange={(event) => setForm({ ...form, base_price: event.target.value })} required /></label>
              <label className="form-field form-field-wide">Description <small>Optional</small><textarea value={form.description} disabled={submitting} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} /></label>
            </div>
          </fieldset>
          <label className="form-active-toggle">
            <span><strong>Active room type</strong><small>Allow this category to be used for new rooms.</small></span>
            <input type="checkbox" checked={form.is_active} disabled={submitting} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
            <span className="form-toggle-track" aria-hidden="true"><span /></span>
          </label>
          <div className="form-actions">
            <button className="btn-ghost" type="button" disabled={submitting} onClick={() => navigate("/room-types")}>Cancel</button>
            <button className="btn" type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save room type"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
