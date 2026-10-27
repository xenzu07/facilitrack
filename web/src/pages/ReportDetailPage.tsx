import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { API_URL, api, errorMessage } from '../api';
import { formatDate, formatDateTime, locationText } from '../format';
import { ErrorBox, StatusBadge, UrgencyBadge } from '../ui';
import type {
  JobOrder,
  Report,
  ReportOptions,
  Technician,
  TradeUnit,
} from '../types';
import { useRealtime } from '../socket';

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [job, setJob] = useState<JobOrder | null>(null);
  const [tradeUnits, setTradeUnits] = useState<TradeUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [r, o] = await Promise.all([
        api.get<Report>(`/reports/${id}`),
        api.get<ReportOptions>('/reports/options'),
      ]);
      setReport(r.data);

      // every trade unit owns at least one category, so derive the list from it
      const units = new Map<string, TradeUnit>();
      o.data.categories.forEach((c) =>
        units.set(c.defaultTradeUnit.id, c.defaultTradeUnit),
      );
      setTradeUnits(
        [...units.values()].sort((a, b) => a.name.localeCompare(b.name)),
      );

      if (r.data.jobOrder) {
        const j = await api.get<JobOrder>(`/job-orders/${r.data.jobOrder.id}`);
        setJob(j.data);
      } else {
        setJob(null);
      }
    } catch (e) {
      setError(errorMessage(e));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime((e) => {
    if (e.reportId === id) void load();
  });

  if (loading) return <p className="muted">Loading...</p>;
  if (error || !report) {
    return <ErrorBox message={error ?? 'Report not found'} onRetry={() => void load()} />;
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <Link to="/reports">← Back to reports</Link>
          <h1>{report.category.name}</h1>
        </div>
        <StatusBadge status={report.status} />
      </div>

      <div className="grid-2">
        <div>
          <div className="card">
            {report.photos.map((p) => (
              <img
                key={p.id}
                className="photo"
                src={`${API_URL}${p.storageUrl}`}
                alt="Reported issue"
              />
            ))}
            <p>{report.description}</p>
            <dl className="kv">
              <dt>Location</dt>
              <dd>{locationText(report.location)}</dd>
              <dt>Urgency</dt>
              <dd>
                <UrgencyBadge urgency={report.urgency} />
              </dd>
              <dt>Reported by</dt>
              <dd>
                {report.reporter.fullName}
                {report.reporter.userType ? ` (${report.reporter.userType})` : ''}
              </dd>
              <dt>Submitted</dt>
              <dd>{formatDateTime(report.createdAt)}</dd>
              <dt>System routing</dt>
              <dd>{report.proposedTradeUnit.name}</dd>
            </dl>
          </div>

          <div className="card">
            <h2>Status history</h2>
            <ol className="timeline">
              {report.logs.map((l) => (
                <li key={l.id}>
                  <StatusBadge status={l.newStatus} />
                  {l.remarks && <p>{l.remarks}</p>}
                  <small className="muted">{formatDateTime(l.createdAt)}</small>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div>
          {report.jobOrder ? (
            job && <JobPanel job={job} onDone={() => void load()} />
          ) : (
            <RoutePanel
              key={report.id}
              report={report}
              tradeUnits={tradeUnits}
              onDone={() => void load()}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- confirm routing and generate the job order ---------- */

function RoutePanel({
  report,
  tradeUnits,
  onDone,
}: {
  report: Report;
  tradeUnits: TradeUnit[];
  onDone: () => void;
}) {
  const [unitId, setUnitId] = useState(report.proposedTradeUnit.id);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [technicianId, setTechnicianId] = useState('');
  const [materials, setMaterials] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Technician[]>('/job-orders/technicians', {
        params: { tradeUnitId: unitId },
      })
      .then((r) => {
        if (!cancelled) {
          setTechnicians(r.data);
          setTechnicianId('');
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [unitId]);

  const changedUnit = unitId !== report.proposedTradeUnit.id;
  const needsRouting = report.status === 'SUBMITTED' || changedUnit;

  async function routeIfNeeded() {
    if (!needsRouting) return;
    await api.patch(`/reports/${report.id}/route`, {
      tradeUnitId: unitId,
      remarks: remarks.trim() || undefined,
    });
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    }
    onDone();
    setBusy(false);
  }

  const confirmRouting = () => run(routeIfNeeded);

  const generate = () =>
    run(async () => {
      await routeIfNeeded();
      await api.post('/job-orders', {
        reportId: report.id,
        tradeUnitId: unitId,
        technicianId: technicianId || undefined,
        materialsNote: materials.trim() || undefined,
        targetDate: targetDate || undefined,
      });
    });

  return (
    <div className="card">
      <h2>Review and assign</h2>
      <p className="muted">
        The system proposed <strong>{report.proposedTradeUnit.name}</strong> based on
        the issue category. You can confirm it or change it.
      </p>

      <label className="field">
        Trade unit
        <select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
          {tradeUnits.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
              {u.id === report.proposedTradeUnit.id ? ' (proposed)' : ''}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        Technician
        <select
          value={technicianId}
          onChange={(e) => setTechnicianId(e.target.value)}
        >
          <option value="">Assign later</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.fullName}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        Materials needed (optional)
        <textarea
          rows={2}
          value={materials}
          onChange={(e) => setMaterials(e.target.value)}
          placeholder="Leave blank if unknown"
        />
      </label>

      <label className="field">
        Target completion date (optional)
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />
      </label>

      <label className="field">
        Routing remarks (optional)
        <input
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Shown in the status history"
        />
      </label>

      <p className="notice">
        Materials and target date stay blank when unknown. The system never fills
        them in for you.
      </p>

      {error && <p className="error-text">{error}</p>}

      <div className="actions">
        <button
          className="btn"
          onClick={() => void confirmRouting()}
          disabled={busy || !needsRouting}
        >
          Confirm routing
        </button>
        <button
          className="btn btn-primary"
          onClick={() => void generate()}
          disabled={busy}
        >
          {busy ? 'Working...' : 'Generate job order'}
        </button>
      </div>
    </div>
  );
}

/* ---------- job order details and technician assignment ---------- */

function JobPanel({ job, onDone }: { job: JobOrder; onDone: () => void }) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [technicianId, setTechnicianId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canReassign = job.status === 'ASSIGNED';

  useEffect(() => {
    if (!canReassign) return undefined;
    let cancelled = false;
    api
      .get<Technician[]>('/job-orders/technicians', {
        params: { tradeUnitId: job.tradeUnitId },
      })
      .then((r) => {
        if (!cancelled) setTechnicians(r.data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [canReassign, job.tradeUnitId]);

  async function assign() {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/job-orders/${job.id}/technician`, { technicianId });
      setTechnicianId('');
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy(false);
  }

  const options = technicians.filter((t) => t.id !== job.technicianId);

  return (
    <div className="card">
      <h2>Job order {job.jobOrderNo}</h2>
      <dl className="kv">
        <dt>Status</dt>
        <dd>
          <StatusBadge status={job.status} />
        </dd>
        <dt>Trade unit</dt>
        <dd>{job.tradeUnit.name}</dd>
        <dt>Technician</dt>
        <dd>{job.technician?.fullName ?? 'Not yet assigned'}</dd>
        <dt>Materials</dt>
        <dd>{job.materialsNote ?? 'Not specified'}</dd>
        <dt>Target date</dt>
        <dd>{formatDate(job.targetDate)}</dd>
        <dt>Created</dt>
        <dd>{formatDateTime(job.createdAt)}</dd>
      </dl>

      {canReassign ? (
        <>
          <label className="field">
            {job.technician ? 'Change technician' : 'Assign technician'}
            <select
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
            >
              <option value="">Select technician</option>
              {options.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
          </label>
          {options.length === 0 && (
            <p className="muted">
              No other technicians are available in this trade unit.
            </p>
          )}
          {error && <p className="error-text">{error}</p>}
          <button
            className="btn btn-primary"
            onClick={() => void assign()}
            disabled={busy || !technicianId}
          >
            {busy ? 'Saving...' : 'Save technician'}
          </button>
        </>
      ) : (
        <p className="muted">
          Work has started, so the technician can no longer be changed here.
        </p>
      )}
      <p className="muted">The printable job order form is on the backlog.</p>
    </div>
  );
}