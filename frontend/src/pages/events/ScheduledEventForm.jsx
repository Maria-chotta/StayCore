import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import "../room-types/RoomTypes.css";

const initialForm = {
  name: "",
  venue: "",
  package: "",
  start_at: "",
  end_at: "",
  status: "PLANNED",
  notes: "",
  participants: [],
  charges: [],
};

const asList = (data) => (Array.isArray(data) ? data : data.results || []);

const toDateTimeInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

export default function ScheduledEventForm({ mode = "create" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        const packageRequest = api.get("/event-packages/");
        if (mode === "edit") {
          const [eventResponse, packageResponse] = await Promise.all([api.get(`/events/${id}/`), packageRequest]);
          const event = eventResponse.data;
          setForm({
            name: event.name || "",
            venue: event.venue || "",
            package: event.package ?? "",
            start_at: toDateTimeInput(event.start_at),
            end_at: toDateTimeInput(event.end_at),
            status: event.status || "PLANNED",
            notes: event.notes || "",
            participants: event.participants || [],
            charges: event.charges || [],
          });
          setPackages(asList(packageResponse.data));
        } else {
          const response = await packageRequest;
          setPackages(asList(response.data));
        }
      } catch (err) {
        setError(err.response?.data || err.message || "Failed to load event details.");
      } finally {
        setLoading(false);
      }
    });
  }, [id, mode]);

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.venue.trim() || !form.start_at || !form.end_at) {
      setError("Event name, venue, start time, and end time are required.");
      return;
    }
    if (new Date(form.end_at) <= new Date(form.start_at)) {
      setError("Event end time must be after its start time.");
      return;
    }

    const participants = form.participants.filter((participant) => participant.name.trim()).map(({ name, email, phone, status }) => ({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      status,
    }));
    const charges = form.charges.filter((charge) => charge.description.trim()).map(({ description, quantity, unit_price }) => ({
      description: description.trim(),
      quantity: Number(quantity),
      unit_price: Number(unit_price),
    }));
    if (charges.some((charge) => charge.quantity < 1 || charge.unit_price < 0 || !Number.isFinite(charge.unit_price))) {
      setError("Each charge needs a positive quantity and a valid non-negative unit price.");
      return;
    }

    setSubmitting(true);
    const payload = {
      ...form,
      hotel: Number(localStorage.getItem("active_hotel_id") || 0),
      package: form.package ? Number(form.package) : null,
      name: form.name.trim(),
      venue: form.venue.trim(),
      notes: form.notes.trim(),
      participants,
      charges,
    };

    try {
      if (mode === "create") await api.post("/events/", payload);
      else await api.patch(`/events/${id}/`, payload);
      navigate("/events");
    } catch (err) {
      setError(err.response?.data || err.message || "Could not save event.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateRow = (listName, index, field, value) => {
    setForm((current) => ({
      ...current,
      [listName]: current[listName].map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row),
    }));
  };

  return (
    <div className="room-types-root">
      <div className="room-types-header">
        <div>
          <button className="btn-ghost small" onClick={() => navigate("/events")}>Back to Events</button>
          <h1>{mode === "create" ? "Schedule Event" : "Edit Event"}</h1>
        </div>
      </div>

      {loading && <div className="room-types-loading">Loading event…</div>}
      {error && <div className="room-types-error">{typeof error === "string" ? error : JSON.stringify(error)}</div>}

      {!loading && (
        <form className="room-type-form room-type-form-enhanced" onSubmit={submit}>
          <fieldset className="form-section">
            <legend>Event details</legend>
            <div className="form-section-grid">
              <label className="form-field">Event name<input value={form.name} disabled={submitting} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
              <label className="form-field">Venue<input value={form.venue} disabled={submitting} onChange={(event) => setForm({ ...form, venue: event.target.value })} required /></label>
              <label className="form-field">Event package<select value={form.package} disabled={submitting} onChange={(event) => setForm({ ...form, package: event.target.value })}>
                <option value="">No package</option>
                {packages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select></label>
              <label className="form-field">Status<select value={form.status} disabled={submitting} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="PLANNED">Planned</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select></label>
              <label className="form-field">Start<input type="datetime-local" value={form.start_at} disabled={submitting} onChange={(event) => setForm({ ...form, start_at: event.target.value })} required /></label>
              <label className="form-field">End<input type="datetime-local" value={form.end_at} disabled={submitting} onChange={(event) => setForm({ ...form, end_at: event.target.value })} required /></label>
              <label className="form-field form-field-wide">Notes<textarea value={form.notes} disabled={submitting} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} /></label>
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Participants</legend>
            {form.participants.map((participant, index) => <div className="form-section-grid" key={participant.id || index}>
              <label className="form-field">Name<input value={participant.name} disabled={submitting} onChange={(event) => updateRow("participants", index, "name", event.target.value)} /></label>
              <label className="form-field">Email<input type="email" value={participant.email} disabled={submitting} onChange={(event) => updateRow("participants", index, "email", event.target.value)} /></label>
              <label className="form-field">Phone<input type="tel" value={participant.phone} disabled={submitting} onChange={(event) => updateRow("participants", index, "phone", event.target.value)} /></label>
              <label className="form-field">Status<select value={participant.status} disabled={submitting} onChange={(event) => updateRow("participants", index, "status", event.target.value)}>
                <option value="INVITED">Invited</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="DECLINED">Declined</option>
                <option value="ATTENDED">Attended</option>
              </select></label>
              <button className="btn-ghost small" type="button" disabled={submitting} onClick={() => setForm({ ...form, participants: form.participants.filter((_, rowIndex) => rowIndex !== index) })}>Remove participant</button>
            </div>)}
            <button className="btn-ghost small" type="button" disabled={submitting} onClick={() => setForm({ ...form, participants: [...form.participants, { name: "", email: "", phone: "", status: "INVITED" }] })}>Add participant</button>
          </fieldset>

          <fieldset className="form-section">
            <legend>Charges</legend>
            {form.charges.map((charge, index) => <div className="form-section-grid" key={charge.id || index}>
              <label className="form-field form-field-wide">Description<input value={charge.description} disabled={submitting} onChange={(event) => updateRow("charges", index, "description", event.target.value)} /></label>
              <label className="form-field">Quantity<input type="number" min="1" step="1" value={charge.quantity} disabled={submitting} onChange={(event) => updateRow("charges", index, "quantity", event.target.value)} /></label>
              <label className="form-field">Unit price<input type="number" min="0" step="0.01" value={charge.unit_price} disabled={submitting} onChange={(event) => updateRow("charges", index, "unit_price", event.target.value)} /></label>
              <button className="btn-ghost small" type="button" disabled={submitting} onClick={() => setForm({ ...form, charges: form.charges.filter((_, rowIndex) => rowIndex !== index) })}>Remove charge</button>
            </div>)}
            <button className="btn-ghost small" type="button" disabled={submitting} onClick={() => setForm({ ...form, charges: [...form.charges, { description: "", quantity: 1, unit_price: "" }] })}>Add charge</button>
          </fieldset>
          <div className="form-actions">
            <button className="btn-ghost" type="button" disabled={submitting} onClick={() => navigate("/events")}>Cancel</button>
            <button className="btn" type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save event"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
