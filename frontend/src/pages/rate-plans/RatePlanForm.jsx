import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import "../room-types/RoomTypes.css";

const initialForm = {
  name: "",
  description: "",
  rate_type: "SPECIAL",
  price: "",
  meal_plan: "ROOM_ONLY",
  cancellation_deadline_hours: 24,
  cancellation_fee_percent: "0",
  start_date: "",
  end_date: "",
  is_active: true,
};

export default function RatePlanForm({ mode = "create" }) {
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
        const response = await api.get(`/rate-plans/${id}/`);
        setForm({
          name: response.data.name || "",
          description: response.data.description || "",
          rate_type: response.data.rate_type || "SPECIAL",
          price: response.data.price ?? "",
          meal_plan: response.data.meal_plan || "ROOM_ONLY",
          cancellation_deadline_hours: response.data.cancellation_deadline_hours ?? 24,
          cancellation_fee_percent: response.data.cancellation_fee_percent ?? "0",
          start_date: response.data.start_date || "",
          end_date: response.data.end_date || "",
          is_active: response.data.is_active ?? true,
        });
      } catch (err) {
        setError(err.response?.data || err.message || "Failed to load rate plan.");
      } finally {
        setLoading(false);
      }
    });
  }, [id, mode]);

  const submit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.start_date || !form.end_date || !Number.isFinite(Number(form.price))) {
      setError("Name, both dates, and a valid price are required.");
      return;
    }

    setSubmitting(true);
    const payload = {
      ...form,
      hotel: Number(localStorage.getItem("active_hotel_id") || 0),
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      cancellation_deadline_hours: Number(form.cancellation_deadline_hours),
      cancellation_fee_percent: Number(form.cancellation_fee_percent),
    };

    try {
      if (mode === "create") {
        await api.post("/rate-plans/", payload);
      } else {
        await api.patch(`/rate-plans/${id}/`, payload);
      }
      navigate("/rate-plans");
    } catch (err) {
      setError(err.response?.data || err.message || "Could not save rate plan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="room-types-root">
      <div className="room-types-header">
        <div>
          <button className="btn-ghost small" onClick={() => navigate("/rate-plans")}>Back to Rate Plans</button>
          <h1>{mode === "create" ? "Create Rate Plan" : "Edit Rate Plan"}</h1>
        </div>
      </div>

      {loading && <div className="room-types-loading">Loading rate plan…</div>}
      {error && <div className="room-types-error">{typeof error === "string" ? error : JSON.stringify(error)}</div>}

      {!loading && (
        <form className="room-type-form room-type-form-enhanced" onSubmit={submit}>
          <fieldset className="form-section">
            <legend>Rate details</legend>
            <div className="form-section-grid">
              <label className="form-field form-field-wide">Rate plan name<input value={form.name} disabled={submitting} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
              <label className="form-field">Rate type<select value={form.rate_type} disabled={submitting} onChange={(event) => setForm({ ...form, rate_type: event.target.value })}>
                <option value="GROUP">Group</option>
                <option value="WEEKEND">Weekend</option>
                <option value="SPECIAL">Special</option>
                <option value="CORPORATE">Corporate</option>
              </select></label>
              <label className="form-field">Price<input type="number" min="0" step="0.01" value={form.price} disabled={submitting} onChange={(event) => setForm({ ...form, price: event.target.value })} required /></label>
              <label className="form-field">Meal plan<select value={form.meal_plan} disabled={submitting} onChange={(event) => setForm({ ...form, meal_plan: event.target.value })}>
                <option value="ROOM_ONLY">Room only</option>
                <option value="BREAKFAST">Breakfast included</option>
                <option value="HALF_BOARD">Half board</option>
                <option value="FULL_BOARD">Full board</option>
                <option value="ALL_INCLUSIVE">All inclusive</option>
              </select></label>
              <label className="form-field">Free cancellation until (hours)<input type="number" min="0" step="1" value={form.cancellation_deadline_hours} disabled={submitting} onChange={(event) => setForm({ ...form, cancellation_deadline_hours: event.target.value })} required /></label>
              <label className="form-field">Cancellation fee after deadline (%)<input type="number" min="0" max="100" step="0.01" value={form.cancellation_fee_percent} disabled={submitting} onChange={(event) => setForm({ ...form, cancellation_fee_percent: event.target.value })} required /></label>
              <label className="form-field">Start date<input type="date" value={form.start_date} disabled={submitting} onChange={(event) => setForm({ ...form, start_date: event.target.value })} required /></label>
              <label className="form-field">End date<input type="date" value={form.end_date} disabled={submitting} onChange={(event) => setForm({ ...form, end_date: event.target.value })} required /></label>
              <label className="form-field form-field-wide">Description <small>Optional</small><textarea value={form.description} disabled={submitting} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} /></label>
            </div>
          </fieldset>
          <label className="form-active-toggle">
            <span><strong>Active rate plan</strong><small>Apply this rate plan to eligible bookings.</small></span>
            <input type="checkbox" checked={form.is_active} disabled={submitting} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
            <span className="form-toggle-track" aria-hidden="true"><span /></span>
          </label>
          <div className="form-actions">
            <button className="btn-ghost" type="button" disabled={submitting} onClick={() => navigate("/rate-plans")}>Cancel</button>
            <button className="btn" type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save rate plan"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
