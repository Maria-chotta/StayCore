import { useEffect, useState } from "react";
import api from "../../services/api";

const asList = (data) => (Array.isArray(data) ? data : data?.results || []);

const emptyIncident = () => ({
  hotel: Number(localStorage.getItem("active_hotel_id") || ""),
  incident_type: "",
  occurred_at: new Date().toISOString().slice(0, 16),
  location: "",
  description: "",
  action_taken: "",
  police_reference: "",
  status: "OPEN",
});

export default function IncidentReports() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(emptyIncident());

  const load = async (filter = statusFilter) => {
    try {
      setLoading(true);
      setError("");
      const url = filter && filter !== "ALL" ? `/incident-reports/?status=${filter}` : "/incident-reports/";
      const res = await api.get(url);
      const list = asList(res.data);
      setIncidents(list);
      const counts = {
        total: list.length,
        OPEN: list.filter((item) => item.status === "OPEN").length,
        UNDER_REVIEW: list.filter((item) => item.status === "UNDER_REVIEW").length,
        CLOSED: list.filter((item) => item.status === "CLOSED").length,
      };
      setSummary(counts);
    } catch (err) {
      setError(err.response?.data || err.message || "Failed to load incidents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(statusFilter); }, [statusFilter]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/incident-reports/", {
        ...form,
        hotel: Number(localStorage.getItem("active_hotel_id") || 0),
        occurred_at: form.occurred_at ? new Date(form.occurred_at).toISOString() : new Date().toISOString(),
      });
      setShowForm(false);
      setForm(emptyIncident());
      await load();
    } catch (err) {
      setError(err.response?.data || err.message || "Could not submit incident report.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ textTransform: "uppercase", letterSpacing: ".12em", fontSize: 11, color: "#5a6b63", fontWeight: 700 }}>Security</div>
          <h1 style={{ margin: "8px 0 0" }}>Incident reports</h1>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ minWidth: 150, padding: "8px 10px", borderRadius: 8, border: "1px solid #dfe7e3" }}>
            <option value="ALL">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="UNDER_REVIEW">Under review</option>
            <option value="CLOSED">Closed</option>
          </select>
          <button className="btn" onClick={() => setShowForm((current) => !current)}>{showForm ? "Close" : "New report"}</button>
          <button className="btn-ghost" onClick={() => load(statusFilter)}>Refresh</button>
        </div>
      </div>

      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
          <div style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 12, padding: 14 }}><div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Total</div><div style={{ fontSize: 28, fontWeight: 800 }}>{summary.total}</div></div>
          <div style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 12, padding: 14 }}><div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Open</div><div style={{ fontSize: 28, fontWeight: 800 }}>{summary.OPEN}</div></div>
          <div style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 12, padding: 14 }}><div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Under review</div><div style={{ fontSize: 28, fontWeight: 800 }}>{summary.UNDER_REVIEW}</div></div>
          <div style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 12, padding: 14 }}><div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Closed</div><div style={{ fontSize: 28, fontWeight: 800 }}>{summary.CLOSED}</div></div>
        </div>
      )}

      {error && <div style={{ border: "1px solid #f4b3b3", background: "#fff5f5", padding: 12, borderRadius: 10, color: "#8a2d2d" }}>{typeof error === "string" ? error : JSON.stringify(error)}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <h2 style={{ marginTop: 0 }}>Report incident</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>Type<input value={form.incident_type} onChange={(e) => setForm({ ...form, incident_type: e.target.value })} required /></label>
            <label style={{ display: "grid", gap: 6 }}>Location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required /></label>
            <label style={{ display: "grid", gap: 6 }}>Occurred at<input type="datetime-local" value={form.occurred_at} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} required /></label>
            <label style={{ display: "grid", gap: 6 }}>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="OPEN">Open</option>
              <option value="UNDER_REVIEW">Under review</option>
              <option value="CLOSED">Closed</option>
            </select></label>
            <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>Description<textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></label>
            <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>Action taken<textarea rows="2" value={form.action_taken} onChange={(e) => setForm({ ...form, action_taken: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>Police reference<input value={form.police_reference} onChange={(e) => setForm({ ...form, police_reference: e.target.value })} /></label>
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save report"}</button>
          </div>
        </form>
      )}

      {loading ? <div>Loading incident reports…</div> : (
        <div style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 14, padding: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 10 }}>Type</th>
                <th style={{ textAlign: "left", padding: 10 }}>Location</th>
                <th style={{ textAlign: "left", padding: 10 }}>Occurred</th>
                <th style={{ textAlign: "left", padding: 10 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) => (
                <tr key={incident.id}>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{incident.incident_type}</td>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{incident.location}</td>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{new Date(incident.occurred_at).toLocaleString()}</td>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{incident.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
