import type { RequestStatus, Urgency } from '../services/requestService';

const statusStyles: Record<RequestStatus, string> = {
  RECEIVED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
};

const statusLabels: Record<RequestStatus, string> = {
  RECEIVED: 'Received',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

const urgencyStyles: Record<Urgency, string> = {
  ROUTINE: 'bg-gray-100 text-gray-700',
  URGENT: 'bg-orange-100 text-orange-800',
  EMERGENCY: 'bg-red-100 text-red-800',
};

interface StatusBadgeProps {
  status: RequestStatus;
}

interface UrgencyBadgeProps {
  urgency: Urgency;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

export function UrgencyBadge({ urgency }: UrgencyBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${urgencyStyles[urgency]}`}>
      {urgency.charAt(0) + urgency.slice(1).toLowerCase()}
    </span>
  );
}
