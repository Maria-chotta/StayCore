import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/useAuth";
import "../auth/Login.css";

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

  return <div className="onboarding-field-error">{Array.isArray(error) ? error.join("; ") : String(error)}</div>;
}

function formatApiErrors(responseData) {
  if (!responseData || typeof responseData !== "object") {
    return "Could not create the property. Please try again.";
  }

  return Object.entries(responseData)
    .flatMap(([field, messages]) => {
      const values = Array.isArray(messages) ? messages : [messages];
      return values.map((message) => `${field === "non_field_errors" ? "Property" : field}: ${String(message)}`);
    })
    .join(" ");
}

export default function PropertyOnboarding() {
  const navigate = useNavigate();
  const { user, setActiveHotel, updateHotelMemberships } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(emptyForm);

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
      const response = await api.post("/hotels/", {
        ...form,
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        currency: form.currency.trim().toUpperCase(),
        timezone: form.timezone.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        description: form.description.trim(),
      });
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
        setError(formatApiErrors(responseData));
      } else {
        setError("Could not create the property. Please check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="onboarding-page">
      <section className="onboarding-shell">
        <div className="login-brand"><span>◆</span> StayCore</div>
        <div className="login-intro">
          <p className="login-eyebrow">PROPERTY ONBOARDING</p>
          <h1>{memberships.length ? "Add another property" : "Create your first property"}</h1>
          <p>Set up the hotel property you want to operate, then continue into the dashboard.</p>
        </div>

        <form className="login-form onboarding-form" onSubmit={handleCreateHotel}>
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
                <input id="currency" name="currency" value={form.currency} onChange={handleChange} maxLength={3} />
              </div>
              <div className="login-field">
                <label htmlFor="timezone">Timezone</label>
                <input id="timezone" name="timezone" value={form.timezone} onChange={handleChange} maxLength={50} />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="email">Property email</label>
              <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="hello@property.com" />
            </div>

            <div className="login-field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" value={form.phone} onChange={handleChange} placeholder="+255 700 000 000" maxLength={20} />
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
      </section>
    </main>
  );
}
