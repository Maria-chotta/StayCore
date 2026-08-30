import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import "./Staff.css";

const STAFF_ROLES = [
  { value: "MANAGER", label: "Manager" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "HOUSEKEEPER", label: "Housekeeper" },
  { value: "MAINTENANCE", label: "Maintenance" },
];

function getErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (typeof data === "string") return data;

  if (data && typeof data === "object") {
    if (data.detail) return String(data.detail);

    if (data.non_field_errors) {
      return Array.isArray(data.non_field_errors)
        ? data.non_field_errors.join("; ")
        : String(data.non_field_errors);
    }

    const messages = Object.entries(data)
      .map(([field, value]) => {
        const message = Array.isArray(value) ? value.join(", ") : String(value);
        return `${field}: ${message}`;
      })
      .join("; ");

    if (messages) return messages;
  }

  return error?.message || fallback;
}

function FieldError({ error }) {
  if (!error) return null;

  return (
    <div className="staff-field-error">
      {Array.isArray(error) ? error.join("; ") : String(error)}
    </div>
  );
}

export default function StaffForm({ mode = "create" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = mode === "edit";

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [hotels, setHotels] = useState([]);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    hotel: "",
    role: "RECEPTIONIST",
    is_active: true,
  });

  useEffect(() => {
    let mounted = true;

    async function loadHotels() {
      try {
        const response = await api.get("/hotels/");
        const data = response.data;
        const hotelList = Array.isArray(data) ? data : data.results || [];

        const uniqueHotels = hotelList.map((hotel) => ({
          id: hotel.id,
          name: hotel.name,
        }));

        if (mounted) {
          setHotels(uniqueHotels);

          if (!isEdit && uniqueHotels.length === 1) {
            setForm((current) => ({
              ...current,
              hotel: String(uniqueHotels[0].id),
            }));
          }
        }
      } catch (err) {
        if (mounted) {
          setError(getErrorMessage(err, "Failed to load hotel information"));
        }
      }
    }

    loadHotels();

    return () => {
      mounted = false;
    };
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;

    let mounted = true;

    async function loadStaff() {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get(`/auth/staff/${id}/`);
        const member = response.data;

        if (!mounted) return;

        setForm({
          first_name: member.first_name || "",
          last_name: member.last_name || "",
          email: member.email || "",
          phone: member.phone || "",
          password: "",
          hotel: member.hotel ? String(member.hotel) : "",
          role: member.role || "RECEPTIONIST",
          is_active: member.is_active !== false,
        });
      } catch (err) {
        if (mounted) {
          setError(getErrorMessage(err, "Failed to load staff member"));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadStaff();

    return () => {
      mounted = false;
    };
  }, [id, isEdit]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [name]: undefined,
    }));

    setError(null);
  }

  function validate() {
    const errors = {};

    if (!form.first_name.trim()) {
      errors.first_name = ["First name is required."];
    }

    if (!form.last_name.trim()) {
      errors.last_name = ["Last name is required."];
    }

    if (!form.email.trim()) {
      errors.email = ["Email is required."];
    }

    if (!isEdit && !form.password) {
      errors.password = ["Password is required."];
    }

    if (!isEdit && form.password && form.password.length < 8) {
      errors.password = ["Password must be at least 8 characters."];
    }

    if (!form.hotel) {
      errors.hotel = ["Hotel is required."];
    }

    if (!form.role) {
      errors.role = ["Role is required."];
    }

    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setFieldErrors({});
    setError(null);

    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        is_active: form.is_active,
      };

      if (!isEdit) {
        payload.password = form.password;
        payload.hotel = form.hotel;
      } else if (form.password) {
        payload.password = form.password;
      }

      if (isEdit) {
        await api.patch(`/auth/staff/${id}/`, payload);
        navigate(`/staff/${id}`);
      } else {
        const response = await api.post("/auth/staff/", payload);
        navigate(`/staff/${response.data.id}`);
      }
    } catch (err) {
      const responseData = err.response?.data;

      if (responseData && typeof responseData === "object") {
        setFieldErrors(responseData);

        if (responseData.non_field_errors) {
          setError(
            Array.isArray(responseData.non_field_errors)
              ? responseData.non_field_errors.join("; ")
              : String(responseData.non_field_errors)
          );
        }
      } else {
        setError(getErrorMessage(err, "Failed to save staff member"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="staff-root">
      <div className="staff-form-header">
        <button
          className="btn-ghost small"
          type="button"
          onClick={() =>
            navigate(isEdit && id ? `/staff/${id}` : "/staff")
          }
        >
          {isEdit ? "Back to Staff" : "Back to Staff"}
        </button>

        <h1>{isEdit ? "Edit Staff" : "Create Staff"}</h1>
      </div>

      {loading && <div className="staff-loading">Loading staff…</div>}

      {!loading && (
        <>
          {error && <div className="staff-error">{error}</div>}

          <form className="staff-form" onSubmit={handleSubmit}>
            <div className="staff-form-grid">
              <label>
                First name
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  autoComplete="given-name"
                />
                <FieldError error={fieldErrors.first_name} />
              </label>

              <label>
                Last name
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  autoComplete="family-name"
                />
                <FieldError error={fieldErrors.last_name} />
              </label>

              <label>
                Email
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
                <FieldError error={fieldErrors.email} />
              </label>

              <label>
                Phone
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                />
                <FieldError error={fieldErrors.phone} />
              </label>

              {!isEdit && (
                <label>
                  Password
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    minLength={8}
                  />
                  <small>Minimum 8 characters.</small>
                  <FieldError error={fieldErrors.password} />
                </label>
              )}

              {isEdit && (
                <label>
                  New password
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    minLength={8}
                  />
                  <small>Leave blank to keep the current password.</small>
                  <FieldError error={fieldErrors.password} />
                </label>
              )}

              {!isEdit && (
                <label>
                  Hotel
                  <select
                    name="hotel"
                    value={form.hotel}
                    onChange={handleChange}
                  >
                    <option value="">Select hotel</option>
                    {hotels.map((hotel) => (
                      <option key={hotel.id} value={hotel.id}>
                        {hotel.name}
                      </option>
                    ))}
                  </select>
                  <FieldError error={fieldErrors.hotel} />
                </label>
              )}

              <label>
                Role
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                >
                  {STAFF_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <FieldError error={fieldErrors.role} />
              </label>

              <label className="staff-checkbox">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                />
                <span>Active account</span>
                <FieldError error={fieldErrors.is_active} />
              </label>
            </div>

            <div className="staff-form-actions">
              <button
                className="btn"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? "Saving…"
                  : isEdit
                    ? "Save changes"
                    : "Create staff"}
              </button>

              <button
                className="btn-ghost"
                type="button"
                disabled={submitting}
                onClick={() =>
                  navigate(isEdit && id ? `/staff/${id}` : "/staff")
                }
              >
                Cancel
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

