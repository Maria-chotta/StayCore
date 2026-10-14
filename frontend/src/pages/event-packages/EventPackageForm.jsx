import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import "../room-types/RoomTypes.css";

const initialForm = {
  name: "",
  description: "",
  price: "",
  capacity: 1,
  is_active: true,
};

export default function EventPackageForm({ mode = "create" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (mode !== "edit") return;
    Promise.resolve().then(async () => {
      try {
        const response = await api.get(`/event-packages/${id}/`);
        setForm({
          name: response.data.name || "",
          description: response.data.description || "",
          price: response.data.price ?? "",
          capacity: response.data.capacity ?? 1,
          is_active: response.data.is_active ?? true,
        });
      } catch (err) {
        setError(err.response?.data || err.message || "Failed to load event package.");
      } finally {
        setLoading(false);
      }
    });
  }, [id, mode]);

  const submit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!form.name.trim() || !Number.isFinite(Number(form.price)) || Number(form.capacity) < 1) {
      setError("Provide a valid name, price, and capacity.");
      return;
    }

    setSubmitting(true);
    const payload = { ...form, name: form.name.trim(), price: Number(form.price), capacity: Number(form.capacity) };
    try {
      if (mode === "create") {
        await api.post("/event-packages/", payload);
      } else {
        await api.patch(`/event-packages/${id}/`, payload);
      }
      navigate("/event-packages");
    } catch (err) {
      setError(err.response?.data || err.message || "Could not save event package.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="room-types-root">
      <div className="room-types-header">
        <div>
          <button className="btn-ghost small" onClick={() => navigate("/event-packages")}>Back to Event Packages</button>
          <h1>{mode === "create" ? "Create Event Package" : "Edit Event Package"}</h1>
        </div>
      </div>

      {loading && <div className="room-types-loading">Loading event package…</div>}
      {error && <div className="room-types-error">{typeof error === "string" ? error : JSON.stringify(error)}</div>}

      {!loading && (
        <form className="room-type-form room-type-form-enhanced" onSubmit={submit}>
          <fieldset className="form-section">
            <legend>Package details</legend>
            <div className="form-section-grid">
              <label className="form-field form-field-wide">Package name<input value={form.name} disabled={submitting} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
              <label className="form-field">Capacity<input type="number" min="1" value={form.capacity} disabled={submitting} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></label>
              <label className="form-field">Price<input type="number" min="0" step="0.01" value={form.price} disabled={submitting} onChange={(event) => setForm({ ...form, price: event.target.value })} required /></label>
              <label className="form-field form-field-wide">Description <small>Optional</small><textarea value={form.description} disabled={submitting} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} /></label>
            </div>
          </fieldset>
          <label className="form-active-toggle">
            <span><strong>Active package</strong><small>Allow this package to be selected for new events.</small></span>
            <input type="checkbox" checked={form.is_active} disabled={submitting} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
            <span className="form-toggle-track" aria-hidden="true"><span /></span>
          </label>
          <div className="form-actions">
            <button className="btn-ghost" type="button" disabled={submitting} onClick={() => navigate("/event-packages")}>Cancel</button>
            <button className="btn" type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save package"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
