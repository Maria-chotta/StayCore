import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";

const asList = (data) => (Array.isArray(data) ? data : data?.results || []);
const money = (value, currency = "TZS") => `${currency} ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toLocaleDateString("en-CA");
const errorMessage = (error) => {
  const data = error.response?.data;
  if (typeof data === "string") return data;
  if (data?.detail) return data.detail;
  if (data) return Object.entries(data).map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(", ") : value}`).join(" · ");
  return error.message || "The request failed.";
};

export default function HouseAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [accountForm, setAccountForm] = useState({ name: "", contact_name: "", email: "", phone: "", credit_limit: "0", notes: "" });
  const [activityForm, setActivityForm] = useState({ activity_type: "CHARGE", amount: "", description: "", reference: "", transaction_date: today() });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [accountResponse, activityResponse] = await Promise.all([
        api.get("/house-accounts/"),
        api.get("/house-account-activities/"),
      ]);
      const loadedAccounts = asList(accountResponse.data);
      setAccounts(loadedAccounts);
      setActivities(asList(activityResponse.data));
      setSelectedAccount((current) => current || String(loadedAccounts[0]?.id || ""));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const submitAccount = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/house-accounts/", {
        ...accountForm,
        hotel: Number(localStorage.getItem("active_hotel_id") || 0),
        credit_limit: Number(accountForm.credit_limit || 0),
      });
      setAccountForm({ name: "", contact_name: "", email: "", phone: "", credit_limit: "0", notes: "" });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const submitActivity = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/house-account-activities/", {
        ...activityForm,
        account: Number(selectedAccount),
        amount: Number(activityForm.amount),
      });
      setActivityForm((current) => ({ ...current, amount: "", description: "", reference: "" }));
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const selected = accounts.find((account) => String(account.id) === selectedAccount);
  const accountActivities = activities.filter((activity) => String(activity.account) === selectedAccount);
  const totalOutstanding = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);

  return (
    <section className="finance-page">
      <header className="finance-header">
        <div><span className="finance-eyebrow">CORPORATE & HOUSE ACCOUNTS</span><h1>House Accounts</h1><p>Manage company balances, post charges, and record settlements.</p></div>
        <button className="btn-ghost" type="button" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
      </header>
      {error && <div className="finance-alert" role="alert">{error}</div>}
      <div className="finance-metrics">
        <article className="finance-metric"><span>Active accounts</span><strong>{accounts.filter((account) => account.status === "ACTIVE").length}</strong></article>
        <article className="finance-metric"><span>Outstanding balance</span><strong>{money(totalOutstanding)}</strong></article>
        <article className="finance-metric"><span>Accounts with balances</span><strong>{accounts.filter((account) => Number(account.balance) > 0).length}</strong></article>
      </div>

      <div className="finance-columns">
        <form className="finance-card" onSubmit={submitAccount}>
          <div className="finance-card-heading"><div><h2>New company account</h2><p>Set up a corporate or house account.</p></div></div>
          <div className="finance-form-grid">
            <label>Company / account name<input value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} required maxLength="180" /></label>
            <label>Contact person<input value={accountForm.contact_name} onChange={(event) => setAccountForm({ ...accountForm, contact_name: event.target.value })} /></label>
            <label>Email<input type="email" value={accountForm.email} onChange={(event) => setAccountForm({ ...accountForm, email: event.target.value })} /></label>
            <label>Phone<input value={accountForm.phone} onChange={(event) => setAccountForm({ ...accountForm, phone: event.target.value })} /></label>
            <label>Credit limit<input type="number" min="0" step="0.01" value={accountForm.credit_limit} onChange={(event) => setAccountForm({ ...accountForm, credit_limit: event.target.value })} /></label>
            <label className="finance-span-all">Notes<textarea rows="2" value={accountForm.notes} onChange={(event) => setAccountForm({ ...accountForm, notes: event.target.value })} /></label>
          </div>
          <button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : "Create account"}</button>
        </form>

        <form className="finance-card" onSubmit={submitActivity}>
          <div className="finance-card-heading"><div><h2>Post account activity</h2><p>Add a charge or record a settlement.</p></div></div>
          <div className="finance-form-grid">
            <label className="finance-span-all">House account<select value={selectedAccount} onChange={(event) => setSelectedAccount(event.target.value)} required>
              <option value="">Select account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {money(account.balance)}</option>)}
            </select></label>
            <label>Activity<select value={activityForm.activity_type} onChange={(event) => setActivityForm({ ...activityForm, activity_type: event.target.value })}><option value="CHARGE">Charge</option><option value="SETTLEMENT">Settlement</option></select></label>
            <label>Amount<input type="number" min="0.01" step="0.01" value={activityForm.amount} onChange={(event) => setActivityForm({ ...activityForm, amount: event.target.value })} required /></label>
            <label>Transaction date<input type="date" value={activityForm.transaction_date} onChange={(event) => setActivityForm({ ...activityForm, transaction_date: event.target.value })} required /></label>
            <label>Reference<input value={activityForm.reference} onChange={(event) => setActivityForm({ ...activityForm, reference: event.target.value })} /></label>
            <label className="finance-span-all">Description<input value={activityForm.description} onChange={(event) => setActivityForm({ ...activityForm, description: event.target.value })} required maxLength="255" /></label>
          </div>
          <button className="btn" type="submit" disabled={saving || !selectedAccount}>{saving ? "Saving…" : "Save activity"}</button>
        </form>
      </div>

      <section className="finance-card">
        <div className="finance-card-heading">
          <div><h2>Accounts receivable</h2><p>Outstanding balances and recent activity.</p></div>
          <select className="finance-account-filter" aria-label="Filter activity by account" value={selectedAccount} onChange={(event) => setSelectedAccount(event.target.value)}>
            <option value="">All accounts</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </div>
        {loading ? <p className="finance-empty">Loading house accounts…</p> : accounts.length === 0 ? <p className="finance-empty">No house accounts yet. Create an account to start tracking balances.</p> : (
          <div className="finance-table-wrap"><table className="finance-table">
            <thead><tr><th>Account</th><th>Contact</th><th>Credit limit</th><th>Balance</th><th>Status</th></tr></thead>
            <tbody>{accounts.filter((account) => !selectedAccount || String(account.id) === selectedAccount).map((account) => (
              <tr key={account.id}><td><strong>{account.name}</strong><span className="finance-cell-sub">{account.email || account.phone || "No contact details"}</span></td><td>{account.contact_name || "—"}</td><td>{money(account.credit_limit)}</td><td className={Number(account.balance) > Number(account.credit_limit) && Number(account.credit_limit) > 0 ? "finance-over-limit" : ""}>{money(account.balance)}</td><td><span className={`finance-status finance-status--${account.status.toLowerCase()}`}>{account.status}</span></td></tr>
            ))}</tbody>
          </table></div>
        )}
      </section>

      <section className="finance-card">
        <div className="finance-card-heading"><div><h2>Account activity</h2><p>{selected ? `${selected.name} · current balance ${money(selected.balance)}` : "All account charges and settlements"}</p></div></div>
        {!accountActivities.length ? <p className="finance-empty">No activity for this account yet.</p> : (
          <div className="finance-table-wrap"><table className="finance-table">
            <thead><tr><th>Date</th><th>Account</th><th>Type</th><th>Description</th><th>Reference</th><th>Amount</th></tr></thead>
            <tbody>{accountActivities.map((activity) => (
              <tr key={activity.id}><td>{activity.transaction_date}</td><td>{accounts.find((account) => String(account.id) === String(activity.account))?.name || `#${activity.account}`}</td><td><span className={`finance-status finance-status--${activity.activity_type.toLowerCase()}`}>{activity.activity_type}</span></td><td>{activity.description}</td><td>{activity.reference || "—"}</td><td>{money(activity.amount)}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </section>
  );
}
