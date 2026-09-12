import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Plus, CheckCircle2 } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/useAuth";

const emptyForm = {
  name: "",
  address: "",
  city: "",
  country: "Tanzania",
  currency: "TZS",
  timezone: "Africa/Dar_es_Salaam",
  description: "",
  phone: "",
  email: "",
};

function FieldError({ error }) {
  if (!error) return null;

  return <div className="staff-field-error">{Array.isArray(error) ? error.join("; ") : String(error)}</div>;
}

export default function PropertyOnboarding() {
  const navigate = useNavigate();
  const { user, setActiveHotel, updateHotelMemberships } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [existingHotels, setExistingHotels] = useState([]);

  useEffect(() => {
    async function loadHotels() {
      setLoading(true);
      try {
        const response = await api.get("/hotels/");
        const hotels = Array.isArray(response.data) ? response.data : response.data?.results || [];
        setExistingHotels(hotels);
      } catch (err) {
        setError(err.response?.data?.detail || "Could not load your properties.");
      } finally {
        setLoading(false);
      }
    }

    loadHotels();
  }, []);

  const memberships = useMemo(() => Array.isArray(user?.memberships) ? user.memberships : [], [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setError("");
  };

  const validate = () => {
    const errors = {};

    if (!form.name.trim()) errors.name = ["Property name is required."];
    if (!form.address.trim()) errors.address = ["Address is required."];
    if (!form.city.trim()) errors.city = ["City is required."];
    if (!form.country.trim()) errors.country = ["Country is required."];

    return errors;
  };

  const handleCreateHotel = async (event) => {
    event.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await api.post("/hotels/", form);
      const createdHotel = response.data;
      const nextUser = updateHotelMemberships({
        id: createdHotel.id,
        name: createdHotel.name,
        role: "OWNER",
      });

      if (nextUser && setActiveHotel(String(createdHotel.id))) {
        navigate("/dashboard", { replace: true });
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch (err) {
      const responseData = err.response?.data;

      if (responseData && typeof responseData === "object") {
        setFieldErrors(responseData);
        const message = responseData.non_field_errors || responseData.detail;
        if (message) {
          setError(Array.isArray(message) ? message.join("; ") : String(message));
        }
      } else {
        setError(err.response?.data?.detail || "Could not create the property.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-shell" style={{ maxWidth: 1100, width: "100%" }}>
        <div className="login-brand"><span>◆</span> StayCore</div>
        <div className="login-intro">
          <p className="login-eyebrow">PROPERTY ONBOARDING</p>
          <h1>{memberships.length ? "Add another property" : "Create your first property"}</h1>
          <p>Set up the hotel property you want to operate, then continue into the dashboard.</p>
        </div>

        <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1.2fr 0.8fr" }}>
          <form className="login-form" onSubmit={handleCreateHotel}>
            <div className="login-field">
              <label htmlFor="name">Property name</label>
              <input id="name" name="name" value={form.name} onChange={handleChange} placeholder="Sunset Lodge" />
              <FieldError error={fieldErrors.name} />
            </div>

            <div className="login-field">
              <label htmlFor="address">Address</label>
              <input id="address" name="address" value={form.address} onChange={handleChange} placeholder="123 Main Street" />
              <FieldError error={fieldErrors.address} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="login-field">
                <label htmlFor="city">City</label>
                <input id="city" name="city" value={form.city} onChange={handleChange} placeholder="Arusha" />
                <FieldError error={fieldErrors.city} />
              </div>
              <div className="login-field">
                <label htmlFor="country">Country</label>
                <input id="country" name="country" value={form.country} onChange={handleChange} />
                <FieldError error={fieldErrors.country} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="login-field">
                <label htmlFor="currency">Currency</label>
                <input id="currency" name="currency" value={form.currency} onChange={handleChange} />
              </div>
              <div className="login-field">
                <label htmlFor="timezone">Timezone</label>
                <input id="timezone" name="timezone" value={form.timezone} onChange={handleChange} />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="email">Property email</label>
              <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="hello@property.com" />
            </div>

            <div className="login-field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" value={form.phone} onChange={handleChange} placeholder="+255 700 000 000" />
            </div>

            <div className="login-field">
              <label htmlFor="description">Description</label>
              <textarea id="description" name="description" rows={3} value={form.description} onChange={handleChange} placeholder="Short property overview" />
            </div>

            {error && <p className="login-error" role="alert">{error}</p>}

            <button className="login-submit" type="submit" disabled={submitting}>
              {submitting ? "Creating property..." : memberships.length ? "Add property" : "Create property"}
            </button>
          </form>

          <aside className="login-aside" style={{ padding: 24 }}>
            <span className="login-aside-mark">01</span>
            <h2>Property setup</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {loading ? (
                <p>Loading your current properties…</p>
              ) : existingHotels.length === 0 ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div className="property-chip" style={{ display: "flex", alignItems: "center", gap: 8 }}><Building2 size={16} /> No properties yet</div>
                  <p>Create your first property to start managing rooms, reservations, and operations.</p>
                </div>
              ) : (
                existingHotels.map((hotel) => (
                  <button
                    key={hotel.id}
                    type="button"
                    className="panel-link"
                    onClick={() => {
                      setActiveHotel(String(hotel.id));
                      navigate("/dashboard", { replace: true });
                    }}
                    style={{ justifyContent: "space-between", width: "100%", margin: 0 }}
                  >
                    <span>{hotel.name}</span>
                    <CheckCircle2 size={16} />
                  </button>
                ))
              )}
              <button type="button" className="hero-text-link" onClick={() => navigate("/dashboard", { replace: true })} style={{ textAlign: "left", marginTop: 8 }}>
                <Plus size={14} /> Go to dashboard
              </button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
