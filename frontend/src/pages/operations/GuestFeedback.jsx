import { useEffect, useState } from "react";
import api from "../../services/api";

const asList = (data) => (Array.isArray(data) ? data : data?.results || []);

const emptyFeedback = () => ({
  hotel: Number(localStorage.getItem("active_hotel_id") || ""),
  guest: "",
  reservation: "",
  rating: "",
  category: "General",
  comment: "",
  status: "NEW",
  follow_up_notes: "",
});

export default function GuestFeedback() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(emptyFeedback());

  const load = async (filter = statusFilter) => {
    try {
      setLoading(true);
      setError("");
      const url = filter && filter !== "ALL" ? `/guest-feedback/?status=${filter}` : "/guest-feedback/";
      const res = await api.get(url);
      const list = asList(res.data);
      setFeedback(list);
      const counts = {
        total: list.length,
        NEW: list.filter((item) => item.status === "NEW").length,
        IN_PROGRESS: list.filter((item) => item.status === "IN_PROGRESS").length,
        RESOLVED: list.filter((item) => item.status === "RESOLVED").length,
      };
      setSummary(counts);
    } catch (err) {
      setError(err.response?.data || err.message || "Failed to load guest feedback.");
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
      await api.post("/guest-feedback/", {
        ...form,
        hotel: Number(localStorage.getItem("active_hotel_id") || 0),
        guest: form.guest ? Number(form.guest) : null,
        reservation: form.reservation ? Number(form.reservation) : null,
        rating: form.rating ? Number(form.rating) : null,
      });
      setShowForm(false);
      setForm(emptyFeedback());
      await load();
    } catch (err) {
      setError(err.response?.data || err.message || "Could not save guest feedback.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ textTransform: "uppercase", letterSpacing: ".12em", fontSize: 11, color: "#5a6b63", fontWeight: 700 }}>Guest experience</div>
          <h1 style={{ margin: "8px 0 0" }}>Comments & feedback</h1>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ minWidth: 150, padding: "8px 10px", borderRadius: 8, border: "1px solid #dfe7e3" }}>
            <option value="ALL">All statuses</option>
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          <button className="btn" onClick={() => setShowForm((current) => !current)}>{showForm ? "Close" : "New feedback"}</button>
          <button className="btn-ghost" onClick={() => load(statusFilter)}>Refresh</button>
        </div>
      </div>

      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
          <div style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 12, padding: 14 }}><div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Total</div><div style={{ fontSize: 28, fontWeight: 800 }}>{summary.total}</div></div>
          <div style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 12, padding: 14 }}><div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>New</div><div style={{ fontSize: 28, fontWeight: 800 }}>{summary.NEW}</div></div>
          <div style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 12, padding: 14 }}><div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>In progress</div><div style={{ fontSize: 28, fontWeight: 800 }}>{summary.IN_PROGRESS}</div></div>
          <div style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 12, padding: 14 }}><div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Resolved</div><div style={{ fontSize: 28, fontWeight: 800 }}>{summary.RESOLVED}</div></div>
        </div>
      )}

      {error && <div style={{ border: "1px solid #f4b3b3", background: "#fff5f5", padding: 12, borderRadius: 10, color: "#8a2d2d" }}>{typeof error === "string" ? error : JSON.stringify(error)}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <h2 style={{ marginTop: 0 }}>Record guest feedback</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 6 }}>Rating<select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
              <option value="">Select</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select></label>
            <label style={{ display: "grid", gap: 6 }}>Guest ID<input type="number" value={form.guest} onChange={(e) => setForm({ ...form, guest: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 6 }}>Reservation ID<input type="number" value={form.reservation} onChange={(e) => setForm({ ...form, reservation: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>Comment<textarea rows="3" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} required /></label>
            <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>Follow-up notes<textarea rows="2" value={form.follow_up_notes} onChange={(e) => setForm({ ...form, follow_up_notes: e.target.value })} /></label>
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save feedback"}</button>
          </div>
        </form>
      )}

      {loading ? <div>Loading feedback…</div> : (
        <div style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 14, padding: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 10 }}>Category</th>
                <th style={{ textAlign: "left", padding: 10 }}>Rating</th>
                <th style={{ textAlign: "left", padding: 10 }}>Comment</th>
                <th style={{ textAlign: "left", padding: 10 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {feedback.map((item) => (
                <tr key={item.id}>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{item.category || "General"}</td>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{item.rating || "—"}</td>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{item.comment}</td>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
