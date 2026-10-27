import type { Status, Urgency } from './types';
import { statusLabel, urgencyLabel } from './format';

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge s-${status}`}>{statusLabel(status)}</span>;
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return <span className={`badge u-${urgency}`}>{urgencyLabel(urgency)}</span>;
}

export function ErrorBox({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="error">
      <p>{message}</p>
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}