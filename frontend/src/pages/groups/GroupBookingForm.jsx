import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import "../room-types/RoomTypes.css";

const initialForm = {
  name: "",
  contact_name: "",
  contact_phone: "",
  group_size: 1,
  start_date: "",
  end_date: "",
  status: "PENDING",
  notes: "",
};

export default function GroupBookingForm({ mode = "create" }) {
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
        const response = await api.get(`/groups/${id}/`);
        setForm({
          name: response.data.name || "",
          contact_name: response.data.contact_name || "",
          contact_phone: response.data.contact_phone || "",
          group_size: response.data.group_size ?? 1,
          start_date: response.data.start_date || "",
          end_date: response.data.end_date || "",
          status: response.data.status || "PENDING",
          notes: response.data.notes || "",
        });
      } catch (err) {
        setError(err.response?.data || err.message || "Failed to load group booking.");
      } finally {
        setLoading(false);
      }
    });
  }, [id, mode]);

  const submit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.contact_name.trim() || !form.start_date || !form.end_date) {
      setError("Name, contact, start date, and end date are required.");
      return;
    }

    setSubmitting(true);
    const payload = {
      ...form,
      name: form.name.trim(),
      contact_name: form.contact_name.trim(),
      contact_phone: form.contact_phone.trim(),
      group_size: Number(form.group_size),
    };

    try {
      if (mode === "create") {
        await api.post("/groups/", payload);
      } else {
        await api.patch(`/groups/${id}/`, payload);
      }
      navigate("/groups");
    } catch (err) {
      setError(err.response?.data || err.message || "Could not save group booking.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="room-types-root">
      <div className="room-types-header">
        <div>
          <button className="btn-ghost small" onClick={() => navigate("/groups")}>Back to Groups</button>
          <h1>{mode === "create" ? "Create Group" : "Edit Group"}</h1>
        </div>
      </div>

      {loading && <div className="room-types-loading">Loading group…</div>}
      {error && <div className="room-types-error">{typeof error === "string" ? error : JSON.stringify(error)}</div>}

      {!loading && (
        <form className="room-type-form room-type-form-enhanced" onSubmit={submit}>
          <fieldset className="form-section">
            <legend>Group details</legend>
            <div className="form-section-grid">
              <label className="form-field form-field-wide">Group name<input value={form.name} disabled={submitting} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
              <label className="form-field">Contact name<input value={form.contact_name} disabled={submitting} onChange={(event) => setForm({ ...form, contact_name: event.target.value })} required /></label>
              <label className="form-field">Contact phone<input type="tel" value={form.contact_phone} disabled={submitting} onChange={(event) => setForm({ ...form, contact_phone: event.target.value })} /></label>
              <label className="form-field">Group size<input type="number" min="1" value={form.group_size} disabled={submitting} onChange={(event) => setForm({ ...form, group_size: event.target.value })} /></label>
            </div>
          </fieldset>
          <fieldset className="form-section">
            <legend>Stay details</legend>
            <div className="form-section-grid">
              <label className="form-field">Arrival<input type="date" value={form.start_date} disabled={submitting} onChange={(event) => setForm({ ...form, start_date: event.target.value })} required /></label>
              <label className="form-field">Departure<input type="date" value={form.end_date} disabled={submitting} onChange={(event) => setForm({ ...form, end_date: event.target.value })} required /></label>
              <label className="form-field form-field-wide">Booking status<select value={form.status} disabled={submitting} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select></label>
            </div>
          </fieldset>
          <label className="form-field form-field-wide">Notes <small>Optional</small><textarea value={form.notes} disabled={submitting} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} /></label>
          <div className="form-actions">
            <button className="btn-ghost" type="button" disabled={submitting} onClick={() => navigate("/groups")}>Cancel</button>
            <button className="btn" type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save group"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
