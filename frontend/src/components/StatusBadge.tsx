import type { RequestStatus, Urgency } from '../services/requestService';

const statusStyles: Record<string, string> = {
  RECEIVED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
};

const urgencyStyles: Record<string, string> = {
  ROUTINE: 'bg-gray-100 text-gray-700',
  URGENT: 'bg-orange-100 text-orange-800',
  EMERGENCY: 'bg-red-100 text-red-800',
};

interface StatusBadgeProps {
  status: RequestStatus;
  label?: string;
}

interface UrgencyBadgeProps {
  urgency: Urgency;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const style = statusStyles[status] ?? 'bg-gray-100 text-gray-700';
  const display = label ?? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {display}
    </span>
  );
}

export function UrgencyBadge({ urgency, label }: UrgencyBadgeProps) {
  const style = urgencyStyles[urgency] ?? 'bg-gray-100 text-gray-700';
  const display = label ?? urgency.charAt(0) + urgency.slice(1).toLowerCase();
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {display}
    </span>
  );
}
