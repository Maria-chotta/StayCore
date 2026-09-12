import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import "./Maintenance.css";

export default function MaintenanceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [req, setReq] = useState(null);

  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);

  const [selectedStaff, setSelectedStaff] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadRequest() {
      setLoading(true);
      setError(null);

      try {
        const res = await api.get(`/maintenance/${id}/`);

        if (!mounted) return;

        setReq(res.data);

        if (res.data.assigned_to) {
          setSelectedStaff(String(res.data.assigned_to));
        } else {
          setSelectedStaff("");
        }
      } catch (err) {
        if (!mounted) return;

        setError(
          err.response?.data ||
            err.message ||
            "Failed to load request"
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadRequest();

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!req?.hotel) return;

    let mounted = true;

    async function loadStaff() {
      setStaffLoading(true);

      try {
        const res = await api.get("/auth/staff/");

        if (!mounted) return;

        const data = Array.isArray(res.data)
          ? res.data
          : res.data.results || [];

        const maintenanceStaff = data.filter(
          (member) =>
            member.role === "MAINTENANCE" &&
            member.is_active === true &&
            String(member.hotel) === String(req.hotel)
        );

        setStaff(maintenanceStaff);
      } catch (err) {
        // Loading staff is a manager-only capability.
        // If the current user cannot access /auth/staff/,
        // treat it as non-fatal.
        if (!mounted) return;

        setStaff([]);
      } finally {
        if (mounted) {
          setStaffLoading(false);
        }
      }
    }

    loadStaff();

    return () => {
      mounted = false;
    };
  }, [req?.hotel]);

  async function doPatch(patch, action) {
    setActionLoading(action);
    setError(null);

    try {
      const res = await api.patch(
        `/maintenance/${id}/`,
        patch
      );

      setReq(res.data);

      if (res.data.assigned_to) {
        setSelectedStaff(String(res.data.assigned_to));
      } else {
        setSelectedStaff("");
      }
    } catch (err) {
      const response = err.response;

      setError(
        response?.data ||
          err.message ||
          "Action failed"
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAssign() {
    if (!selectedStaff) {
      setError("Please select a maintenance staff member.");
      return;
    }

    const selectedMember = staff.find(
      (member) =>
        String(member.id) === String(selectedStaff)
    );

    const staffName = selectedMember
      ? `${selectedMember.first_name || ""} ${
          selectedMember.last_name || ""
        }`.trim() || selectedMember.email
      : "this staff member";

    if (
      !window.confirm(
        `Assign this request to ${staffName}?`
      )
    ) {
      return;
    }

    // HTML select values are strings.
    // Django REST Framework expects the user primary key
    // as a numeric value.
    const staffId = Number(selectedStaff);

    if (!Number.isInteger(staffId) || staffId <= 0) {
      setError("Invalid maintenance staff selected.");
      return;
    }

    await doPatch(
      {
        assigned_to: staffId,
      },
      "assign"
    );
  }

  async function handleResolve() {
    if (
      !window.confirm(
        "Mark this maintenance request as resolved?"
      )
    ) {
      return;
    }

    await doPatch(
      {
        status: "RESOLVED",
      },
      "resolve"
    );
  }

  async function handleCancel() {
    if (
      !window.confirm(
        "Cancel this maintenance request?"
      )
    ) {
      return;
    }

    await doPatch(
      {
        status: "CANCELLED",
      },
      "cancel"
    );
  }

  return (
    <div className="maintenance-root">

      {/* NAVIGATION */}
      <div
        style={{
          display: "flex",
          gap: 8,
        }}
      >
        <button
          className="btn-ghost small"
          onClick={() => navigate("/maintenance")}
        >
          Back to Maintenance
        </button>

        <button
          className="btn-ghost small"
          onClick={() =>
            navigate(`/maintenance/${id}/edit`)
          }
        >
          Edit
        </button>
      </div>

      <h1>Maintenance Request</h1>

      {/* LOADING */}
      {loading && (
        <div className="maintenance-loading">
          Loading…
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="maintenance-error">
          Error: {JSON.stringify(error)}
        </div>
      )}

      {!loading && !error && req && (
        <div className="maintenance-card">

          {/* HEADER */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div>
              <h2>
                {req.title} — Room{" "}
                {req.room_details?.room_number ||
                  req.room ||
                  ""}
              </h2>

              <div>
                {req.description || ""}
              </div>
            </div>

            {req.status && (
              <div>
                <span
                  className={`task-pill task-pill-${req.status.toLowerCase()}`}
                >
                  {req.status}
                </span>
              </div>
            )}
          </div>

          {/* DETAILS */}
          <div style={{ marginTop: 12 }}>
            <div>
              <strong>Hotel:</strong>{" "}
              {req.hotel || "-"}
            </div>

            <div>
              <strong>Room:</strong>{" "}
              {req.room_details?.room_number ||
                req.room ||
                "-"}
            </div>

            <div>
              <strong>Priority:</strong>{" "}
              {req.priority || "-"}
            </div>

            <div>
              <strong>Reported by:</strong>{" "}
              {req.reported_by_details?.email ||
                req.reported_by ||
                "-"}
            </div>

            <div>
              <strong>Assigned:</strong>{" "}
              {req.assigned_to_details?.email ||
                req.assigned_to ||
                "-"}
            </div>

            <div>
              <strong>Reported at:</strong>{" "}
              {req.reported_at || "-"}
            </div>

            <div>
              <strong>Resolved at:</strong>{" "}
              {req.resolved_at || "-"}
            </div>

            <div>
              <strong>Notes:</strong>{" "}
              {req.notes || "-"}
            </div>
          </div>

          {/* ASSIGNMENT */}
          <div style={{ marginTop: 20 }}>
            <h3>Assign Maintenance Staff</h3>

            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <select
                value={selectedStaff}
                disabled={
                  actionLoading !== null ||
                  staffLoading
                }
                onChange={(e) =>
                  setSelectedStaff(e.target.value)
                }
                style={{
                  padding: 8,
                  borderRadius: 8,
                  border:
                    "1px solid var(--border)",
                  minWidth: 250,
                }}
              >
                <option value="">
                  {staffLoading
                    ? "Loading maintenance staff..."
                    : "Select maintenance staff"}
                </option>

                {staff.map((member) => (
                  <option
                    key={member.id}
                    value={member.id}
                  >
                    {member.first_name || ""}{" "}
                    {member.last_name || ""}{" "}
                    — {member.email}
                  </option>
                ))}
              </select>

              <button
                className="btn-ghost"
                disabled={
                  actionLoading !== null ||
                  staffLoading ||
                  !selectedStaff
                }
                onClick={handleAssign}
              >
                {actionLoading === "assign"
                  ? "Assigning…"
                  : "Assign"}
              </button>
            </div>

            {!staffLoading && staff.length === 0 && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  opacity: 0.75,
                }}
              >
                No active maintenance staff found
                for this hotel.
              </div>
            )}
          </div>

          {/* STATUS */}
          <div style={{ marginTop: 20 }}>
            <h3>Request Status</h3>

            <label>
              Status

              <select
                value={req.status}
                disabled={
                  actionLoading !== null
                }
                onChange={(e) =>
                  doPatch(
                    {
                      status: e.target.value,
                    },
                    "status"
                  )
                }
                style={{
                  marginLeft: 8,
                  padding: 8,
                  borderRadius: 8,
                }}
              >
                <option value="OPEN">
                  Open
                </option>

                <option value="IN_PROGRESS">
                  In Progress
                </option>

                <option value="RESOLVED">
                  Resolved
                </option>

                <option value="CANCELLED">
                  Cancelled
                </option>
              </select>
            </label>
          </div>

          {/* ACTIONS */}
          <div
            style={{
              marginTop: 20,
              display: "flex",
              gap: 8,
            }}
          >
            {(req.status === "OPEN" ||
              req.status === "IN_PROGRESS") && (
              <button
                className="btn"
                disabled={
                  actionLoading !== null
                }
                onClick={handleResolve}
              >
                {actionLoading === "resolve"
                  ? "Resolving…"
                  : "Resolve"}
              </button>
            )}

            {req.status !== "CANCELLED" &&
              req.status !== "RESOLVED" && (
                <button
                  className="btn-ghost"
                  disabled={
                    actionLoading !== null
                  }
                  onClick={handleCancel}
                >
                  {actionLoading === "cancel"
                    ? "Cancelling…"
                    : "Cancel"}
                </button>
              )}
          </div>
        </div>
      )}
    </div>
  );
}