import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";

const asList = (data) => (Array.isArray(data) ? data : data?.results || []);
const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const emptyCampaign = () => ({
  hotel: Number(localStorage.getItem("active_hotel_id") || ""),
  name: "",
  channel: "",
  offer_code: "",
  discount_percent: "0",
  budget: "",
  starts_on: "",
  ends_on: "",
  status: "PLANNED",
  notes: "",
});

export default function Marketing() {
  const [campaigns, setCampaigns] = useState([]);
  const [campaignBookings, setCampaignBookings] = useState([]);
  const [sourceCounts, setSourceCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyCampaign());

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [campaignResponse, performanceResponse] = await Promise.all([
        api.get("/marketing-campaigns/"),
        api.get("/marketing-campaigns/performance/"),
      ]);
      setCampaigns(asList(campaignResponse.data));
      setCampaignBookings(performanceResponse.data.campaigns || []);
      setSourceCounts(performanceResponse.data.source_counts || {});
    } catch (err) {
      setError(err.response?.data || err.message || "Failed to load campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/marketing-campaigns/", {
        ...form,
        hotel: Number(localStorage.getItem("active_hotel_id") || 0),
        budget: Number(form.budget || 0),
      });
      setShowForm(false);
      setForm(emptyCampaign());
      await load();
    } catch (err) {
      setError(err.response?.data || err.message || "Could not create campaign.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ textTransform: "uppercase", letterSpacing: ".12em", fontSize: 11, color: "#5a6b63", fontWeight: 700 }}>Marketing</div>
          <h1 style={{ margin: "8px 0 0" }}>Campaigns</h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={() => setShowForm((current) => !current)}>{showForm ? "Close" : "New campaign"}</button>
          <button className="btn-ghost" onClick={load}>Refresh</button>
        </div>
      </div>

      {error && <div style={{ border: "1px solid #f4b3b3", background: "#fff5f5", padding: 12, borderRadius: 10, color: "#8a2d2d" }}>{typeof error === "string" ? error : JSON.stringify(error)}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <h2 style={{ marginTop: 0 }}>Add campaign</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label style={{ display: "grid", gap: 6 }}>Channel<input value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 6 }}>Offer code<input value={form.offer_code} onChange={(e) => setForm({ ...form, offer_code: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 6 }}>Discount (%)<input type="number" min="0" max="100" step="0.01" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 6 }}>Budget<input type="number" min="0" step="0.01" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 6 }}>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="PLANNED">Planned</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="COMPLETED">Completed</option>
            </select></label>
            <label style={{ display: "grid", gap: 6 }}>Starts on<input type="date" value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 6 }}>Ends on<input type="date" value={form.ends_on} onChange={(e) => setForm({ ...form, ends_on: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>Notes<textarea rows="3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save campaign"}</button>
          </div>
        </form>
      )}

      {loading ? <div>Loading campaigns…</div> : (
        <div style={{ display: "grid", gap: 20 }}>
          <div style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 14, padding: 16 }}>
            <h2>Campaign-attributed bookings</h2>
            <p>Counts reflect reservations linked to each campaign.</p>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={{ textAlign: "left", padding: 10 }}>Campaign</th>
                <th style={{ textAlign: "left", padding: 10 }}>Channel</th>
                <th style={{ textAlign: "left", padding: 10 }}>Attributed bookings</th>
              </tr></thead>
              <tbody>{campaignBookings.map((campaign) => (
                <tr key={campaign.id}>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{campaign.name}</td>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{campaign.channel || "—"}</td>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{campaign.bookings}</td>
                </tr>
              ))}</tbody>
            </table>
            <h3>Bookings by source</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={{ textAlign: "left", padding: 10 }}>Source</th><th style={{ textAlign: "left", padding: 10 }}>Bookings</th></tr></thead>
              <tbody>{["DIRECT", "PHONE", "OTA", "WALK_IN", "CORPORATE", "OTHER"].map((source) => (
                <tr key={source}>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{source.replaceAll("_", " ")}</td>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{sourceCounts[source] || 0}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 14, padding: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 10 }}>Campaign</th>
                <th style={{ textAlign: "left", padding: 10 }}>Channel</th>
                <th style={{ textAlign: "left", padding: 10 }}>Offer</th>
                <th style={{ textAlign: "left", padding: 10 }}>Budget</th>
                <th style={{ textAlign: "left", padding: 10 }}>Dates</th>
                <th style={{ textAlign: "left", padding: 10 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{campaign.name}</td>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{campaign.channel || "—"}</td>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{campaign.offer_code || "—"} {Number(campaign.discount_percent) > 0 ? `(${campaign.discount_percent}% off)` : ""}</td>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{money(campaign.budget)}</td>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{campaign.starts_on || "—"} to {campaign.ends_on || "—"}</td>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{campaign.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
