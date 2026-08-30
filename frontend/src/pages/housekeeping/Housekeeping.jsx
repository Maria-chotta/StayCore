import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./Housekeeping.css";

export default function Housekeeping() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") || "";
  const q = searchParams.get("q") || "";
  const taskType = searchParams.get("task_type") || "";
  const priority = searchParams.get("priority") || "";
  const roomParam = searchParams.get("room") || "";
  const assignedParam = searchParams.get("assigned_to") || "";

  const STATUS_OPTIONS = [
    { value: "", label: "All" },
    { value: "PENDING", label: "Pending" },
    { value: "ASSIGNED", label: "Assigned" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "COMPLETED", label: "Completed" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  const PRIORITY_OPTIONS = [
    { value: "", label: "All" },
    { value: "LOW", label: "Low" },
    { value: "NORMAL", label: "Normal" },
    { value: "HIGH", label: "High" },
    { value: "URGENT", label: "Urgent" },
  ];

  const TASK_TYPES = [
    { value: "", label: "All" },
    { value: "CLEANING", label: "Cleaning" },
    { value: "DEEP_CLEANING", label: "Deep Cleaning" },
    { value: "INSPECTION", label: "Inspection" },
    { value: "LINEN_CHANGE", label: "Linen Change" },
  ];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tasksRaw, setTasksRaw] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (taskType) params.set("task_type", taskType);
        if (priority) params.set("priority", priority);
        if (roomParam) params.set("room", roomParam);
        if (assignedParam) params.set("assigned_to", assignedParam);
        const qstr = params.toString();
        const url = `/housekeeping/${qstr ? `?${qstr}` : ''}`;
        const res = await api.get(url);
        const data = res.data;
        const list = Array.isArray(data) ? data : (data.results || []);
        if (!mounted) return;
        setTasksRaw(list);
      } catch (err) {
        setError(err.response?.data || err.message || "Failed to load housekeeping tasks");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => (mounted = false);
  }, [status, taskType, priority, roomParam, assignedParam]);

  const tasks = useMemo(() => {
    const v = (q || "").trim();
    let list = tasksRaw.slice();
    if (v) {
      list = list.filter((t) => {
        return (t.notes || "").toLowerCase().includes(v.toLowerCase()) || String(t.id).toLowerCase() === v.toLowerCase();
      });
    }
    return list;
  }, [tasksRaw, q]);

  function handleClearFilters() {
    setSearchParams(new URLSearchParams(), { replace: false });
  }

  return (
    <div className="housekeeping-root">
      <div className="housekeeping-header">
        <h1>Housekeeping</h1>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn" onClick={()=> navigate('/housekeeping/new')}>Create Task</button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {loading && <div className="housekeeping-loading">Loading tasks…</div>}
        {!loading && !error && (
          <div className="housekeeping-count">{tasks.length} result{tasks.length !== 1 ? 's' : ''}</div>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn-ghost small" onClick={handleClearFilters}>Clear filters</button>
        </div>
      </div>

      {error && <div className="housekeeping-error">Error: {JSON.stringify(error)}</div>}

      {!loading && !error && tasks.length === 0 && (
        <div className="housekeeping-empty">No housekeeping tasks found.</div>
      )}

      {!loading && !error && tasks.length > 0 && (
        <div className="housekeeping-wrap">
          <div className="housekeeping-filters-row" style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <input
              aria-label="Search tasks"
              placeholder="Search notes or id"
              value={q}
              onChange={(e) => {
                const sp = new URLSearchParams(searchParams.toString());
                if (e.target.value) sp.set('q', e.target.value); else sp.delete('q');
                setSearchParams(sp, { replace: false });
              }}
              style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}
            />

            <select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => {
                const sp = new URLSearchParams(searchParams.toString());
                if (e.target.value) sp.set('status', e.target.value); else sp.delete('status');
                setSearchParams(sp, { replace: false });
              }}
              style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <select
              aria-label="Filter by task type"
              value={taskType}
              onChange={(e) => {
                const sp = new URLSearchParams(searchParams.toString());
                if (e.target.value) sp.set('task_type', e.target.value); else sp.delete('task_type');
                setSearchParams(sp, { replace: false });
              }}
              style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}
            >
              {TASK_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <select
              aria-label="Filter by priority"
              value={priority}
              onChange={(e) => {
                const sp = new URLSearchParams(searchParams.toString());
                if (e.target.value) sp.set('priority', e.target.value); else sp.delete('priority');
                setSearchParams(sp, { replace: false });
              }}
              style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <input
              aria-label="Filter by room id"
              placeholder="Room id"
              value={roomParam}
              onChange={(e) => {
                const sp = new URLSearchParams(searchParams.toString());
                if (e.target.value) sp.set('room', e.target.value); else sp.delete('room');
                setSearchParams(sp, { replace: false });
              }}
              style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}
            />

            <input
              aria-label="Filter by assigned id"
              placeholder="Assigned user id"
              value={assignedParam}
              onChange={(e) => {
                const sp = new URLSearchParams(searchParams.toString());
                if (e.target.value) sp.set('assigned_to', e.target.value); else sp.delete('assigned_to');
                setSearchParams(sp, { replace: false });
              }}
              style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}
            />
          </div>

          <table className="housekeeping-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Room</th>
                <th>Scheduled</th>
                <th>Assigned</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const handleClick = () => navigate(`/housekeeping/${t.id}`);
                const onKeyDown = (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                  }
                };

                return (
                  <tr key={t.id} role="button" tabIndex={0} onClick={handleClick} onKeyDown={onKeyDown}>
                    <td data-label="Task">{t.task_type}</td>
                    <td data-label="Room">{t.room?.room_number || t.room || '-'}</td>
                    <td data-label="Scheduled">{t.scheduled_for ? new Date(t.scheduled_for).toLocaleString() : '-'}</td>
                    <td data-label="Assigned">{t.assigned_to?.email || t.assigned_to || '-'}</td>
                    <td data-label="Priority">{t.priority}</td>
                    <td data-label="Status"><span className={`task-pill task-pill-${(t.status||'unknown').toLowerCase()}`}>{t.status}</span></td>
                    <td data-label="Actions"><button className="btn-ghost small" onClick={(e)=>{ e.stopPropagation(); navigate(`/housekeeping/${t.id}`); }}>View</button></td>
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
