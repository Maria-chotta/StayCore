import { useEffect, useState } from "react";
import api from "../../services/api";

const asList = (data) => (Array.isArray(data) ? data : data?.results || []);

const emptyProduction = () => ({
  hotel: Number(localStorage.getItem("active_hotel_id") || ""),
  item: "",
  name: "",
  outlet: "",
  quantity: "",
  unit: "servings",
  produced_at: new Date().toISOString().slice(0, 16),
  notes: "",
});

export default function Production() {
  const [records, setRecords] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyProduction());

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [productionRes, inventoryRes] = await Promise.all([
        api.get("/production-records/"),
        api.get("/inventory-items/"),
      ]);
      setRecords(asList(productionRes.data));
      setItems(asList(inventoryRes.data));
    } catch (err) {
      setError(err.response?.data || err.message || "Failed to load production records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/production-records/", {
        ...form,
        hotel: Number(localStorage.getItem("active_hotel_id") || 0),
        item: form.item ? Number(form.item) : null,
        quantity: Number(form.quantity || 0),
        produced_at: form.produced_at ? new Date(form.produced_at).toISOString() : new Date().toISOString(),
      });
      setShowForm(false);
      setForm(emptyProduction());
      await load();
    } catch (err) {
      setError(err.response?.data || err.message || "Could not save production record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ textTransform: "uppercase", letterSpacing: ".12em", fontSize: 11, color: "#5a6b63", fontWeight: 700 }}>Operations</div>
          <h1 style={{ margin: "8px 0 0" }}>Production</h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={() => setShowForm((current) => !current)}>{showForm ? "Close" : "New record"}</button>
          <button className="btn-ghost" onClick={load}>Refresh</button>
        </div>
      </div>

      {error && <div style={{ border: "1px solid #f4b3b3", background: "#fff5f5", padding: 12, borderRadius: 10, color: "#8a2d2d" }}>{typeof error === "string" ? error : JSON.stringify(error)}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <h2 style={{ marginTop: 0 }}>Add production record</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label style={{ display: "grid", gap: 6 }}>Outlet<input value={form.outlet} onChange={(e) => setForm({ ...form, outlet: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 6 }}>Ingredient<select value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })}>
              <option value="">Select stock item</option>
              {items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit})</option>)}
            </select></label>
            <label style={{ display: "grid", gap: 6 }}>Quantity<input type="number" min="0" step="0.001" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required /></label>
            <label style={{ display: "grid", gap: 6 }}>Unit<input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 6 }}>Produced at<input type="datetime-local" value={form.produced_at} onChange={(e) => setForm({ ...form, produced_at: e.target.value })} required /></label>
            <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>Notes<textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save record"}</button>
          </div>
        </form>
      )}

      {loading ? <div>Loading production records…</div> : (
        <div style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 14, padding: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 10 }}>Name</th>
                <th style={{ textAlign: "left", padding: 10 }}>Outlet</th>
                <th style={{ textAlign: "left", padding: 10 }}>Qty</th>
                <th style={{ textAlign: "left", padding: 10 }}>Produced</th>
                <th style={{ textAlign: "left", padding: 10 }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{record.item_name || record.name}</td>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{record.outlet || "—"}</td>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{record.quantity} {record.unit}</td>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{new Date(record.produced_at).toLocaleString()}</td>
                  <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{record.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
