import { useEffect, useState } from "react";
import api from "../../services/api";

const asList = (data) => (Array.isArray(data) ? data : data?.results || []);
const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const emptyItem = () => ({
  hotel: Number(localStorage.getItem("active_hotel_id") || ""),
  name: "",
  sku: "",
  category: "",
  unit: "each",
  quantity: "",
  reorder_level: "",
  unit_cost: "",
  is_active: true,
});

const emptyMovement = () => ({
  item: "",
  movement_type: "USAGE",
  quantity: "",
  unit_cost: "",
  notes: "",
});

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMovement, setSavingMovement] = useState(false);
  const [form, setForm] = useState(emptyItem());
  const [movementForm, setMovementForm] = useState(emptyMovement());

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [itemsRes, movementRes] = await Promise.all([
        api.get("/inventory-items/"),
        api.get("/inventory-movements/"),
      ]);
      setItems(asList(itemsRes.data));
      setMovements(asList(movementRes.data));
    } catch (err) {
      setError(err.response?.data || err.message || "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await api.post("/inventory-items/", {
        ...form,
        hotel: Number(localStorage.getItem("active_hotel_id") || 0),
        quantity: Number(form.quantity || 0),
        reorder_level: Number(form.reorder_level || 0),
        unit_cost: Number(form.unit_cost || 0),
      });
      setShowForm(false);
      setForm(emptyItem());
      await load();
    } catch (err) {
      setError(err.response?.data || err.message || "Could not create inventory item.");
    } finally {
      setSaving(false);
    }
  };

  const handleMovementSubmit = async (event) => {
    event.preventDefault();
    setSavingMovement(true);
    setError("");

    try {
      await api.post("/inventory-movements/", {
        item: Number(movementForm.item),
        movement_type: movementForm.movement_type,
        quantity: Number(movementForm.quantity || 0),
        unit_cost: Number(movementForm.unit_cost || 0),
        notes: movementForm.notes || "",
      });
      setShowMovementForm(false);
      setMovementForm(emptyMovement());
      await load();
    } catch (err) {
      setError(err.response?.data || err.message || "Could not record inventory movement.");
    } finally {
      setSavingMovement(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ textTransform: "uppercase", letterSpacing: ".12em", fontSize: 11, color: "#5a6b63", fontWeight: 700 }}>Operations</div>
          <h1 style={{ margin: "8px 0 0" }}>Inventory</h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={() => setShowForm((current) => !current)}>{showForm ? "Close" : "New item"}</button>
          <button className="btn-ghost" onClick={() => setShowMovementForm((current) => !current)}>{showMovementForm ? "Close" : "Add movement"}</button>
          <button className="btn-ghost" onClick={load}>Refresh</button>
        </div>
      </div>

      {error && <div style={{ border: "1px solid #f4b3b3", background: "#fff5f5", padding: 12, borderRadius: 10, color: "#8a2d2d" }}>{typeof error === "string" ? error : JSON.stringify(error)}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <h2 style={{ marginTop: 0 }}>Add inventory item</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label style={{ display: "grid", gap: 6 }}>SKU<input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 6 }}>Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 6 }}>Unit<input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 6 }}>Quantity<input type="number" min="0" step="0.001" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 6 }}>Reorder level<input type="number" min="0" step="0.001" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 6 }}>Unit cost<input type="number" min="0" step="0.01" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} /></label>
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save item"}</button>
          </div>
        </form>
      )}

      {showMovementForm && (
        <form onSubmit={handleMovementSubmit} style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <h2 style={{ marginTop: 0 }}>Record stock movement</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>Item<select value={movementForm.item} onChange={(e) => setMovementForm({ ...movementForm, item: e.target.value })} required>
              <option value="">Select item</option>
              {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select></label>
            <label style={{ display: "grid", gap: 6 }}>Type<select value={movementForm.movement_type} onChange={(e) => setMovementForm({ ...movementForm, movement_type: e.target.value })}>
              <option value="PURCHASE">Purchase</option>
              <option value="USAGE">Usage</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="PRODUCTION">Production</option>
            </select></label>
            <label style={{ display: "grid", gap: 6 }}>Quantity<input type="number" min="0" step="0.001" value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })} required /></label>
            <label style={{ display: "grid", gap: 6 }}>Unit cost<input type="number" min="0" step="0.01" value={movementForm.unit_cost} onChange={(e) => setMovementForm({ ...movementForm, unit_cost: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>Notes<textarea rows="2" value={movementForm.notes} onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}></textarea></label>
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="btn-ghost" onClick={() => setShowMovementForm(false)}>Cancel</button>
            <button className="btn" type="submit" disabled={savingMovement}>{savingMovement ? "Saving..." : "Save movement"}</button>
          </div>
        </form>
      )}

      {loading ? <div>Loading inventory…</div> : (
        <div style={{ display: "grid", gap: 20 }}>
          <div style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 14, padding: 16 }}>
            <h2>Stock items</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 10 }}>Name</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Category</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Qty</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Reorder</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Unit cost</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{item.name}</td>
                    <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{item.category || "—"}</td>
                    <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{item.quantity}</td>
                    <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{item.reorder_level}</td>
                    <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{money(item.unit_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 14, padding: 16 }}>
            <h2>Movement history</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 10 }}>Item</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Type</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Qty</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{movement.item_name || movement.item || "—"}</td>
                    <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{movement.movement_type}</td>
                    <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{movement.quantity}</td>
                    <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{movement.notes || "—"}</td>
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
