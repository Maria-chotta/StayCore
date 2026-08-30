import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./Guests.css";

export default function Guests() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const activeParam = searchParams.get("active");
  const genderParam = searchParams.get("gender") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guestsRaw, setGuestsRaw] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/guests/");
        const data = res.data;
        const list = Array.isArray(data) ? data : (data.results || []);
        if (!mounted) return;
        setGuestsRaw(list);
      } catch (err) {
        if (!mounted) return;
        setError(err.response?.data || err.message || "Failed to load guests");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => (mounted = false);
  }, []);

  const guests = useMemo(() => {
    const v = (q || "").trim().toLowerCase();
    let list = guestsRaw.slice();
    if (v) {
      list = list.filter((g) => {
        return (
          String(g.first_name || "").toLowerCase().includes(v) ||
          String(g.last_name || "").toLowerCase().includes(v) ||
          String(g.email || "").toLowerCase().includes(v) ||
          String(g.phone || "").toLowerCase().includes(v) ||
          String(g.identification_number || "").toLowerCase().includes(v)
        );
      });
    }

    if (genderParam) {
      list = list.filter((g) => (g.gender || "").toLowerCase() === String(genderParam).toLowerCase());
    }

    if (activeParam !== null) {
      if (activeParam === "true") list = list.filter((g) => g.is_active === true);
      if (activeParam === "false") list = list.filter((g) => g.is_active === false);
    }

    return list;
  }, [guestsRaw, q, genderParam, activeParam]);

  function handleClearFilters() {
    setSearchParams(new URLSearchParams(), { replace: false });
  }

  return (
    <div className="guests-root">
      <div className="guests-header">
        <h1>Guests</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {loading && <div className="guests-loading">Loading guests…</div>}
        {!loading && !error && (
          <div className="guests-count">{guests.length} result{guests.length !== 1 ? 's' : ''}</div>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn-ghost small" onClick={handleClearFilters}>Clear filters</button>
        </div>
      </div>

      {error && <div className="guests-error">Error: {JSON.stringify(error)}</div>}

      {!loading && !error && guests.length === 0 && (
        <div className="guests-empty">No guests found.</div>
      )}

      {!loading && !error && guests.length > 0 && (
        <div className="guests-wrap">
          <div className="guests-filters-row" style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <input
              aria-label="Search guests"
              placeholder="Search name, email, phone, ID"
              value={q}
              onChange={(e) => {
                const sp = new URLSearchParams(searchParams.toString());
                if (e.target.value) sp.set('q', e.target.value); else sp.delete('q');
                setSearchParams(sp, { replace: false });
              }}
              style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}
            />

            <select
              aria-label="Filter by gender"
              value={genderParam}
              onChange={(e) => {
                const sp = new URLSearchParams(searchParams.toString());
                if (e.target.value) sp.set('gender', e.target.value); else sp.delete('gender');
                setSearchParams(sp, { replace: false });
              }}
              style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}
            >
              <option value="">All genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>

            <select
              aria-label="Filter by active"
              value={activeParam ?? ''}
              onChange={(e) => {
                const sp = new URLSearchParams(searchParams.toString());
                if (e.target.value === '') sp.delete('active'); else sp.set('active', e.target.value);
                setSearchParams(sp, { replace: false });
              }}
              style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <table className="guests-table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Nationality</th>
                <th>Identification</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => {
                const handleClick = () => navigate(`/guests/${g.id}`);
                const onKeyDown = (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                  }
                };

                return (
                  <tr key={g.id} role="button" tabIndex={0} onClick={handleClick} onKeyDown={onKeyDown}>
                    <td data-label="Guest">{(g.first_name || '') + ' ' + (g.last_name || '')}</td>
                    <td data-label="Phone">{g.phone || '-'}</td>
                    <td data-label="Email">{g.email || '-'}</td>
                    <td data-label="Nationality">{g.nationality || '-'}</td>
                    <td data-label="Identification">{(g.identification_type ? g.identification_type + ' ' : '') + (g.identification_number || '-')}</td>
                    <td data-label="Status">{g.is_active ? 'Active' : 'Inactive'}</td>
                    <td data-label="Actions"><button className="btn-ghost small" onClick={(e)=>{e.stopPropagation(); navigate(`/guests/${g.id}`);}}>View</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
