import { useEffect, useState } from "react";
import api from "../../services/api";

const asList = (data) => (Array.isArray(data) ? data : data?.results || []);
const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const emptyShift = () => ({
  hotel: Number(localStorage.getItem("active_hotel_id") || ""),
  opening_cash: "",
  notes: "",
});

const emptyEntry = () => ({
  shift: "",
  entry_type: "CASH_IN",
  amount: "",
  description: "",
});

export default function CashDrawer() {
  const [shifts, setShifts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [savingShift, setSavingShift] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [shiftForm, setShiftForm] = useState(emptyShift());
  const [entryForm, setEntryForm] = useState(emptyEntry());

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [shiftRes, entryRes] = await Promise.all([
        api.get("/cash-drawer-shifts/"),
        api.get("/cash-drawer-entries/"),
      ]);
      setShifts(asList(shiftRes.data));
      setEntries(asList(entryRes.data));
      if (!entryForm.shift && asList(shiftRes.data).length) {
        setEntryForm((current) => ({ ...current, shift: String(asList(shiftRes.data)[0].id) }));
      }
    } catch (err) {
      setError(err.response?.data || err.message || "Failed to load cash drawer records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleShiftSubmit = async (event) => {
    event.preventDefault();
    setSavingShift(true);
    setError("");
    try {
      await api.post("/cash-drawer-shifts/", {
        hotel: Number(localStorage.getItem("active_hotel_id") || 0),
        opening_cash: Number(shiftForm.opening_cash || 0),
        notes: shiftForm.notes || "",
      });
      setShowShiftForm(false);
      setShiftForm(emptyShift());
      await load();
    } catch (err) {
      setError(err.response?.data || err.message || "Could not open drawer shift.");
    } finally {
      setSavingShift(false);
    }
  };

  const handleEntrySubmit = async (event) => {
    event.preventDefault();
    setSavingEntry(true);
    setError("");
    try {
      await api.post("/cash-drawer-entries/", {
        shift: Number(entryForm.shift),
        entry_type: entryForm.entry_type,
        amount: Number(entryForm.amount || 0),
        description: entryForm.description,
      });
      setShowEntryForm(false);
      setEntryForm(emptyEntry());
      await load();
    } catch (err) {
      setError(err.response?.data || err.message || "Could not add ledger entry.");
    } finally {
      setSavingEntry(false);
    }
  };

  const handleCloseShift = async (shift) => {
    const countedCashInput = window.prompt(`Enter counted cash for shift #${shift.id}.`, shift.expected_cash ?? shift.opening_cash ?? "0");
    if (countedCashInput === null) {
      return;
    }

    const countedCash = Number(countedCashInput);
    if (Number.isNaN(countedCash) || countedCash < 0) {
      setError("Please enter a valid counted cash value.");
      return;
    }

    try {
      setError("");
      await api.post(`/cash-drawer-shifts/${shift.id}/close/`, {
        counted_cash: countedCash,
        expected_cash: Number(shift.expected_cash ?? shift.opening_cash ?? 0),
        notes: shift.notes || "",
      });
      await load();
    } catch (err) {
      setError(err.response?.data || err.message || "Could not close the shift.");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ textTransform: "uppercase", letterSpacing: ".12em", fontSize: 11, color: "#5a6b63", fontWeight: 700 }}>Finance</div>
          <h1 style={{ margin: "8px 0 0" }}>Cash drawer</h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={() => setShowShiftForm((current) => !current)}>{showShiftForm ? "Close" : "Open shift"}</button>
          <button className="btn-ghost" onClick={() => setShowEntryForm((current) => !current)}>{showEntryForm ? "Close" : "Add entry"}</button>
          <button className="btn-ghost" onClick={load}>Refresh</button>
        </div>
      </div>

      {error && <div style={{ border: "1px solid #f4b3b3", background: "#fff5f5", padding: 12, borderRadius: 10, color: "#8a2d2d" }}>{typeof error === "string" ? error : JSON.stringify(error)}</div>}

      {(showShiftForm || showEntryForm) && (
        <div style={{ display: "grid", gap: 16, marginBottom: 20 }}>
          {showShiftForm && (
            <form onSubmit={handleShiftSubmit} style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 14, padding: 16 }}>
              <h2 style={{ marginTop: 0 }}>Open cash drawer shift</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                <label style={{ display: "grid", gap: 6 }}>Opening cash<input type="number" min="0" step="0.01" value={shiftForm.opening_cash} onChange={(e) => setShiftForm({ ...shiftForm, opening_cash: e.target.value })} required /></label>
                <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>Notes<textarea rows="3" value={shiftForm.notes} onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })} /></label>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <button type="button" className="btn-ghost" onClick={() => setShowShiftForm(false)}>Cancel</button>
                <button className="btn" type="submit" disabled={savingShift}>{savingShift ? "Saving..." : "Open shift"}</button>
              </div>
            </form>
          )}

          {showEntryForm && (
            <form onSubmit={handleEntrySubmit} style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 14, padding: 16 }}>
              <h2 style={{ marginTop: 0 }}>Add cash ledger entry</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                <label style={{ display: "grid", gap: 6 }}>Shift<select value={entryForm.shift} onChange={(e) => setEntryForm({ ...entryForm, shift: e.target.value })} required>
                  <option value="">Select shift</option>
                  {shifts.map((shift) => <option key={shift.id} value={shift.id}>#{shift.id} · {new Date(shift.opened_at).toLocaleDateString()}</option>)}
                </select></label>
                <label style={{ display: "grid", gap: 6 }}>Type<select value={entryForm.entry_type} onChange={(e) => setEntryForm({ ...entryForm, entry_type: e.target.value })}>
                  <option value="CASH_IN">Cash in</option>
                  <option value="CASH_OUT">Cash out</option>
                </select></label>
                <label style={{ display: "grid", gap: 6 }}>Amount<input type="number" min="0" step="0.01" value={entryForm.amount} onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })} required /></label>
                <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>Description<input value={entryForm.description} onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })} required /></label>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <button type="button" className="btn-ghost" onClick={() => setShowEntryForm(false)}>Cancel</button>
                <button className="btn" type="submit" disabled={savingEntry}>{savingEntry ? "Saving..." : "Save entry"}</button>
              </div>
            </form>
          )}
        </div>
      )}

      {loading ? <div>Loading drawer shifts…</div> : (
        <div style={{ display: "grid", gap: 20 }}>
          <div style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 14, padding: 16 }}>
            <h2>Shift summary</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 10 }}>Opened</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Opening cash</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Expected</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Counted</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Variance</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => (
                  <tr key={shift.id}>
                    <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{new Date(shift.opened_at).toLocaleString()}</td>
                    <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{money(shift.opening_cash)}</td>
                    <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{money(shift.expected_cash)}</td>
                    <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{shift.counted_cash ? money(shift.counted_cash) : "—"}</td>
                    <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{shift.variance != null ? money(shift.variance) : "—"}</td>
                    <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span>{shift.status}</span>
                        {shift.status !== "CLOSED" && (
                          <button type="button" className="btn-ghost" onClick={() => handleCloseShift(shift)}>Close shift</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e6ebe8", borderRadius: 14, padding: 16 }}>
            <h2>Shift ledger</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 10 }}>Type</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Amount</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Description</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{entry.entry_type}</td>
                    <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{money(entry.amount)}</td>
                    <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{entry.description}</td>
                    <td style={{ padding: 10, borderTop: "1px solid #edf1ef" }}>{new Date(entry.created_at).toLocaleString()}</td>
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
