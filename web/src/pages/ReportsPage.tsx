import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api';
import {
  STATUSES,
  URGENCIES,
  formatDateTime,
  locationText,
  statusLabel,
  urgencyLabel,
} from '../format';
import { ErrorBox, StatusBadge, UrgencyBadge } from '../ui';
import type { Report, ReportOptions, Status, Urgency } from '../types';

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<Status | ''>('');
  const [urgency, setUrgency] = useState<Urgency | ''>('');
  const [categoryId, setCategoryId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, o] = await Promise.all([
        api.get<Report[]>('/reports'),
        api.get<ReportOptions>('/reports/options'),
      ]);
      setReports(r.data);
      setCategories(o.data.categories.map((c) => ({ id: c.id, name: c.name })));
    } catch (e) {
      setError(errorMessage(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = {
      SUBMITTED: 0,
      UNDER_REVIEW: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
    };
    reports.forEach((r) => {
      c[r.status] += 1;
    });
    return c;
  }, [reports]);

  const shown = reports.filter(
    (r) =>
      (!status || r.status === status) &&
      (!urgency || r.urgency === urgency) &&
      (!categoryId || r.category.id === categoryId),
  );

  return (
    <div>
      <div className="page-head">
        <h1>Reports</h1>
        <button className="btn" onClick={() => void load()} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="stats">
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`stat ${status === s ? 'stat-active' : ''}`}
            onClick={() => setStatus(status === s ? '' : s)}
          >
            <strong>{counts[s]}</strong>
            <span>{statusLabel(s)}</span>
          </button>
        ))}
      </div>

      <div className="filters">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Status | '')}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
        <select
          value={urgency}
          onChange={(e) => setUrgency(e.target.value as Urgency | '')}
        >
          <option value="">All urgency levels</option>
          {URGENCIES.map((u) => (
            <option key={u} value={u}>
              {urgencyLabel(u)}
            </option>
          ))}
        </select>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          className="btn btn-ghost"
          onClick={() => {
            setStatus('');
            setUrgency('');
            setCategoryId('');
          }}
        >
          Clear filters
        </button>
      </div>

      {error && <ErrorBox message={error} onRetry={() => void load()} />}

      {!error && (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Submitted</th>
                <th>Category</th>
                <th>Location</th>
                <th>Urgency</th>
                <th>Trade unit</th>
                <th>Status</th>
                <th>Reporter</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td>{formatDateTime(r.createdAt)}</td>
                  <td>{r.category.name}</td>
                  <td>{locationText(r.location)}</td>
                  <td>
                    <UrgencyBadge urgency={r.urgency} />
                  </td>
                  <td>{r.proposedTradeUnit.name}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>{r.reporter.fullName}</td>
                  <td>
                    <Link className="btn btn-small" to={`/reports/${r.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && shown.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted center">
                    No reports match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}