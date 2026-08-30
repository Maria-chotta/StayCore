import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./Maintenance.css";

export default function Maintenance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const status = searchParams.get("status") || "";
  const q = searchParams.get("q") || "";
  const priority = searchParams.get("priority") || "";
  const roomParam = searchParams.get("room") || "";
  const assignedParam = searchParams.get("assigned_to") || "";

  const STATUS_OPTIONS = [
    { value: "", label: "Active" },
    { value: "ALL", label: "All" },
    { value: "OPEN", label: "Open" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "RESOLVED", label: "Resolved" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  const PRIORITY_OPTIONS = [
    { value: "", label: "All" },
    { value: "LOW", label: "Low" },
    { value: "MEDIUM", label: "Medium" },
    { value: "HIGH", label: "High" },
    { value: "URGENT", label: "Urgent" },
  ];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [itemsRaw, setItemsRaw] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        /*
         * Only send a status to the backend when the user
         * explicitly selected one.
         *
         * When status is empty, the frontend will show
         * OPEN + IN_PROGRESS by default.
         */
        if (status && status !== "ALL") {
          params.set("status", status);
        }

        if (priority) {
          params.set("priority", priority);
        }

        if (roomParam) {
          params.set("room", roomParam);
        }

        if (assignedParam) {
          params.set("assigned_to", assignedParam);
        }

        const qstr = params.toString();
        const url = `/maintenance/${qstr ? `?${qstr}` : ""}`;

        const res = await api.get(url);
        const data = res.data;

        const list = Array.isArray(data)
          ? data
          : data.results || [];

        if (!mounted) return;

        setItemsRaw(list);
      } catch (err) {
        if (!mounted) return;

        setError(
          err.response?.data ||
            err.message ||
            "Failed to load maintenance requests"
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [status, priority, roomParam, assignedParam]);

  const items = useMemo(() => {
    const searchValue = q.trim().toLowerCase();

    let list = itemsRaw.slice();

    /*
     * DEFAULT VIEW
     *
     * When no status is selected, show only active
     * maintenance requests:
     *
     * OPEN
     * IN_PROGRESS
     *
     * RESOLVED and CANCELLED stay hidden.
     */
    if (!status) {
      list = list.filter(
        (item) =>
          item.status === "OPEN" ||
          item.status === "IN_PROGRESS"
      );
    }

    /*
     * "ALL" means show every status returned by backend.
     */
    if (status === "ALL") {
      // No status filtering needed.
    }

    /*
     * Search by title, description, or ID.
     */
    if (searchValue) {
      list = list.filter((item) => {
        return (
          (item.title || "")
            .toLowerCase()
            .includes(searchValue) ||
          (item.description || "")
            .toLowerCase()
            .includes(searchValue) ||
          String(item.id) === searchValue
        );
      });
    }

    return list;
  }, [itemsRaw, q, status]);

  function handleClearFilters() {
    /*
     * Clearing filters returns to the default Active view.
     * This means OPEN + IN_PROGRESS will be shown.
     */
    setSearchParams(new URLSearchParams(), {
      replace: false,
    });
  }

  return (
    <div className="maintenance-root">

      {/* HEADER */}
      <div className="maintenance-header">
        <h1>Maintenance</h1>

        <div style={{ marginLeft: "auto" }}>
          <button
            className="btn"
            onClick={() => navigate("/maintenance/new")}
          >
            Create Request
          </button>
        </div>
      </div>

      {/* TOP BAR */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {loading && (
          <div className="maintenance-loading">
            Loading…
          </div>
        )}

        {!loading && !error && (
          <div className="maintenance-count">
            {items.length} result
            {items.length !== 1 ? "s" : ""}
          </div>
        )}

        <div style={{ marginLeft: "auto" }}>
          <button
            className="btn-ghost small"
            onClick={handleClearFilters}
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="maintenance-error">
          Error: {JSON.stringify(error)}
        </div>
      )}

      {/* FILTERS */}
      <div
        className="maintenance-filters-row"
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 12,
          marginTop: 12,
          flexWrap: "wrap",
        }}
      >
        {/* SEARCH */}
        <input
          aria-label="Search requests"
          placeholder="Search title or description"
          value={q}
          onChange={(e) => {
            const sp = new URLSearchParams(
              searchParams.toString()
            );

            if (e.target.value) {
              sp.set("q", e.target.value);
            } else {
              sp.delete("q");
            }

            setSearchParams(sp, {
              replace: false,
            });
          }}
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid var(--border)",
          }}
        />

        {/* STATUS */}
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            const sp = new URLSearchParams(
              searchParams.toString()
            );

            if (e.target.value) {
              sp.set("status", e.target.value);
            } else {
              sp.delete("status");
            }

            setSearchParams(sp, {
              replace: false,
            });
          }}
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid var(--border)",
          }}
        >
          {STATUS_OPTIONS.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>

        {/* PRIORITY */}
        <select
          aria-label="Filter by priority"
          value={priority}
          onChange={(e) => {
            const sp = new URLSearchParams(
              searchParams.toString()
            );

            if (e.target.value) {
              sp.set("priority", e.target.value);
            } else {
              sp.delete("priority");
            }

            setSearchParams(sp, {
              replace: false,
            });
          }}
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid var(--border)",
          }}
        >
          {PRIORITY_OPTIONS.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>

        {/* ROOM */}
        <input
          aria-label="Filter by room id"
          placeholder="Room id"
          value={roomParam}
          onChange={(e) => {
            const sp = new URLSearchParams(
              searchParams.toString()
            );

            if (e.target.value) {
              sp.set("room", e.target.value);
            } else {
              sp.delete("room");
            }

            setSearchParams(sp, {
              replace: false,
            });
          }}
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid var(--border)",
          }}
        />

        {/* ASSIGNED USER */}
        <input
          aria-label="Filter by assigned id"
          placeholder="Assigned user id"
          value={assignedParam}
          onChange={(e) => {
            const sp = new URLSearchParams(
              searchParams.toString()
            );

            if (e.target.value) {
              sp.set("assigned_to", e.target.value);
            } else {
              sp.delete("assigned_to");
            }

            setSearchParams(sp, {
              replace: false,
            });
          }}
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid var(--border)",
          }}
        />
      </div>

      {/* EMPTY STATE */}
      {!loading &&
        !error &&
        items.length === 0 && (
          <div className="maintenance-empty">
            No maintenance requests found.
          </div>
        )}

      {/* TABLE */}
      {!loading &&
        !error &&
        items.length > 0 && (
          <div className="maintenance-wrap">
            <table className="maintenance-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Room</th>
                  <th>Reported</th>
                  <th>Assigned</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => {
                  const handleClick = () =>
                    navigate(
                      `/maintenance/${item.id}`
                    );

                  const onKeyDown = (e) => {
                    if (
                      e.key === "Enter" ||
                      e.key === " "
                    ) {
                      e.preventDefault();
                      handleClick();
                    }
                  };

                  return (
                    <tr
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={handleClick}
                      onKeyDown={onKeyDown}
                    >
                      {/* TITLE */}
                      <td data-label="Title">
                        {item.title}
                      </td>

                      {/* ROOM */}
                      <td data-label="Room">
                        {item.room_details
                          ?.room_number ||
                          item.room ||
                          "-"}
                      </td>

                      {/* REPORTED */}
                      <td data-label="Reported">
                        {item.reported_at || "-"}
                      </td>

                      {/* ASSIGNED */}
                      <td data-label="Assigned">
                        {item.assigned_to_details
                          ?.email ||
                          item.assigned_to ||
                          "-"}
                      </td>

                      {/* PRIORITY */}
                      <td data-label="Priority">
                        {item.priority}
                      </td>

                      {/* STATUS */}
                      <td data-label="Status">
                        <span
                          className={`task-pill task-pill-${(
                            item.status || "unknown"
                          ).toLowerCase()}`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* ACTION */}
                      <td data-label="Actions">
                        <button
                          className="btn-ghost small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                              `/maintenance/${item.id}`
                            );
                          }}
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
    </div>
  );
}