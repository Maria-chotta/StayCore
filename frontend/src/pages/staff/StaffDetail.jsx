import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import "./Staff.css";

function getErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (typeof data === "string") return data;

  if (data?.detail) return String(data.detail);

  if (data && typeof data === "object") {
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

function formatRole(role) {
  return String(role || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function StaffDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/auth/staff/${id}/`);
      setStaff(response.data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load staff member"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const fullName =
    staff &&
    `${staff.first_name || ""} ${staff.last_name || ""}`.trim();

  return (
    <div className="staff-root">
      <div className="staff-detail-header">
        <button
          className="btn-ghost small"
          onClick={() => navigate("/staff")}
        >
          Back to Staff
        </button>

        {!loading && !error && staff && (
          <button
            className="btn"
            onClick={() => navigate(`/staff/${id}/edit`)}
          >
            Edit Staff
          </button>
        )}
      </div>

      <h1>Staff Details</h1>

      {loading && <div className="staff-loading">Loading staff…</div>}

      {error && (
        <div className="staff-error">
          <strong>Unable to load staff member.</strong>
          <div>{error}</div>
          <button className="btn-ghost small" onClick={loadStaff}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && staff && (
        <div className="staff-detail-card">
          <div className="staff-detail-title">
            <div>
              <h2>{fullName || staff.email}</h2>
              <p>{staff.email}</p>
            </div>

            <span
              className={
                staff.is_active
                  ? "staff-status staff-status-active"
                  : "staff-status staff-status-inactive"
              }
            >
              {staff.is_active ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="staff-detail-grid">
            <div>
              <strong>First name</strong>
              <span>{staff.first_name || "-"}</span>
            </div>

            <div>
              <strong>Last name</strong>
              <span>{staff.last_name || "-"}</span>
            </div>

            <div>
              <strong>Email</strong>
              <span>{staff.email || "-"}</span>
            </div>

            <div>
              <strong>Phone</strong>
              <span>{staff.phone || "-"}</span>
            </div>

            <div>
              <strong>Hotel</strong>
              <span>{staff.hotel_name || staff.hotel || "-"}</span>
            </div>

            <div>
              <strong>Role</strong>
              <span>{formatRole(staff.role)}</span>
            </div>

            <div>
              <strong>Status</strong>
              <span>{staff.is_active ? "Active" : "Inactive"}</span>
            </div>

            <div>
              <strong>Created</strong>
              <span>{staff.created_at || "-"}</span>
            </div>

            <div>
              <strong>Updated</strong>
              <span>{staff.updated_at || "-"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
