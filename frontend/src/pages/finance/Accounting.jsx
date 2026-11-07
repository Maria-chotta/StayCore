import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const asList = (data) => (Array.isArray(data) ? data : data?.results || []);
const today = () => new Date().toLocaleDateString("en-CA");
const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const errorMessage = (error) => {
  const data = error.response?.data;
  if (typeof data === "string") return data;
  if (data?.detail) return data.detail;
  if (data) return Object.entries(data).map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(", ") : value}`).join(" · ");
  return error.message || "The request failed.";
};
const emptyLine = (accountId = "") => ({ account: String(accountId), description: "", debit: "", credit: "" });

export default function Accounting() {
  const [accounts, setAccounts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [reports, setReports] = useState(null);
  const [period, setPeriod] = useState({ start_date: "", end_date: "" });
  const [accountForm, setAccountForm] = useState({ code: "", name: "", account_type: "ASSET" });
  const [entryForm, setEntryForm] = useState({ entry_date: today(), reference: "", description: "", lines: [emptyLine(), emptyLine()] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [accountResponse, entryResponse, reportResponse] = await Promise.all([
        api.get("/ledger-accounts/"),
        api.get("/journal-entries/"),
        api.get("/accounting-reports/", { params: period }),
      ]);
      setAccounts(asList(accountResponse.data));
      setEntries(asList(entryResponse.data));
      setReports(reportResponse.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const seedAccounts = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await api.post("/ledger-accounts/seed-defaults/", {});
      setAccounts(asList(response.data));
      setMessage("Default chart of accounts is ready.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const createAccount = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/ledger-accounts/", {
        ...accountForm,
        hotel: Number(localStorage.getItem("active_hotel_id") || 0),
      });
      setAccountForm({ code: "", name: "", account_type: "ASSET" });
      setMessage("Ledger account created.");
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const changeLine = (index, field, value) => {
    setEntryForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line),
    }));
  };

  const totals = useMemo(() => entryForm.lines.reduce((result, line) => ({
    debit: result.debit + Number(line.debit || 0),
    credit: result.credit + Number(line.credit || 0),
  }), { debit: 0, credit: 0 }), [entryForm.lines]);

  const createEntry = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.post("/journal-entries/", {
        hotel: Number(localStorage.getItem("active_hotel_id") || 0),
        ...entryForm,
        lines: entryForm.lines.map((line) => ({
          ...line,
          account: Number(line.account),
          debit: Number(line.debit || 0),
          credit: Number(line.credit || 0),
        })),
      });
      setEntryForm({ entry_date: today(), reference: "", description: "", lines: [emptyLine(accounts[0]?.id), emptyLine(accounts[0]?.id)] });
      setMessage("Draft journal entry saved. Post it after review.");
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const postEntry = async (entryId) => {
    setSaving(true);
    setError("");
    try {
      await api.post(`/journal-entries/${entryId}/post/`, {});
      setMessage(`Journal entry #${entryId} posted.`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="finance-page">
      <header className="finance-header">
        <div><span className="finance-eyebrow">GENERAL LEDGER</span><h1>Accounting</h1><p>Maintain the chart of accounts, post balanced journals, and review financial statements.</p></div>
        <button className="btn-ghost" type="button" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
      </header>
      {error && <div className="finance-alert" role="alert">{error}</div>}
      {message && <div className="finance-success" role="status">{message}</div>}

      {accounts.length === 0 && <div className="finance-day-banner"><div><strong>Set up the chart of accounts</strong><span>Start with a standard hotel ledger, then add accounts to match your bookkeeping needs.</span></div><button className="btn" type="button" onClick={seedAccounts} disabled={saving}>{saving ? "Setting up…" : "Create default accounts"}</button></div>}

      <div className="finance-columns">
        <section className="finance-card">
          <div className="finance-card-heading"><div><h2>Chart of accounts</h2><p>Accounts available for journal entries and reports.</p></div></div>
          <form className="finance-form-grid finance-form-compact" onSubmit={createAccount}>
            <label>Code<input value={accountForm.code} onChange={(event) => setAccountForm({ ...accountForm, code: event.target.value })} required maxLength="20" /></label>
            <label>Account name<input value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} required maxLength="160" /></label>
            <label>Type<select value={accountForm.account_type} onChange={(event) => setAccountForm({ ...accountForm, account_type: event.target.value })}>{["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].map((type) => <option key={type}>{type}</option>)}</select></label>
            <button className="btn" type="submit" disabled={saving}>Add account</button>
          </form>
          <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Code</th><th>Name</th><th>Type</th></tr></thead>
            <tbody>{accounts.map((account) => <tr key={account.id}><td>{account.code}</td><td>{account.name}</td><td>{account.account_type}</td></tr>)}</tbody>
          </table></div>
        </section>

        <form className="finance-card" onSubmit={createEntry}>
          <div className="finance-card-heading"><div><h2>New journal entry</h2><p>Debits and credits must balance before posting.</p></div></div>
          <div className="finance-form-grid">
            <label>Date<input type="date" value={entryForm.entry_date} onChange={(event) => setEntryForm({ ...entryForm, entry_date: event.target.value })} required /></label>
            <label>Reference<input value={entryForm.reference} onChange={(event) => setEntryForm({ ...entryForm, reference: event.target.value })} /></label>
            <label className="finance-span-all">Description<input value={entryForm.description} onChange={(event) => setEntryForm({ ...entryForm, description: event.target.value })} required /></label>
          </div>
          <div className="finance-journal-lines">
            {entryForm.lines.map((line, index) => <div className="finance-journal-line" key={index}>
              <label>Account<select value={line.account} onChange={(event) => changeLine(index, "account", event.target.value)} required><option value="">Select account</option>{accounts.filter((account) => account.is_active).map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}</select></label>
              <label>Debit<input type="number" min="0" step="0.01" value={line.debit} onChange={(event) => { changeLine(index, "debit", event.target.value); changeLine(index, "credit", ""); }} /></label>
              <label>Credit<input type="number" min="0" step="0.01" value={line.credit} onChange={(event) => { changeLine(index, "credit", event.target.value); changeLine(index, "debit", ""); }} /></label>
              <button className="btn-ghost small" type="button" aria-label={`Remove line ${index + 1}`} disabled={entryForm.lines.length <= 2} onClick={() => setEntryForm({ ...entryForm, lines: entryForm.lines.filter((_, lineIndex) => lineIndex !== index) })}>×</button>
            </div>)}
          </div>
          <div className="finance-journal-total"><button className="btn-ghost small" type="button" onClick={() => setEntryForm({ ...entryForm, lines: [...entryForm.lines, emptyLine(accounts[0]?.id)] })}>Add line</button><span>Debits {money(totals.debit)} · Credits {money(totals.credit)}</span></div>
          <button className="btn" type="submit" disabled={saving || accounts.length === 0 || totals.debit <= 0 || totals.debit !== totals.credit}>{saving ? "Saving…" : "Save draft journal"}</button>
        </form>
      </div>

      <section className="finance-card">
        <div className="finance-card-heading"><div><h2>Journal entries</h2><p>Draft entries can be posted after review. Posted entries are immutable.</p></div></div>
        {entries.length === 0 ? <p className="finance-empty">No journal entries yet.</p> : <div className="finance-table-wrap"><table className="finance-table">
          <thead><tr><th>Date</th><th>Reference</th><th>Description</th><th>Debits</th><th>Credits</th><th>Status</th><th /></tr></thead>
          <tbody>{entries.map((entry) => {
            const debit = entry.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
            const credit = entry.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
            return <tr key={entry.id}><td>{entry.entry_date}</td><td>{entry.reference || "—"}</td><td>{entry.description}</td><td>{money(debit)}</td><td>{money(credit)}</td><td><span className={`finance-status finance-status--${entry.status.toLowerCase()}`}>{entry.status}</span></td><td>{entry.status === "DRAFT" && <button className="btn-ghost small" type="button" disabled={saving} onClick={() => postEntry(entry.id)}>Post</button>}</td></tr>;
          })}</tbody>
        </table></div>}
      </section>

      <section className="finance-card">
        <div className="finance-card-heading"><div><h2>Financial statements</h2><p>Reports include posted journal entries for the selected period.</p></div></div>
        <div className="finance-report-filters">
          <label>From<input type="date" value={period.start_date} onChange={(event) => setPeriod({ ...period, start_date: event.target.value })} /></label>
          <label>To<input type="date" value={period.end_date} onChange={(event) => setPeriod({ ...period, end_date: event.target.value })} /></label>
        </div>
        {reports && <div className="finance-statements">
          <article className="finance-report"><h3>Income statement</h3><p><span>Revenue</span><strong>{money(reports.income_statement.revenue)}</strong></p><p><span>Expenses</span><strong>{money(reports.income_statement.expenses)}</strong></p><p className="finance-report-total"><span>Net income</span><strong>{money(reports.income_statement.net_income)}</strong></p></article>
          <article className="finance-report"><h3>Balance sheet</h3><p><span>Assets</span><strong>{money(reports.balance_sheet.assets)}</strong></p><p><span>Liabilities</span><strong>{money(reports.balance_sheet.liabilities)}</strong></p><p><span>Equity incl. current earnings</span><strong>{money(reports.balance_sheet.equity)}</strong></p><p className="finance-report-total"><span>Liabilities + equity</span><strong>{money(reports.balance_sheet.liabilities + reports.balance_sheet.equity)}</strong></p></article>
          <article className="finance-report finance-report-wide"><h3>Trial balance</h3><div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Code</th><th>Account</th><th>Type</th><th>Debit</th><th>Credit</th></tr></thead><tbody>{reports.trial_balance.map((account) => <tr key={account.id}><td>{account.code}</td><td>{account.name}</td><td>{account.account_type}</td><td>{money(account.debit)}</td><td>{money(account.credit)}</td></tr>)}</tbody></table></div></article>
        </div>}
      </section>
    </section>
  );
}
