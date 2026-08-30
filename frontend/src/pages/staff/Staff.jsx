import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./Staff.css";

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

function formatRole(role) {
  return String(role || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Staff() {
  const navigate = useNavigate();

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get("/auth/staff/");
      const data = response.data;
      const list = Array.isArray(data) ? data : data.results || [];
      setStaff(list);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load staff"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase();

    return staff.filter((member) => {
      const fullName =
        `${member.first_name || ""} ${member.last_name || ""}`.trim();

      const matchesSearch =
        !query ||
        fullName.toLowerCase().includes(query) ||
        String(member.email || "").toLowerCase().includes(query) ||
        String(member.phone || "").toLowerCase().toLowerCase().includes(query);

      const matchesRole =
        !roleFilter || String(member.role || "") === roleFilter;

      const matchesStatus =
        !statusFilter ||
        (statusFilter === "active" && member.is_active === true) ||
        (statusFilter === "inactive" && member.is_active === false);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [staff, search, roleFilter, statusFilter]);

  const roles = useMemo(
    () =>
      [...new Set(staff.map((member) => member.role).filter(Boolean))].sort(),
    [staff]
  );

  function clearFilters() {
    setSearch("");
    setRoleFilter("");
    setStatusFilter("");
  }

  return (
    <div className="staff-root">
      <div className="staff-header">
        <div>
          <h1>Staff Management</h1>
          <p>Manage hotel staff accounts and their roles.</p>
        </div>

        <button className="btn" onClick={() => navigate("/staff/new")}>
          Add Staff
        </button>
      </div>

      <div className="staff-toolbar">
        <input
          type="search"
          aria-label="Search staff"
          placeholder="Search name, email or phone"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          aria-label="Filter staff by role"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
        >
          <option value="">All roles</option>
          {roles.map((role) => (
            <option key={role} value={role}>
              {formatRole(role)}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter staff by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button className="btn-ghost small" onClick={clearFilters}>
          Clear filters
        </button>

        <button
          className="btn-ghost small"
          onClick={loadStaff}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {loading && <div className="staff-loading">Loading staff…</div>}

      {error && (
        <div className="staff-error">
          <strong>Unable to load staff.</strong>
          <div>{error}</div>
          <button className="btn-ghost small" onClick={loadStaff}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="staff-count">
            {filteredStaff.length} staff member
            {filteredStaff.length !== 1 ? "s" : ""}
          </div>

          {filteredStaff.length === 0 ? (
            <div className="staff-empty">
              <h3>No staff found</h3>
              <p>
                {staff.length === 0
                  ? "There are no staff members to display."
                  : "Try changing your search or filters."}
              </p>
            </div>
          ) : (
            <div className="staff-table-wrap">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Hotel</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStaff.map((member) => {
                    const fullName =
                      `${member.first_name || ""} ${member.last_name || ""}`.trim() ||
                      member.email;

                    return (
                      <tr key={member.id}>
                        <td data-label="Staff">{fullName}</td>
                        <td data-label="Email">{member.email || "-"}</td>
                        <td data-label="Phone">{member.phone || "-"}</td>
                        <td data-label="Hotel">
                          {member.hotel_name || "-"}
                        </td>
                        <td data-label="Role">
                          <span className="staff-role">
                            {formatRole(member.role)}
                          </span>
                        </td>
                        <td data-label="Status">
                          <span
                            className={
                              member.is_active
                                ? "staff-status staff-status-active"
                                : "staff-status staff-status-inactive"
                            }
                          >
                            {member.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td data-label="Actions">
                          <button
                            className="btn-ghost small"
                            onClick={() =>
                              navigate(`/staff/${member.id}`)
                            }
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
