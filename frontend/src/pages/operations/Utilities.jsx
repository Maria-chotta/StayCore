import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../services/api";

const errorMessage = (error) => {
  const data = error.response?.data;
  if (typeof data === "string") return data;
  if (data?.detail) return data.detail;
  if (data?.errors) return `${data.detail} ${data.errors.map((item) => `Row ${item.row}: ${JSON.stringify(item.errors)}`).join(" · ")}`;
  if (data) return Object.entries(data).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`).join(" · ");
  return error.message || "The request failed.";
};
const EXPORTS = [
  ["guests", "Guest profiles"],
  ["rooms", "Rooms"],
  ["reservations", "Reservations"],
  ["house-accounts", "House accounts"],
  ["ledger-accounts", "Chart of accounts"],
  ["rate-plans", "Rate plans"],
];

export default function Utilities() {
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [selectedExport, setSelectedExport] = useState("guests");
  const [selectedImport, setSelectedImport] = useState("guests");
  const [file, setFile] = useState(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fileRef = useRef(null);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    setError("");
    try {
      const response = await api.get("/utilities/", { params: { resource: "audit-logs" } });
      setLogs(response.data.results || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadLogs, 0);
    return () => window.clearTimeout(timer);
  }, [loadLogs]);

  const exportCsv = async () => {
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await api.get("/utilities/", {
        params: { resource: "export", type: selectedExport },
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${selectedExport}-${new Date().toLocaleDateString("en-CA")}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage(`${selectedExport} CSV downloaded.`);
      await loadLogs();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  const importCsv = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("Choose a CSV file to import.");
      return;
    }
    setWorking(true);
    setError("");
    setMessage("");
    const formData = new FormData();
    formData.append("type", selectedImport);
    formData.append("file", file);
    try {
      const response = await api.post("/utilities/", formData);
      setMessage(`${response.data.imported} ${selectedImport} imported successfully.`);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await loadLogs();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="finance-page">
      <header className="finance-header">
        <div><span className="finance-eyebrow">SYSTEM UTILITIES</span><h1>Utilities</h1><p>Import and export property data and review recent audit activity.</p></div>
        <button className="btn-ghost" type="button" onClick={loadLogs} disabled={loadingLogs}>{loadingLogs ? "Refreshing…" : "Refresh audit log"}</button>
      </header>
      {error && <div className="finance-alert" role="alert">{error}</div>}
      {message && <div className="finance-success" role="status">{message}</div>}

      <div className="finance-columns">
        <section className="finance-card">
          <div className="finance-card-heading"><div><h2>Export property data</h2><p>Download scoped property records as CSV.</p></div></div>
          <label>Data to export<select value={selectedExport} onChange={(event) => setSelectedExport(event.target.value)}>{EXPORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <button className="btn" type="button" onClick={exportCsv} disabled={working}>{working ? "Working…" : "Download CSV"}</button>
        </section>

        <form className="finance-card" onSubmit={importCsv}>
          <div className="finance-card-heading"><div><h2>Import CSV</h2><p>Guest and house account imports are validated before saving.</p></div></div>
          <label>Data type<select value={selectedImport} onChange={(event) => setSelectedImport(event.target.value)}><option value="guests">Guest profiles</option><option value="house-accounts">House accounts</option></select></label>
          <label>CSV file<input ref={fileRef} type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] || null)} required /></label>
          <p className="finance-helper">UTF-8 CSV only, maximum 2 MB and 1,000 rows. Required guest columns: first_name, last_name. Required house account column: name.</p>
          <button className="btn" type="submit" disabled={working || !file}>{working ? "Importing…" : "Validate & import"}</button>
        </form>
      </div>

      <section className="finance-card">
        <div className="finance-card-heading"><div><h2>Audit log</h2><p>Recent successful create, update, delete, import, and export actions for this property (up to 500 entries).</p></div></div>
        {loadingLogs ? <p className="finance-empty">Loading audit records…</p> : logs.length === 0 ? <p className="finance-empty">No audit activity is available yet.</p> : (
          <div className="finance-table-wrap"><table className="finance-table">
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Resource</th><th>Endpoint</th><th>Result</th></tr></thead>
            <tbody>{logs.map((log) => <tr key={log.id}><td>{new Date(log.created_at).toLocaleString()}</td><td>{log.actor}</td><td>{log.action}</td><td>{log.resource}</td><td>{log.endpoint}</td><td>{log.response_status}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>
    </section>
  );
}
