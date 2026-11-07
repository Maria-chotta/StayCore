import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";

const today = () => new Date().toLocaleDateString("en-CA");
const asList = (data) => (Array.isArray(data) ? data : data?.results || []);
const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const errorMessage = (error) => {
  const data = error.response?.data;
  if (typeof data === "string") return data;
  if (data?.detail) return data.detail;
  if (data) return Object.entries(data).map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(", ") : value}`).join(" · ");
  return error.message || "The request failed.";
};
const checklist = [
  ["reservations_reviewed", "Review arrivals, departures, and in-house stays"],
  ["payments_reconciled", "Reconcile recorded guest payments"],
  ["cash_reconciled", "Reconcile and close all cash drawer shifts"],
  ["revenue_reviewed", "Review the day's revenue totals"],
];

export default function CloseCalendar() {
  const [businessDate, setBusinessDate] = useState(today);
  const [summary, setSummary] = useState(null);
  const [closes, setCloses] = useState([]);
  const [checks, setChecks] = useState(Object.fromEntries(checklist.map(([key]) => [key, false])));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryResponse, closeResponse] = await Promise.all([
        api.get("/business-day-closes/summary/", { params: { date: businessDate } }),
        api.get("/business-day-closes/"),
      ]);
      setSummary(summaryResponse.data);
      setCloses(asList(closeResponse.data));
      setMessage("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [businessDate]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const closeDay = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.post("/business-day-closes/close/", { business_date: businessDate, ...checks, notes });
      setMessage(`${businessDate} has been closed. Transactions for this business date are now locked.`);
      setChecks(Object.fromEntries(checklist.map(([key]) => [key, false])));
      setNotes("");
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const locked = summary?.is_closed;
  return (
    <section className="finance-page">
      <header className="finance-header">
        <div><span className="finance-eyebrow">BUSINESS DAY CLOSING</span><h1>Close Calendar</h1><p>Review daily operations, reconcile totals, and close a business day.</p></div>
        <div className="finance-header-control"><label htmlFor="close-business-date">Business date</label><input id="close-business-date" type="date" value={businessDate} max={today()} onChange={(event) => setBusinessDate(event.target.value)} /></div>
      </header>
      {error && <div className="finance-alert" role="alert">{error}</div>}
      {message && <div className="finance-success" role="status">{message}</div>}

      {loading ? <div className="finance-card finance-empty">Loading business day summary…</div> : summary && (
        <>
          <div className={`finance-day-banner ${locked ? "is-closed" : ""}`}><div><strong>{locked ? "Business day closed" : "Business day open"}</strong><span>{businessDate}{locked ? " · Financial changes for this date are locked." : " · Complete the checklist before closing."}</span></div><span className="finance-status">{locked ? "CLOSED" : "OPEN"}</span></div>
          <div className="finance-metrics">
            <article className="finance-metric"><span>Arrivals</span><strong>{summary.arrivals}</strong></article>
            <article className="finance-metric"><span>Departures</span><strong>{summary.departures}</strong></article>
            <article className="finance-metric"><span>Completed payments</span><strong>{summary.completed_payment_count}</strong><small>{money(summary.completed_payment_total)}</small></article>
            <article className="finance-metric"><span>Cash drawer shifts</span><strong>{summary.cash_shift_count}</strong><small>{summary.open_cash_shift_count} still open</small></article>
            <article className="finance-metric"><span>Expected cash</span><strong>{money(summary.expected_cash_total)}</strong></article>
          </div>
          <form className="finance-card" onSubmit={closeDay}>
            <div className="finance-card-heading"><div><h2>Business day closing checklist</h2><p>Confirm each reconciliation before locking the selected date.</p></div></div>
            <div className="finance-checklist">
              {checklist.map(([key, label]) => (
                <label className="finance-check-row" key={key}><input type="checkbox" checked={checks[key]} onChange={(event) => setChecks({ ...checks, [key]: event.target.checked })} disabled={locked} /><span>{label}</span></label>
              ))}
            </div>
            {summary.open_cash_shift_count > 0 && <p className="finance-inline-warning">All open cash drawer shifts must be closed before the day can be closed.</p>}
            <label className="finance-notes">Closing notes<textarea rows="3" value={notes} onChange={(event) => setNotes(event.target.value)} disabled={locked} placeholder="Add reconciliation notes or explain any variances." /></label>
            {!locked && <button className="btn" type="submit" disabled={saving || loading || !Object.values(checks).every(Boolean) || summary.open_cash_shift_count > 0}>{saving ? "Closing business day…" : "Complete close & lock day"}</button>}
          </form>
        </>
      )}

      <section className="finance-card">
        <div className="finance-card-heading"><div><h2>Previously closed days</h2><p>Closed periods cannot be edited through the finance workflows.</p></div></div>
        {closes.length === 0 ? <p className="finance-empty">No business days have been closed yet.</p> : <div className="finance-table-wrap"><table className="finance-table">
          <thead><tr><th>Business date</th><th>Closed by</th><th>Closed at</th><th>Checklist</th></tr></thead>
          <tbody>{closes.map((close) => <tr key={close.id}><td><strong>{close.business_date}</strong></td><td>{close.closed_by_name || `User #${close.closed_by}`}</td><td>{new Date(close.closed_at).toLocaleString()}</td><td>Complete</td></tr>)}</tbody>
        </table></div>}
      </section>
    </section>
  );
}
