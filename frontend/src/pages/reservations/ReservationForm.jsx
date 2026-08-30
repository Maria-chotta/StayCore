import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import "./Reservations.css";

function FieldError({ errors }) {
  if (!errors) return null;
  if (Array.isArray(errors)) return <div className="field-error">{errors.join("; ")}</div>;
  if (typeof errors === "object") {
    const flat = Object.values(errors).flat().join("; ");
    return flat ? <div className="field-error">{flat}</div> : null;
  }
  return <div className="field-error">{String(errors)}</div>;
}

const asList = (data) => (Array.isArray(data) ? data : data?.results || []);

export default function ReservationForm({ mode = "create" }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [hotelOptions, setHotelOptions] = useState([]);
  const [guestOptions, setGuestOptions] = useState([]);
  const [roomOptions, setRoomOptions] = useState([]);

  const [form, setForm] = useState({
    hotel: "",
    guest: "",
    room: "",
    check_in_date: "",
    check_out_date: "",
    adults: 1,
    children: 0,
    special_requests: "",
    notes: "",
    status: "PENDING",
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [hRes, gRes, rRes] = await Promise.all([
          api.get("/hotels/"),
          api.get("/guests/"),
          api.get("/rooms/"),
        ]);
        if (!mounted) return;
        setHotelOptions(asList(hRes.data));
        setGuestOptions(asList(gRes.data));
        setRoomOptions(asList(rRes.data));
      } catch (err) {
        if (mounted) setError("Failed to load form options. " + (err.message || ""));
      }
    })();
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    if (mode !== "edit") return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/reservations/${id}/`);
        if (!mounted) return;
        const d = res.data;
        setForm({
          hotel: d.hotel || "",
          guest: d.guest || "",
          room: d.room || "",
          check_in_date: d.check_in_date || "",
          check_out_date: d.check_out_date || "",
          adults: d.adults ?? 1,
          children: d.children ?? 0,
          special_requests: d.special_requests || "",
          notes: d.notes || "",
          status: d.status || "PENDING",
        });
      } catch (err) {
        if (!mounted) return;
        const data = err.response?.data;
        setError(typeof data === "string" ? data : err.message || "Failed to load reservation");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [mode, id]);

  // Rooms must belong to the selected hotel; guests too.
  const hotelRooms = useMemo(
    () => roomOptions.filter((r) => !form.hotel || String(r.hotel) === String(form.hotel)),
    [roomOptions, form.hotel]
  );
  const hotelGuests = useMemo(
    () => guestOptions.filter((g) => !form.hotel || String(g.hotel) === String(form.hotel)),
    [guestOptions, form.hotel]
  );

  const selectedRoom = roomOptions.find((r) => String(r.id) === String(form.room));
  const nights =
    form.check_in_date && form.check_out_date && form.check_out_date > form.check_in_date
      ? Math.round((new Date(form.check_out_date) - new Date(form.check_in_date)) / 86400000)
      : 0;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((s) => {
      const next = { ...s, [name]: value };

      if (name === "hotel") {
        // Keep guest/room consistent with the chosen hotel.
        if (s.room && String(selectedRoom?.hotel) !== String(value)) next.room = "";
        if (s.guest) {
          const g = guestOptions.find((x) => String(x.id) === String(s.guest));
          if (g && String(g.hotel) !== String(value)) next.guest = "";
        }
      }

      if (name === "room") {
        const room = roomOptions.find((r) => String(r.id) === String(value));
        if (room) {
          const hotelVal = typeof room.hotel === "object" ? room.hotel?.id : room.hotel;
          if (hotelVal) next.hotel = String(hotelVal);
        }
      }

      if (name === "guest") {
        const guest = guestOptions.find((g) => String(g.id) === String(value));
        if (guest && !next.hotel) {
          const hotelVal = typeof guest.hotel === "object" ? guest.hotel?.id : guest.hotel;
          if (hotelVal) next.hotel = String(hotelVal);
        }
      }

      return next;
    });
    setFieldErrors((fe) => ({ ...fe, [name]: undefined }));
    setError(null);
  }

  function validate() {
    const fe = {};
    if (!form.hotel) fe.hotel = ["Hotel is required"];
    if (!form.guest) fe.guest = ["Guest is required"];
    if (!form.room) fe.room = ["Room is required"];
    if (!form.check_in_date) fe.check_in_date = ["Check-in date is required"];
    if (!form.check_out_date) fe.check_out_date = ["Check-out date is required"];
    if (form.check_in_date && form.check_out_date && form.check_out_date <= form.check_in_date) {
      fe.check_out_date = ["Check-out must be after check-in"];
    }
    if (!Number.isFinite(Number(form.adults)) || Number(form.adults) < 1) {
      fe.adults = ["Adults must be at least 1"];
    }
    if (!Number.isFinite(Number(form.children)) || Number(form.children) < 0) {
      fe.children = ["Children must be 0 or greater"];
    }
    return fe;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFieldErrors({});
    const fe = validate();
    if (Object.keys(fe).length) {
      setFieldErrors(fe);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        hotel: Number(form.hotel),
        guest: Number(form.guest),
        room: Number(form.room),
        check_in_date: form.check_in_date,
        check_out_date: form.check_out_date,
        adults: Number(form.adults),
        children: Number(form.children),
        special_requests: form.special_requests,
        notes: form.notes,
        status: mode === "create" ? "PENDING" : form.status,
      };

      let res;
      if (mode === "create") res = await api.post("/reservations/", payload);
      else res = await api.patch(`/reservations/${id}/`, payload);

      navigate(`/reservations/${res.data.id}`);
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object") {
        const fld = {};
        let generic = null;
        Object.keys(data).forEach((k) => {
          if (k === "non_field_errors" || k === "detail") generic = Array.isArray(data[k]) ? data[k].join("; ") : String(data[k]);
          else fld[k] = data[k];
        });
        setFieldErrors(fld);
        // Availability and similar errors come back under "room".
        setError(generic || (fld.room ? undefined : null));
      } else {
        setError(typeof data === "string" ? data : err.message || "Submission failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="reservation-form-root">
      <div className="reservations-header">
        <div>
          <h1>{mode === "create" ? "New Reservation" : "Edit Reservation"}</h1>
          <p className="reservations-subtitle">
            Availability is verified by the server before the booking is accepted.
          </p>
        </div>
      </div>

      {loading && <div className="reservations-loading">Loading…</div>}
      {error && (
        <div className="res-error-banner" role="alert">
          {error}
        </div>
      )}

      {!loading && (
        <form className="res-form-card res-card" onSubmit={handleSubmit} noValidate>
          <div className="res-form-grid">
            <label className="res-field">
              <span>Hotel</span>
              <select name="hotel" value={form.hotel} onChange={handleChange}>
                <option value="">Select hotel</option>
                {hotelOptions.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
              <FieldError errors={fieldErrors.hotel} />
            </label>

            <label className="res-field">
              <span>Guest</span>
              <select name="guest" value={form.guest} onChange={handleChange}>
                <option value="">Select guest</option>
                {hotelGuests.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.first_name} {g.last_name}{g.email ? ` — ${g.email}` : ""}
                  </option>
                ))}
              </select>
              <FieldError errors={fieldErrors.guest} />
            </label>

            <label className="res-field">
              <span>Room</span>
              <select name="room" value={form.room} onChange={handleChange}>
                <option value="">Select room</option>
                {hotelRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} — {r.room_type_name || r.room_type?.name || `type #${r.room_type}`} ({r.status})
                  </option>
                ))}
              </select>
              <FieldError errors={fieldErrors.room} />
            </label>

            <label className="res-field">
              <span>Check-in date</span>
              <input type="date" name="check_in_date" value={form.check_in_date} onChange={handleChange} />
              <FieldError errors={fieldErrors.check_in_date} />
            </label>

            <label className="res-field">
              <span>Check-out date</span>
              <input type="date" name="check_out_date" value={form.check_out_date} onChange={handleChange} />
              <FieldError errors={fieldErrors.check_out_date} />
            </label>

            <label className="res-field">
              <span>Adults</span>
              <input type="number" min="1" name="adults" value={form.adults} onChange={handleChange} />
              <FieldError errors={fieldErrors.adults} />
            </label>

            <label className="res-field">
              <span>Children</span>
              <input type="number" min="0" name="children" value={form.children} onChange={handleChange} />
              <FieldError errors={fieldErrors.children} />
            </label>

            <label className="res-field res-field--wide">
              <span>Special requests</span>
              <textarea name="special_requests" rows="2" value={form.special_requests} onChange={handleChange} />
              <FieldError errors={fieldErrors.special_requests} />
            </label>

            <label className="res-field res-field--wide">
              <span>Internal notes</span>
              <textarea name="notes" rows="2" value={form.notes} onChange={handleChange} />
              <FieldError errors={fieldErrors.notes} />
            </label>
          </div>

          {nights > 0 && (
            <div className="res-summary-row">
              {nights} night{nights !== 1 ? "s" : ""}
              {selectedRoom ? ` · Room ${selectedRoom.room_number}` : ""}
            </div>
          )}

          <div className="res-form-actions">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving…" : mode === "create" ? "Create Reservation" : "Save Changes"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate(mode === "create" ? "/reservations" : `/reservations/${id}`)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
