import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api';
import {
  STATUSES,
  formatDate,
  formatDateTime,
  locationText,
  statusLabel,
} from '../format';
import { ErrorBox, StatusBadge } from '../ui';
import type { JobOrder, Status } from '../types';

export default function JobOrdersPage() {
  const [jobs, setJobs] = useState<JobOrder[]>([]);
  const [status, setStatus] = useState<Status | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<JobOrder[]>('/job-orders', {
        params: status ? { status } : undefined,
      });
      setJobs(res.data);
    } catch (e) {
      setError(errorMessage(e));
    }
    setLoading(false);
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="page-head">
        <h1>Job orders</h1>
        <button className="btn" onClick={() => void load()} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
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
      </div>

      {error && <ErrorBox message={error} onRetry={() => void load()} />}

      {!error && (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Job order</th>
                <th>Created</th>
                <th>Category</th>
                <th>Location</th>
                <th>Trade unit</th>
                <th>Technician</th>
                <th>Target date</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>
                    <strong>{j.jobOrderNo}</strong>
                  </td>
                  <td>{formatDateTime(j.createdAt)}</td>
                  <td>{j.report.category.name}</td>
                  <td>{locationText(j.report.location)}</td>
                  <td>{j.tradeUnit.name}</td>
                  <td>{j.technician?.fullName ?? 'Unassigned'}</td>
                  <td>{formatDate(j.targetDate)}</td>
                  <td>
                    <StatusBadge status={j.status} />
                  </td>
                  <td>
                    <Link className="btn btn-small" to={`/reports/${j.reportId}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && jobs.length === 0 && (
                <tr>
                  <td colSpan={9} className="muted center">
                    No job orders yet.
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