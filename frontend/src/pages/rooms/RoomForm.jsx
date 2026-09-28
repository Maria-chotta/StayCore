import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/useAuth";
import "./Rooms.css";

const initialForm = {
  room_type: "",
  room_number: "",
  floor: 1,
  status: "AVAILABLE",
  is_active: true,
  notes: "",
};

const asList = (data) => (Array.isArray(data) ? data : data?.results || []);

function formatError(data) {
  if (!data || typeof data !== "object") return String(data || "Could not create room.");
  return Object.entries(data)
    .flatMap(([field, messages]) => (Array.isArray(messages) ? messages : [messages]).map((message) => `${field}: ${message}`))
    .join(" ");
}

export default function RoomForm() {
  const navigate = useNavigate();
  const { activeHotelId } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    api.get("/room-types/")
      .then((response) => {
        if (mounted) setRoomTypes(asList(response.data));
      })
      .catch((err) => {
        if (mounted) setError(formatError(err.response?.data || err.message));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const update = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!activeHotelId) {
      setError("Select a hotel before creating a room.");
      return;
    }
    if (!form.room_type || !form.room_number.trim()) {
      setError("Choose a room type and enter a room number.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await api.post("/rooms/", {
        ...form,
        hotel: Number(activeHotelId),
        room_type: Number(form.room_type),
        room_number: form.room_number.trim(),
        floor: Number(form.floor),
      });
      navigate(`/rooms/${response.data.id}`);
    } catch (err) {
      setError(formatError(err.response?.data || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rooms-root room-form-page">
      <div className="rooms-header">
        <div>
          <button className="btn-ghost small" type="button" onClick={() => navigate("/rooms")}>Back to Rooms</button>
          <h1>Create Room</h1>
          <p>Add a room to the currently selected hotel.</p>
        </div>
      </div>
      {error && <div className="rooms-error">{error}</div>}
      <form className="room-form" onSubmit={submit}>
        <label>Room number<input name="room_number" value={form.room_number} onChange={update} maxLength={20} disabled={submitting} placeholder="101" /></label>
        <label>Room type<select name="room_type" value={form.room_type} onChange={update} disabled={loading || submitting}><option value="">{loading ? "Loading room types..." : "Select room type"}</option>{roomTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
        <label>Floor<input name="floor" type="number" min="1" value={form.floor} onChange={update} disabled={submitting} /></label>
        <label>Status<select name="status" value={form.status} onChange={update} disabled={submitting}><option value="AVAILABLE">Available</option><option value="DIRTY">Dirty</option><option value="CLEANING">Cleaning</option><option value="MAINTENANCE">Maintenance</option><option value="OUT_OF_ORDER">Out of order</option></select></label>
        <label>Notes<textarea name="notes" value={form.notes} onChange={update} disabled={submitting} rows={4} /></label>
        <label className="checkbox-label"><input name="is_active" type="checkbox" checked={form.is_active} onChange={update} disabled={submitting} /> Active</label>
        <button className="btn" type="submit" disabled={submitting || loading}>{submitting ? "Creating..." : "Create Room"}</button>
      </form>
    </div>
  );
}