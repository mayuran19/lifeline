import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { StatusBadge, UrgencyBadge } from '../components/StatusBadge';
import {
  requestService,
  type Request,
  type RequestCreateRequest,
  type RequestStatus,
  type VisitType,
  type Urgency,
} from '../services/requestService';
import { doctorService } from '../services/doctorService';
import { clinicService } from '../services/clinicService';
import { patientService } from '../services/patientService';

const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  ROUTINE_ROUND: 'Routine Round',
  URGENT: 'Urgent',
  AFTER_HOURS: 'After Hours',
  PHONE_CONSULT: 'Phone Consult',
};

const STATUS_OPTIONS: { value: RequestStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

type TabType = 'list' | 'calendar';
type CalendarView = 'day' | 'week' | 'month';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = {
  datetime: (dt: string | null) => {
    if (!dt) return null;
    const d = new Date(dt);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },
  time: (dt: string | null) => {
    if (!dt) return null;
    return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },
  shortDate: (d: Date) => d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
  monthYear: (d: Date) => d.toLocaleDateString([], { month: 'long', year: 'numeric' }),
  weekdayShort: (d: Date) => d.toLocaleDateString([], { weekday: 'short' }),
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function startOfWeek(d: Date) {
  const r = startOfDay(d); r.setDate(r.getDate() - r.getDay()); return r; // Sunday
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function requestRefTime(r: Request): Date {
  return new Date(r.startTime ?? r.receivedAt);
}

// Does the request span or touch the given day?
function requestOnDay(r: Request, day: Date): boolean {
  const ref = requestRefTime(r);
  const end = r.endTime ? new Date(r.endTime) : ref;
  const dayStart = startOfDay(day);
  const dayEnd = new Date(dayStart.getTime() + 86400000 - 1);
  return ref <= dayEnd && end >= dayStart;
}

function eventColor(urgency: string) {
  if (urgency === 'EMERGENCY') return 'bg-red-100 text-red-800 border-red-200';
  if (urgency === 'URGENT') return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-blue-100 text-blue-800 border-blue-200';
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Requests() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabType>('list');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | ''>('');
  const [calendarClinicId, setCalendarClinicId] = useState('');
  const [calendarView, setCalendarView] = useState<CalendarView>('week');
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(new Date()));
  const [createOpen, setCreateOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState<Request | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests', statusFilter],
    queryFn: () => requestService.getAll(statusFilter || undefined),
  });

  const { data: calendarRequests = [] } = useQuery({
    queryKey: ['requests-calendar', calendarClinicId],
    queryFn: () => requestService.getAll(undefined, calendarClinicId || undefined),
    enabled: tab === 'calendar',
  });

  const { data: doctors = [] } = useQuery({ queryKey: ['doctors', true], queryFn: () => doctorService.getAll(true) });
  const { data: clinics = [] } = useQuery({ queryKey: ['clinics', true], queryFn: () => clinicService.getAll(true) });
  const { data: patients = [] } = useQuery({ queryKey: ['patients', true], queryFn: () => patientService.getAll(true) });

  // Navigation
  const navigate = (dir: -1 | 1) => {
    setAnchorDate(prev => {
      if (calendarView === 'day') return addDays(prev, dir);
      if (calendarView === 'week') return addDays(prev, dir * 7);
      return new Date(prev.getFullYear(), prev.getMonth() + dir, 1);
    });
  };

  const navLabel = useMemo(() => {
    if (calendarView === 'day') return fmt.shortDate(anchorDate) + ' ' + anchorDate.getFullYear();
    if (calendarView === 'week') {
      const w0 = startOfWeek(anchorDate);
      const w6 = addDays(w0, 6);
      return `${fmt.shortDate(w0)} – ${fmt.shortDate(w6)}, ${w6.getFullYear()}`;
    }
    return fmt.monthYear(anchorDate);
  }, [calendarView, anchorDate]);

  const openDetail = (r: Request) => setDetailRequest(r);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['requests'] });
    qc.invalidateQueries({ queryKey: ['requests-calendar'] });
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
          <p className="text-sm text-gray-500 mt-1">{requests.length} request{requests.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
          New Request
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-4 border-b border-gray-200">
        {(['list', 'calendar'] as TabType[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'list' ? 'List' : 'Calendar'}
          </button>
        ))}
      </div>

      {/* ── List View ── */}
      {tab === 'list' && (
        <>
          <div className="flex items-center space-x-3 mb-4">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as RequestStatus | '')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No requests found</div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clinic</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visit Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Urgency</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patients</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {requests.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{fmt.datetime(r.receivedAt)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{fmt.datetime(r.startTime) ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{fmt.datetime(r.endTime) ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.clinicName}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{r.doctorName || <span className="text-gray-400 italic">Unassigned</span>}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{VISIT_TYPE_LABELS[r.visitType]}</td>
                      <td className="px-4 py-4 whitespace-nowrap"><UrgencyBadge urgency={r.urgency} /></td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{r.patients.length}</td>
                      <td className="px-4 py-4 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                        <button onClick={() => openDetail(r)} className="text-blue-600 hover:text-blue-800 font-medium">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Calendar View ── */}
      {tab === 'calendar' && (
        <div>
          {/* Calendar toolbar */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <select value={calendarClinicId} onChange={e => setCalendarClinicId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-w-[160px]">
                <option value="">All Clinics</option>
                {clinics.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={() => setAnchorDate(startOfDay(new Date()))}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Today</button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => navigate(-1)} className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-600">‹</button>
              <span className="text-sm font-medium text-gray-800 min-w-[180px] text-center">{navLabel}</span>
              <button onClick={() => navigate(1)} className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-600">›</button>
            </div>

            <div className="flex rounded-md border border-gray-300 overflow-hidden text-sm">
              {(['day', 'week', 'month'] as CalendarView[]).map(v => (
                <button key={v} onClick={() => setCalendarView(v)}
                  className={`px-3 py-2 capitalize transition-colors ${
                    calendarView === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {calendarView === 'day' && (
            <DayView date={anchorDate} requests={calendarRequests} onOpen={openDetail} />
          )}
          {calendarView === 'week' && (
            <WeekView anchor={anchorDate} requests={calendarRequests} onOpen={openDetail} onDayClick={d => { setAnchorDate(d); setCalendarView('day'); }} />
          )}
          {calendarView === 'month' && (
            <MonthView anchor={anchorDate} requests={calendarRequests} onOpen={openDetail} onDayClick={d => { setAnchorDate(d); setCalendarView('day'); }} />
          )}
        </div>
      )}

      {createOpen && (
        <CreateRequestModal doctors={doctors} clinics={clinics} patients={patients}
          onClose={() => setCreateOpen(false)}
          onCreated={req => { invalidate(); setCreateOpen(false); setDetailRequest(req); }} />
      )}

      {detailRequest && (
        <RequestDetailModal request={detailRequest} doctors={doctors} patients={patients}
          onClose={() => setDetailRequest(null)}
          onUpdated={updated => { invalidate(); setDetailRequest(updated); }} />
      )}
    </Layout>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({ date, requests, onOpen }: { date: Date; requests: Request[]; onOpen: (r: Request) => void }) {
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const todayRequests = requests.filter(r => requestOnDay(r, date))
    .sort((a, b) => requestRefTime(a).getTime() - requestRefTime(b).getTime());

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-700">
        {date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        <span className="ml-2 text-gray-400 font-normal">({todayRequests.length} request{todayRequests.length !== 1 ? 's' : ''})</span>
      </div>
      <div className="divide-y divide-gray-100">
        {HOURS.map(hour => {
          const label = new Date(0, 0, 0, hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const isNow = isSameDay(date, new Date()) && new Date().getHours() === hour;
          const hrs = todayRequests.filter(r => requestRefTime(r).getHours() === hour);
          return (
            <div key={hour} className={`grid grid-cols-[4rem_1fr] ${isNow ? 'bg-blue-50/50' : ''}`}>
              <div className={`px-2 py-3 text-xs text-right border-r border-gray-100 select-none ${isNow ? 'font-semibold text-blue-600' : 'text-gray-400'}`}>
                {label}
              </div>
              <div className="px-3 py-1 min-h-[3rem] space-y-1">
                {hrs.map(r => <EventChip key={r.id} r={r} onOpen={onOpen} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ anchor, requests, onOpen, onDayClick }: {
  anchor: Date; requests: Request[]; onOpen: (r: Request) => void; onDayClick: (d: Date) => void;
}) {
  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i));
  const today = startOfDay(new Date());
  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
      {/* Header row */}
      <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: '4rem repeat(7, 1fr)' }}>
        <div className="border-r border-gray-100" />
        {week.map(day => (
          <button key={day.toISOString()} onClick={() => onDayClick(day)}
            className={`py-2 text-center border-r border-gray-100 last:border-r-0 hover:bg-gray-50 transition-colors ${isSameDay(day, today) ? 'bg-blue-50' : ''}`}>
            <div className="text-xs text-gray-500">{fmt.weekdayShort(day)}</div>
            <div className={`text-sm font-semibold mt-0.5 ${isSameDay(day, today) ? 'text-blue-600' : 'text-gray-800'}`}>
              {day.getDate()}
            </div>
          </button>
        ))}
      </div>
      {/* Hour rows */}
      <div className="divide-y divide-gray-100">
        {HOURS.map(hour => {
          const label = new Date(0, 0, 0, hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return (
            <div key={hour} className="grid" style={{ gridTemplateColumns: '4rem repeat(7, 1fr)' }}>
              <div className="px-2 py-3 text-xs text-right text-gray-400 border-r border-gray-100 select-none">{label}</div>
              {week.map(day => {
                const isNow = isSameDay(day, today) && new Date().getHours() === hour;
                const dayHrReqs = requests.filter(r => requestOnDay(r, day) && requestRefTime(r).getHours() === hour);
                return (
                  <div key={day.toISOString()} className={`px-1 py-0.5 min-h-[3rem] border-r border-gray-100 last:border-r-0 space-y-0.5 ${isNow ? 'bg-blue-50/40' : ''}`}>
                    {dayHrReqs.map(r => <EventChip key={r.id} r={r} onOpen={onOpen} compact />)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({ anchor, requests, onOpen, onDayClick }: {
  anchor: Date; requests: Request[]; onOpen: (r: Request) => void; onDayClick: (d: Date) => void;
}) {
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAYS_OF_WEEK.map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-100 last:border-r-0">{d}</div>
        ))}
      </div>
      {/* Weeks */}
      <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
        {days.map(day => {
          const inMonth = day.getMonth() === anchor.getMonth();
          const isToday = isSameDay(day, today);
          const dayReqs = requests.filter(r => requestOnDay(r, day))
            .sort((a, b) => requestRefTime(a).getTime() - requestRefTime(b).getTime());
          return (
            <div key={day.toISOString()}
              className={`min-h-[7rem] p-1 ${inMonth ? 'bg-white' : 'bg-gray-50'}`}>
              <button onClick={() => onDayClick(day)}
                className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 hover:bg-gray-100 transition-colors ${
                  isToday ? 'bg-blue-600 text-white hover:bg-blue-700' : inMonth ? 'text-gray-800' : 'text-gray-400'
                }`}>
                {day.getDate()}
              </button>
              <div className="space-y-0.5">
                {dayReqs.slice(0, 3).map(r => <EventChip key={r.id} r={r} onOpen={onOpen} compact />)}
                {dayReqs.length > 3 && (
                  <button onClick={() => onDayClick(day)} className="text-xs text-gray-400 hover:text-blue-600 pl-1">
                    +{dayReqs.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Event Chip ───────────────────────────────────────────────────────────────

function EventChip({ r, onOpen, compact }: { r: Request; onOpen: (r: Request) => void; compact?: boolean }) {
  const timeLabel = r.startTime
    ? fmt.time(r.startTime) + (r.endTime ? ` – ${fmt.time(r.endTime)}` : '')
    : fmt.time(r.receivedAt);

  return (
    <button onClick={() => onOpen(r)}
      className={`w-full text-left rounded border px-1.5 hover:opacity-90 transition-opacity ${eventColor(r.urgency)} ${compact ? 'py-0.5' : 'py-1.5 px-3'}`}>
      <div className="flex items-center justify-between gap-1">
        <span className={`font-medium truncate ${compact ? 'text-xs' : 'text-xs'}`}>{r.clinicName}</span>
        {!compact && <span className="shrink-0 text-xs opacity-70">{timeLabel}</span>}
      </div>
      {!compact && (
        <div className="flex items-center gap-1.5 mt-0.5 text-xs opacity-75 truncate">
          {r.doctorName && <span>Dr. {r.doctorName}</span>}
          {r.patients.length > 0 && <span>· {r.patients.length}pt</span>}
        </div>
      )}
      {compact && <div className="text-xs opacity-70 truncate">{timeLabel}</div>}
    </button>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

interface CreateRequestModalProps {
  doctors: any[]; clinics: any[]; patients: any[];
  onClose: () => void; onCreated: (req: Request) => void;
}

function CreateRequestModal({ doctors, clinics, patients, onClose, onCreated }: CreateRequestModalProps) {
  const toLocalDT = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const [form, setForm] = useState<RequestCreateRequest>({
    clinicId: '', doctorId: '', visitType: 'ROUTINE_ROUND', urgency: 'ROUTINE',
    requestDetails: '', receivedAt: toLocalDT(), startTime: '', endTime: '', patients: [],
  });
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientNotes, setPatientNotes] = useState('');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: () => requestService.create({
      ...form,
      doctorId: form.doctorId || undefined,
      receivedAt: form.receivedAt ? new Date(form.receivedAt).toISOString() : undefined,
      startTime: form.startTime ? new Date(form.startTime as string).toISOString() : undefined,
      endTime: form.endTime ? new Date(form.endTime as string).toISOString() : undefined,
    }),
    onSuccess: onCreated,
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to create request'),
  });

  const addPatientToList = () => {
    if (!selectedPatientId || form.patients?.some(p => p.patientId === selectedPatientId)) return;
    setForm(f => ({ ...f, patients: [...(f.patients || []), { patientId: selectedPatientId, notes: patientNotes || undefined }] }));
    setSelectedPatientId(''); setPatientNotes('');
  };

  const getPatientName = (id: string) => {
    const p = patients.find((p: any) => p.id === id);
    return p ? `${p.firstName} ${p.lastName}` : id;
  };

  return (
    <Modal title="New Request" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (!form.clinicId) { setError('Please select a clinic'); return; } createMutation.mutate(); }} className="space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clinic *</label>
            <select required value={form.clinicId} onChange={e => setForm(f => ({ ...f, clinicId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option value="">Select clinic...</option>
              {clinics.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
            <select value={form.doctorId} onChange={e => setForm(f => ({ ...f, doctorId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option value="">Unassigned</option>
              {doctors.map((d: any) => <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visit Type *</label>
            <select value={form.visitType} onChange={e => setForm(f => ({ ...f, visitType: e.target.value as VisitType }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              {Object.entries(VISIT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Urgency *</label>
            <select value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value as Urgency }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option value="ROUTINE">Routine</option>
              <option value="URGENT">Urgent</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date / Time Received</label>
          <input type="datetime-local" value={form.receivedAt as string} onChange={e => setForm(f => ({ ...f, receivedAt: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input type="datetime-local" value={form.startTime as string} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input type="datetime-local" value={form.endTime as string} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Request Details</label>
          <textarea rows={3} value={form.requestDetails} onChange={e => setForm(f => ({ ...f, requestDetails: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Patients (Residents)</label>
          {(form.patients ?? []).length > 0 && (
            <ul className="mb-2 space-y-1">
              {form.patients?.map(p => (
                <li key={p.patientId} className="flex items-center justify-between bg-gray-50 px-3 py-1.5 rounded text-sm">
                  <span>{getPatientName(p.patientId)}{p.notes ? <span className="text-gray-400 ml-2">— {p.notes}</span> : ''}</span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, patients: f.patients?.filter(x => x.patientId !== p.patientId) }))}
                    className="text-red-400 hover:text-red-600 ml-2">×</button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex space-x-2">
            <select value={selectedPatientId} onChange={e => setSelectedPatientId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option value="">Add patient...</option>
              {patients.filter((p: any) => !form.patients?.some(fp => fp.patientId === p.id))
                .map((p: any) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
            </select>
            <input placeholder="Notes (optional)" value={patientNotes} onChange={e => setPatientNotes(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            <button type="button" onClick={addPatientToList} disabled={!selectedPatientId}
              className="px-3 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 disabled:opacity-40">Add</button>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
            {createMutation.isPending ? 'Creating...' : 'Create Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

interface RequestDetailModalProps {
  request: Request; doctors: any[]; patients: any[];
  onClose: () => void; onUpdated: (req: Request) => void;
}

function RequestDetailModal({ request, doctors, patients, onClose, onUpdated }: RequestDetailModalProps) {
  const toLocalDT = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const [editingStatus, setEditingStatus] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(false);
  const [editingTimes, setEditingTimes] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(request.doctorId ?? '');
  const [selectedStatus, setSelectedStatus] = useState(request.status);
  const [startTime, setStartTime] = useState(toLocalDT(request.startTime));
  const [endTime, setEndTime] = useState(toLocalDT(request.endTime));
  const [addPatientId, setAddPatientId] = useState('');
  const [addPatientNotes, setAddPatientNotes] = useState('');
  const [error, setError] = useState('');

  const updateMutation = useMutation({
    mutationFn: (data: any) => requestService.update(request.id, data),
    onSuccess: updated => { onUpdated(updated); setEditingStatus(false); setEditingDoctor(false); setEditingTimes(false); },
    onError: (err: any) => setError(err.response?.data?.message || 'Update failed'),
  });

  const addPatientMutation = useMutation({
    mutationFn: () => requestService.addPatient(request.id, addPatientId, addPatientNotes || undefined),
    onSuccess: updated => { onUpdated(updated); setAddPatientId(''); setAddPatientNotes(''); },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to add patient'),
  });

  const removePatientMutation = useMutation({
    mutationFn: (rpId: string) => requestService.removePatient(request.id, rpId),
    onSuccess: onUpdated,
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to remove patient'),
  });

  const availablePatients = patients.filter((p: any) => !request.patients.some(rp => rp.patientId === p.id));

  return (
    <Modal title="Request Details" onClose={onClose}>
      <div className="space-y-5">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 font-medium mb-0.5">Clinic</p>
            <p className="text-gray-900">{request.clinicName}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium mb-0.5">Visit Type</p>
            <p className="text-gray-900">{VISIT_TYPE_LABELS[request.visitType]}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium mb-0.5">Received</p>
            <p className="text-gray-900">{fmt.datetime(request.receivedAt)}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium mb-0.5">Urgency</p>
            <UrgencyBadge urgency={request.urgency} />
          </div>

          {/* Schedule */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-gray-500 font-medium">Schedule</p>
              {!editingTimes && <button onClick={() => setEditingTimes(true)} className="text-xs text-blue-600 hover:text-blue-800">Edit</button>}
            </div>
            {editingTimes ? (
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start</label>
                  <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End</label>
                  <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => updateMutation.mutate({
                    startTime: startTime ? new Date(startTime).toISOString() : null,
                    endTime: endTime ? new Date(endTime).toISOString() : null,
                  })} disabled={updateMutation.isPending}
                    className="px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50">Save</button>
                  <button onClick={() => setEditingTimes(false)} className="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            ) : (
              <p className="text-gray-900">
                {request.startTime
                  ? <>{fmt.datetime(request.startTime)}{request.endTime ? <> – {fmt.datetime(request.endTime)}</> : <span className="text-gray-400 italic"> (no end)</span>}</>
                  : <span className="text-gray-400 italic">Not scheduled</span>}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-gray-500 font-medium">Status</p>
              {!editingStatus && <button onClick={() => setEditingStatus(true)} className="text-xs text-blue-600 hover:text-blue-800">Change</button>}
            </div>
            {editingStatus ? (
              <div className="flex items-center space-x-2">
                <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value as RequestStatus)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
                  <option value="RECEIVED">Received</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
                <button onClick={() => updateMutation.mutate({ status: selectedStatus })} disabled={updateMutation.isPending}
                  className="px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50">Save</button>
                <button onClick={() => setEditingStatus(false)} className="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              </div>
            ) : <StatusBadge status={request.status} />}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-sm text-gray-500 font-medium">Doctor (Allocation)</p>
            {!editingDoctor && <button onClick={() => setEditingDoctor(true)} className="text-xs text-blue-600 hover:text-blue-800">Change</button>}
          </div>
          {editingDoctor ? (
            <div className="flex items-center space-x-2">
              <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
                <option value="">Unassigned</option>
                {doctors.map((d: any) => <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>)}
              </select>
              <button onClick={() => updateMutation.mutate({ doctorId: selectedDoctor || undefined })} disabled={updateMutation.isPending}
                className="px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50">Save</button>
              <button onClick={() => setEditingDoctor(false)} className="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
            </div>
          ) : (
            <p className="text-sm text-gray-900">{request.doctorName || <span className="text-gray-400 italic">Unassigned</span>}</p>
          )}
        </div>

        {request.requestDetails && (
          <div>
            <p className="text-sm text-gray-500 font-medium mb-0.5">Request Details</p>
            <p className="text-sm text-gray-900 bg-gray-50 rounded p-3">{request.requestDetails}</p>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-500 font-medium mb-2">Patients ({request.patients.length})</p>
          {request.patients.length > 0 ? (
            <ul className="space-y-1 mb-3">
              {request.patients.map(rp => (
                <li key={rp.requestPatientId} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm">
                  <div>
                    <span className="font-medium text-gray-900">{rp.patientFirstName} {rp.patientLastName}</span>
                    {rp.notes && <span className="text-gray-500 ml-2">— {rp.notes}</span>}
                  </div>
                  <button onClick={() => removePatientMutation.mutate(rp.requestPatientId)} disabled={removePatientMutation.isPending}
                    className="text-red-400 hover:text-red-600 text-xs ml-3 disabled:opacity-40">Remove</button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 italic mb-3">No patients added</p>
          )}
          {availablePatients.length > 0 && (
            <div className="flex space-x-2">
              <select value={addPatientId} onChange={e => setAddPatientId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                <option value="">Add patient...</option>
                {availablePatients.map((p: any) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
              </select>
              <input placeholder="Notes" value={addPatientNotes} onChange={e => setAddPatientNotes(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              <button type="button" onClick={() => addPatientMutation.mutate()} disabled={!addPatientId || addPatientMutation.isPending}
                className="px-3 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 disabled:opacity-40">Add</button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
