import type { Status, Urgency } from './types';

export const STATUSES: Status[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
];
export const URGENCIES: Urgency[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function statusLabel(s: string): string {
  return s
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export function urgencyLabel(u: string): string {
  return u.charAt(0) + u.slice(1).toLowerCase();
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// target dates are stored as UTC midnight, so format them in UTC
export function formatDate(iso: string | null): string {
  if (!iso) return 'Not set';
  return new Date(iso).toLocaleDateString('en-PH', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  });
}

export function locationText(l: {
  building: string;
  floor: string;
  room: string;
}): string {
  return `${l.building}, ${l.floor}, ${l.room}`;
}