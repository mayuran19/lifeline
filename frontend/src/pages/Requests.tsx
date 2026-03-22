import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import RichTextEditor from '../components/RichTextEditor';
import { StatusBadge, UrgencyBadge } from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import {
  requestService,
  type Request,
  type RequestCreateRequest,
  type RequestStatus,
} from '../services/requestService';
import { doctorService } from '../services/doctorService';
import { clinicService } from '../services/clinicService';
import { configurationService, type Configuration } from '../services/configurationService';

function configLabel(configs: Configuration[], key: string) {
  return configs.find(c => c.configKey === key)?.configDescription ?? key;
}

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

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d: Date) { const r = startOfDay(d); r.setDate(r.getDate() - r.getDay()); return r; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function requestRefTime(r: Request): Date { return new Date(r.startTime ?? r.receivedAt); }
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

// ─── Patient Autocomplete ─────────────────────────────────────────────────────

interface PatientSuggestion { id: string; firstName: string; lastName: string; medicareNo: string | null; }

function PatientAutocomplete({ excludeIds, onSelect }: {
  excludeIds: string[];
  onSelect: (p: PatientSuggestion) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PatientSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await requestService.searchPatients(query);
        setResults(data.filter(p => !excludeIds.includes(p.id)));
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, excludeIds]);

  const handleSelect = (p: PatientSuggestion) => {
    onSelect(p);
    setQuery('');
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={ref} className="relative">
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Type name to search patient..."
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      />
      {loading && <div className="absolute right-3 top-2.5 text-xs text-gray-400">Searching...</div>}
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {results.map(p => (
            <button key={p.id} type="button" onMouseDown={() => handleSelect(p)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between">
              <span className="font-medium text-gray-900">{p.firstName} {p.lastName}</span>
              {p.medicareNo && <span className="text-xs text-gray-400">Medicare: {p.medicareNo}</span>}
            </button>
          ))}
        </div>
      )}
      {open && !loading && results.length === 0 && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg px-3 py-2 text-sm text-gray-400">
          No patients found
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Requests() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabType>('list');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | ''>('');
  const [clinicFilter, setClinicFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [sortBy, setSortBy] = useState('receivedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const [calendarClinicId, setCalendarClinicId] = useState('');
  const [calendarView, setCalendarView] = useState<CalendarView>('week');
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(new Date()));
  const [exporting, setExporting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState<Request | null>(null);
  const [detailOpenInEdit, setDetailOpenInEdit] = useState(false);
  const [patientsPopup, setPatientsPopup] = useState<Request | null>(null);

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
    setPage(0);
  };

  const resetFilters = () => {
    setStatusFilter(''); setClinicFilter(''); setLocationFilter(''); setDoctorFilter('');
    setReceivedDate(''); setPage(0);
  };

  const { data: requestPage, isLoading } = useQuery({
    queryKey: ['requests', statusFilter, clinicFilter, locationFilter, doctorFilter, receivedDate, sortBy, sortDir, page],
    queryFn: () => requestService.getAll({
      status: statusFilter || undefined,
      clinicId: clinicFilter || undefined,
      locationId: locationFilter || undefined,
      doctorId: doctorFilter || undefined,
      receivedDate: receivedDate || undefined,
      sortBy,
      sortDir,
      page,
      size: PAGE_SIZE,
    }),
  });

  const requests = requestPage?.content ?? [];
  const totalPages = requestPage?.totalPages ?? 0;
  const totalElements = requestPage?.totalElements ?? 0;

  const { data: calendarRequests = [] } = useQuery({
    queryKey: ['requests-calendar', calendarClinicId],
    queryFn: async () => {
      const res = await requestService.getAll({ clinicId: calendarClinicId || undefined, size: 500 });
      return res.content;
    },
    enabled: tab === 'calendar',
  });

  const { data: doctors = [] } = useQuery({ queryKey: ['doctors', true], queryFn: () => doctorService.getAll(true) });
  const { data: clinics = [] } = useQuery({ queryKey: ['clinics', true], queryFn: () => clinicService.getAll(true) });
  const filterClinic = clinics.find((c: any) => c.id === clinicFilter);
  const filterLocations = filterClinic?.locations?.filter((l: any) => l.active) ?? [];
  const { data: visitTypeConfigs = [] } = useQuery({ queryKey: ['configurations', 'VISIT_TYPE'], queryFn: () => configurationService.getAll('VISIT_TYPE') });
  const { data: urgencyConfigs = [] } = useQuery({ queryKey: ['configurations', 'URGENCY'], queryFn: () => configurationService.getAll('URGENCY') });
  const { data: statusConfigs = [] } = useQuery({ queryKey: ['configurations', 'REQUEST_STATUS'], queryFn: () => configurationService.getAll('REQUEST_STATUS') });

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

  const openDetail = (r: Request) => { setDetailRequest(r); setDetailOpenInEdit(false); };
  const openDetailEdit = (r: Request) => { setDetailRequest(r); setDetailOpenInEdit(true); };
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['requests'] });
    qc.invalidateQueries({ queryKey: ['requests-calendar'] });
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
          <p className="text-sm text-gray-500 mt-1">{totalElements} request{totalElements !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                await requestService.exportExcel({
                  status: statusFilter || undefined,
                  clinicId: clinicFilter || undefined,
                  locationId: locationFilter || undefined,
                  doctorId: doctorFilter || undefined,
                  receivedDate: receivedDate || undefined,
                });
              } finally {
                setExporting(false);
              }
            }}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50">
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          <button onClick={() => setCreateOpen(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
            New Request
          </button>
        </div>
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
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option value="">All Statuses</option>
              {statusConfigs.filter(c => c.status === 'ACTIVE').map(c => (
                <option key={c.configKey} value={c.configKey}>{c.configDescription ?? c.configKey}</option>
              ))}
            </select>
            <select value={clinicFilter} onChange={e => { setClinicFilter(e.target.value); setLocationFilter(''); setPage(0); }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option value="">All Clinics</option>
              {clinics.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {filterLocations.length > 0 && (
              <select value={locationFilter} onChange={e => { setLocationFilter(e.target.value); setPage(0); }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                <option value="">All Locations</option>
                {filterLocations.map((l: any) => <option key={l.id} value={l.id}>{l.name || 'Unnamed'}{l.suburb ? ` — ${l.suburb}` : ''}</option>)}
              </select>
            )}
            <select value={doctorFilter} onChange={e => { setDoctorFilter(e.target.value); setPage(0); }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option value="">All Doctors</option>
              {doctors.map((d: any) => <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>)}
            </select>
            <div className="flex items-center gap-1">
              <label className="text-sm text-gray-500 whitespace-nowrap">Received:</label>
              <input type="date" value={receivedDate} onChange={e => { setReceivedDate(e.target.value); setPage(0); }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            {(statusFilter || clinicFilter || locationFilter || doctorFilter || receivedDate) && (
              <button onClick={resetFilters} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-md hover:bg-gray-50">
                Clear filters
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No requests found</div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <SortTh col="receivedAt" label="Received" current={sortBy} dir={sortDir} onSort={handleSort} />
                      <SortTh col="clinic" label="Clinic / Location" current={sortBy} dir={sortDir} onSort={handleSort} />
                      <SortTh col="doctor" label="Doctor" current={sortBy} dir={sortDir} onSort={handleSort} />
                      <SortTh col="visitType" label="Visit Type" current={sortBy} dir={sortDir} onSort={handleSort} />
                      <SortTh col="urgency" label="Urgency" current={sortBy} dir={sortDir} onSort={handleSort} />
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patients</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entered By</th>
                      <SortTh col="status" label="Status" current={sortBy} dir={sortDir} onSort={handleSort} />
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {requests.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{fmt.datetime(r.receivedAt)}</td>
                        <td className="px-4 py-4 text-sm">
                          <span className="font-medium text-gray-900">{r.clinicName}</span>
                          {r.clinicLocationName && <div className="text-xs text-gray-400 mt-0.5">{r.clinicLocationName}</div>}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{r.doctorName ? `Dr. ${r.doctorName}` : <span className="text-gray-400 italic">Unassigned</span>}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{configLabel(visitTypeConfigs, r.visitType)}</td>
                        <td className="px-4 py-4 whitespace-nowrap"><UrgencyBadge urgency={r.urgency} label={configLabel(urgencyConfigs, r.urgency)} /></td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          {r.patients.length === 0 ? (
                            <span className="text-gray-400">0</span>
                          ) : (
                            <button onClick={() => setPatientsPopup(r)}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                              {r.patients.length}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{r.enteredByName || <span className="text-gray-400">—</span>}</td>
                        <td className="px-4 py-4 whitespace-nowrap"><StatusBadge status={r.status} label={configLabel(statusConfigs, r.status)} /></td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openDetail(r)} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700">View</button>
                            <button onClick={() => openDetailEdit(r)} className="px-3 py-1.5 bg-gray-600 text-white text-xs font-medium rounded hover:bg-gray-700">Edit</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} totalPages={totalPages} totalElements={totalElements} pageSize={PAGE_SIZE} onPage={setPage} />
            </>
          )}
        </>
      )}

      {/* ── Calendar View ── */}
      {tab === 'calendar' && (
        <div>
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
          {calendarView === 'day' && <DayView date={anchorDate} requests={calendarRequests} onOpen={openDetail} />}
          {calendarView === 'week' && <WeekView anchor={anchorDate} requests={calendarRequests} onOpen={openDetail} onDayClick={d => { setAnchorDate(d); setCalendarView('day'); }} />}
          {calendarView === 'month' && <MonthView anchor={anchorDate} requests={calendarRequests} onOpen={openDetail} onDayClick={d => { setAnchorDate(d); setCalendarView('day'); }} />}
        </div>
      )}

      {createOpen && (
        <CreateRequestModal
          doctors={doctors}
          clinics={clinics}
          currentUserId={user?.id ?? ''}
          visitTypeConfigs={visitTypeConfigs}
          urgencyConfigs={urgencyConfigs}
          onClose={() => setCreateOpen(false)}
          onCreated={req => { invalidate(); setCreateOpen(false); setDetailRequest(req); }}
        />
      )}

      {detailRequest && (
        <RequestDetailModal
          request={detailRequest}
          doctors={doctors}
          visitTypeConfigs={visitTypeConfigs}
          urgencyConfigs={urgencyConfigs}
          statusConfigs={statusConfigs}
          openInEdit={detailOpenInEdit}
          onClose={() => setDetailRequest(null)}
          onUpdated={updated => { invalidate(); setDetailRequest(updated); }}
        />
      )}

      {patientsPopup && (
        <PatientsPopup request={patientsPopup} onClose={() => setPatientsPopup(null)} />
      )}
    </Layout>
  );
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function SortTh({ col, label, current, dir, onSort }: {
  col: string; label: string; current: string; dir: 'asc' | 'desc'; onSort: (col: string) => void;
}) {
  const active = current === col;
  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap"
      onClick={() => onSort(col)}
    >
      {label}
      <span className="ml-1 text-gray-400">
        {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </th>
  );
}

function Pagination({ page, totalPages, totalElements, pageSize, onPage }: {
  page: number; totalPages: number; totalElements: number; pageSize: number; onPage: (p: number) => void;
}) {
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, totalElements);
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
      <span>{start}–{end} of {totalElements}</span>
      <div className="flex items-center gap-1">
        <button disabled={page === 0} onClick={() => onPage(0)}
          className="px-2 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">«</button>
        <button disabled={page === 0} onClick={() => onPage(page - 1)}
          className="px-2 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">‹</button>
        <span className="px-3 py-1">Page {page + 1} of {totalPages}</span>
        <button disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}
          className="px-2 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">›</button>
        <button disabled={page >= totalPages - 1} onClick={() => onPage(totalPages - 1)}
          className="px-2 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">»</button>
      </div>
    </div>
  );
}

// ─── Patients Popup ───────────────────────────────────────────────────────────

function PatientsPopup({ request, onClose }: { request: Request; onClose: () => void }) {
  return (
    <Modal
      title={`Patients on request — ${request.clinicName}`}
      onClose={onClose}
      size="lg"
    >
      {request.patients.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No patients on this request.</p>
      ) : (
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicare No</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {request.patients.map(p => (
              <tr key={p.requestPatientId}>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {p.patientFirstName} {p.patientLastName}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {p.medicareNo ?? <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {p.notes ?? <span className="text-gray-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

interface SelectedPatient { id: string; firstName: string; lastName: string; medicareNo: string | null; notes: string; }

function CreateRequestModal({ doctors, clinics, currentUserId, visitTypeConfigs, urgencyConfigs, onClose, onCreated }: {
  doctors: any[]; clinics: any[];
  currentUserId: string;
  visitTypeConfigs: Configuration[]; urgencyConfigs: Configuration[];
  onClose: () => void; onCreated: (req: Request) => void;
}) {
  const toLocalDT = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const [form, setForm] = useState<RequestCreateRequest>({
    clinicId: '', clinicLocationId: '', doctorId: '',
    enteredBy: currentUserId,
    visitType: 'ROUTINE_ROUND', urgency: 'ROUTINE',
    requestDetails: '', receivedAt: toLocalDT(),
    patients: [],
  });
  const [selectedPatients, setSelectedPatients] = useState<SelectedPatient[]>([]);
  const [error, setError] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['request-users'],
    queryFn: () => requestService.getUsers(),
  });

  const selectedClinic = clinics.find((c: any) => c.id === form.clinicId);
  const availableLocations = selectedClinic?.locations?.filter((l: any) => l.active) ?? [];

  const handleClinicChange = (clinicId: string) => {
    setForm(f => ({ ...f, clinicId, clinicLocationId: '' }));
  };

  const handlePatientSelect = (p: PatientSuggestion) => {
    if (selectedPatients.some(sp => sp.id === p.id)) return;
    setSelectedPatients(prev => [...prev, { ...p, notes: '' }]);
  };

  const removePatient = (id: string) => setSelectedPatients(prev => prev.filter(p => p.id !== id));
  const updatePatientNotes = (id: string, notes: string) => {
    setSelectedPatients(prev => prev.map(p => p.id === id ? { ...p, notes } : p));
  };

  const createMutation = useMutation({
    mutationFn: () => requestService.create({
      ...form,
      clinicLocationId: form.clinicLocationId || undefined,
      doctorId: form.doctorId || undefined,
      enteredBy: form.enteredBy || undefined,
      receivedAt: form.receivedAt ? new Date(form.receivedAt as string).toISOString() : undefined,
      patients: selectedPatients.map(p => ({ patientId: p.id, notes: p.notes || undefined })),
    }),
    onSuccess: onCreated,
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to create request'),
  });

  const getUserDisplayName = (u: any) => {
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
    return name || u.username;
  };

  return (
    <Modal title="New Request" onClose={onClose} size="xl">
      <form onSubmit={e => { e.preventDefault(); if (!form.clinicId) { setError('Please select a clinic'); return; } createMutation.mutate(); }} className="space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}

        {/* Clinic + Location */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clinic *</label>
            <select required value={form.clinicId} onChange={e => handleClinicChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option value="">Select clinic...</option>
              {clinics.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            {availableLocations.length === 0 ? (
              <div className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-400 bg-gray-50">
                {form.clinicId ? 'No locations set up' : 'Select a clinic first'}
              </div>
            ) : (
              <select value={form.clinicLocationId ?? ''} onChange={e => setForm(f => ({ ...f, clinicLocationId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                <option value="">— No specific location —</option>
                {availableLocations.map((l: any) => (
                  <option key={l.id} value={l.id}>
                    {l.name || 'Unnamed'}{l.suburb ? ` — ${l.suburb}` : ''}{l.primary ? ' (Primary)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Doctor + Entered By */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
            <select value={form.doctorId} onChange={e => setForm(f => ({ ...f, doctorId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option value="">Unassigned</option>
              {doctors.map((d: any) => <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entered By</label>
            <select value={form.enteredBy} onChange={e => setForm(f => ({ ...f, enteredBy: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option value="">— Select user —</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {getUserDisplayName(u)}{u.id === currentUserId ? ' (me)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Visit Type + Urgency */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visit Type *</label>
            <select value={form.visitType} onChange={e => setForm(f => ({ ...f, visitType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              {visitTypeConfigs.filter(c => c.status === 'ACTIVE').map(c => (
                <option key={c.configKey} value={c.configKey}>{c.configDescription ?? c.configKey}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Urgency *</label>
            <select value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              {urgencyConfigs.filter(c => c.status === 'ACTIVE').map(c => (
                <option key={c.configKey} value={c.configKey}>{c.configDescription ?? c.configKey}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Received */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date / Time Received</label>
          <input type="datetime-local" value={form.receivedAt as string} onChange={e => setForm(f => ({ ...f, receivedAt: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>

        {/* Request Details */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Request Details / Notes</label>
          <RichTextEditor
            value={form.requestDetails ?? ''}
            onChange={html => setForm(f => ({ ...f, requestDetails: html }))}
            placeholder="Add formatted notes..."
            minHeight="6rem"
          />
        </div>

        {/* Patients */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Patients / Residents</p>
          <div className="mb-3">
            <PatientAutocomplete
              excludeIds={selectedPatients.map(p => p.id)}
              onSelect={handlePatientSelect}
            />
          </div>
          {selectedPatients.length > 0 && (
            <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Medicare No</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Notes</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {selectedPatients.map(p => (
                  <tr key={p.id} className="bg-white">
                    <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{p.firstName} {p.lastName}</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{p.medicareNo || '—'}</td>
                    <td className="px-3 py-2">
                      <input value={p.notes} onChange={e => updatePatientNotes(p.id, e.target.value)}
                        placeholder="Optional notes..."
                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => removePatient(p.id)} className="text-red-400 hover:text-red-600 text-xs font-medium">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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

function RequestDetailModal({ request, doctors, visitTypeConfigs, urgencyConfigs, statusConfigs, openInEdit = false, onClose, onUpdated }: {
  request: Request; doctors: any[];
  visitTypeConfigs: Configuration[]; urgencyConfigs: Configuration[]; statusConfigs: Configuration[];
  openInEdit?: boolean;
  onClose: () => void; onUpdated: (req: Request) => void;
}) {
  const toLocalDT = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const [editing, setEditing] = useState(openInEdit);
  const [error, setError] = useState('');

  // Edit form state
  const [form, setForm] = useState({
    clinicId: request.clinicId,
    clinicLocationId: request.clinicLocationId ?? '',
    doctorId: request.doctorId ?? '',
    enteredBy: request.enteredBy ?? '',
    visitType: request.visitType,
    urgency: request.urgency,
    status: request.status,
    requestDetails: request.requestDetails ?? '',
    receivedAt: toLocalDT(request.receivedAt),
  });

  const { data: clinics = [] } = useQuery({ queryKey: ['clinics', true], queryFn: () => clinicService.getAll(true), enabled: editing });
  const { data: users = [] } = useQuery({ queryKey: ['request-users'], queryFn: () => requestService.getUsers(), enabled: editing });

  const selectedClinic = clinics.find((c: any) => c.id === form.clinicId);
  const availableLocations = selectedClinic?.locations?.filter((l: any) => l.active) ?? [];

  const updateMutation = useMutation({
    mutationFn: () => requestService.update(request.id, {
      clinicId: form.clinicId || undefined,
      clinicLocationId: form.clinicLocationId || null,
      doctorId: form.doctorId || null,
      enteredBy: form.enteredBy || null,
      visitType: form.visitType,
      urgency: form.urgency,
      status: form.status,
      requestDetails: form.requestDetails,
      receivedAt: form.receivedAt ? new Date(form.receivedAt).toISOString() : undefined,
    }),
    onSuccess: updated => { onUpdated(updated); setEditing(false); setError(''); },
    onError: (err: any) => setError(err.response?.data?.message || 'Update failed'),
  });

  const addPatientMutation = useMutation({
    mutationFn: (p: PatientSuggestion) => requestService.addPatient(request.id, p.id),
    onSuccess: onUpdated,
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to add patient'),
  });

  const removePatientMutation = useMutation({
    mutationFn: (rpId: string) => requestService.removePatient(request.id, rpId),
    onSuccess: onUpdated,
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to remove patient'),
  });

  const getUserDisplayName = (u: any) => [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username;

  return (
    <Modal title="Request Details" onClose={onClose} size="xl">
      <div className="space-y-5">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}

        {/* View mode header */}
        {!editing && (
          <div className="flex justify-end">
            <button onClick={() => setEditing(true)}
              className="px-3 py-1.5 text-sm font-medium text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50">
              Edit Request
            </button>
          </div>
        )}

        {editing ? (
          /* ── Edit form ── */
          <div className="space-y-4">
            {/* Clinic + Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clinic *</label>
                <select value={form.clinicId}
                  onChange={e => setForm(f => ({ ...f, clinicId: e.target.value, clinicLocationId: '' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Select clinic...</option>
                  {clinics.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select value={form.clinicLocationId}
                  onChange={e => setForm(f => ({ ...f, clinicLocationId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  <option value="">— No specific location —</option>
                  {availableLocations.map((l: any) => (
                    <option key={l.id} value={l.id}>{l.name || 'Unnamed'}{l.suburb ? ` — ${l.suburb}` : ''}{l.primary ? ' (Primary)' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Doctor + Entered By */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
                <select value={form.doctorId}
                  onChange={e => setForm(f => ({ ...f, doctorId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Unassigned</option>
                  {doctors.map((d: any) => <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entered By</label>
                <select value={form.enteredBy}
                  onChange={e => setForm(f => ({ ...f, enteredBy: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  <option value="">— Select user —</option>
                  {users.map((u: any) => <option key={u.id} value={u.id}>{getUserDisplayName(u)}</option>)}
                </select>
              </div>
            </div>

            {/* Visit Type + Urgency + Status */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visit Type *</label>
                <select value={form.visitType}
                  onChange={e => setForm(f => ({ ...f, visitType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  {[...visitTypeConfigs].sort((a, b) => a.configDisplayOrder - b.configDisplayOrder).map(c => (
                    <option key={c.configKey} value={c.configKey} disabled={c.status === 'INACTIVE'}>
                      {c.configDescription ?? c.configKey}{c.status === 'INACTIVE' ? ' (inactive)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urgency *</label>
                <select value={form.urgency}
                  onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  {[...urgencyConfigs].sort((a, b) => a.configDisplayOrder - b.configDisplayOrder).map(c => (
                    <option key={c.configKey} value={c.configKey} disabled={c.status === 'INACTIVE'}>
                      {c.configDescription ?? c.configKey}{c.status === 'INACTIVE' ? ' (inactive)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  {[...statusConfigs].sort((a, b) => a.configDisplayOrder - b.configDisplayOrder).map(c => (
                    <option key={c.configKey} value={c.configKey} disabled={c.status === 'INACTIVE'}>
                      {c.configDescription ?? c.configKey}{c.status === 'INACTIVE' ? ' (inactive)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Received + Start + End */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Received At</label>
              <input type="datetime-local" value={form.receivedAt}
                onChange={e => setForm(f => ({ ...f, receivedAt: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>

            {/* Request Details (rich text) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Request Details / Notes</label>
              <RichTextEditor
                value={form.requestDetails}
                onChange={html => setForm(f => ({ ...f, requestDetails: html }))}
                placeholder="Add formatted notes..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => { setEditing(false); setError(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          /* ── View mode ── */
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 font-medium mb-0.5">Clinic</p>
                <p className="text-gray-900 font-medium">{request.clinicName}</p>
                {request.clinicLocationName && <p className="text-xs text-gray-400 mt-0.5">{request.clinicLocationName}</p>}
              </div>
              <div>
                <p className="text-gray-500 font-medium mb-0.5">Visit Type</p>
                <p className="text-gray-900">{configLabel(visitTypeConfigs, request.visitType)}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium mb-0.5">Urgency</p>
                <UrgencyBadge urgency={request.urgency} label={configLabel(urgencyConfigs, request.urgency)} />
              </div>
              <div>
                <p className="text-gray-500 font-medium mb-0.5">Status</p>
                <StatusBadge status={request.status} label={configLabel(statusConfigs, request.status)} />
              </div>
              <div>
                <p className="text-gray-500 font-medium mb-0.5">Received</p>
                <p className="text-gray-900">{fmt.datetime(request.receivedAt)}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium mb-0.5">Doctor</p>
                <p className="text-gray-900">{request.doctorName ? `Dr. ${request.doctorName}` : <span className="text-gray-400 italic">Unassigned</span>}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium mb-0.5">Entered By</p>
                <p className="text-gray-900">{request.enteredByName || <span className="text-gray-400 italic">—</span>}</p>
              </div>
            </div>
            {request.requestDetails && (
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">Request Details / Notes</p>
                <div className="prose prose-sm max-w-none rich-text-view bg-gray-50 rounded p-3 text-gray-900"
                  dangerouslySetInnerHTML={{ __html: request.requestDetails }} />
              </div>
            )}
          </div>
        )}

        {/* Patients — always visible */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-500 font-medium mb-2">Patients / Residents ({request.patients.length})</p>
          {request.patients.length > 0 && (
            <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden mb-3">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Medicare No</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Notes</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {request.patients.map(rp => (
                  <tr key={rp.requestPatientId} className="bg-white">
                    <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{rp.patientFirstName} {rp.patientLastName}</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{rp.medicareNo || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{rp.notes || '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => removePatientMutation.mutate(rp.requestPatientId)} disabled={removePatientMutation.isPending}
                        className="text-red-400 hover:text-red-600 text-xs font-medium disabled:opacity-40">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <PatientAutocomplete
            excludeIds={request.patients.map(p => p.patientId)}
            onSelect={p => addPatientMutation.mutate(p)}
          />
        </div>
      </div>
    </Modal>
  );
}

// ─── Calendar views (unchanged) ───────────────────────────────────────────────

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
              <div className={`px-2 py-3 text-xs text-right border-r border-gray-100 select-none ${isNow ? 'font-semibold text-blue-600' : 'text-gray-400'}`}>{label}</div>
              <div className="px-3 py-1 min-h-[3rem] space-y-1">{hrs.map(r => <EventChip key={r.id} r={r} onOpen={onOpen} />)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ anchor, requests, onOpen, onDayClick }: { anchor: Date; requests: Request[]; onOpen: (r: Request) => void; onDayClick: (d: Date) => void }) {
  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i));
  const today = startOfDay(new Date());
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
      <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: '4rem repeat(7, 1fr)' }}>
        <div className="border-r border-gray-100" />
        {week.map(day => (
          <button key={day.toISOString()} onClick={() => onDayClick(day)}
            className={`py-2 text-center border-r border-gray-100 last:border-r-0 hover:bg-gray-50 transition-colors ${isSameDay(day, today) ? 'bg-blue-50' : ''}`}>
            <div className="text-xs text-gray-500">{fmt.weekdayShort(day)}</div>
            <div className={`text-sm font-semibold mt-0.5 ${isSameDay(day, today) ? 'text-blue-600' : 'text-gray-800'}`}>{day.getDate()}</div>
          </button>
        ))}
      </div>
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

function MonthView({ anchor, requests, onOpen, onDayClick }: { anchor: Date; requests: Request[]; onOpen: (r: Request) => void; onDayClick: (d: Date) => void }) {
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAYS_OF_WEEK.map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-100 last:border-r-0">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
        {days.map(day => {
          const inMonth = day.getMonth() === anchor.getMonth();
          const isToday = isSameDay(day, today);
          const dayReqs = requests.filter(r => requestOnDay(r, day)).sort((a, b) => requestRefTime(a).getTime() - requestRefTime(b).getTime());
          return (
            <div key={day.toISOString()} className={`min-h-[7rem] p-1 ${inMonth ? 'bg-white' : 'bg-gray-50'}`}>
              <button onClick={() => onDayClick(day)}
                className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 hover:bg-gray-100 transition-colors ${
                  isToday ? 'bg-blue-600 text-white hover:bg-blue-700' : inMonth ? 'text-gray-800' : 'text-gray-400'
                }`}>
                {day.getDate()}
              </button>
              <div className="space-y-0.5">
                {dayReqs.slice(0, 3).map(r => <EventChip key={r.id} r={r} onOpen={onOpen} compact />)}
                {dayReqs.length > 3 && (
                  <button onClick={() => onDayClick(day)} className="text-xs text-gray-400 hover:text-blue-600 pl-1">+{dayReqs.length - 3} more</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventChip({ r, onOpen, compact }: { r: Request; onOpen: (r: Request) => void; compact?: boolean }) {
  const timeLabel = r.startTime
    ? fmt.time(r.startTime) + (r.endTime ? ` – ${fmt.time(r.endTime)}` : '')
    : fmt.time(r.receivedAt);
  return (
    <button onClick={() => onOpen(r)}
      className={`w-full text-left rounded border px-1.5 hover:opacity-90 transition-opacity ${eventColor(r.urgency)} ${compact ? 'py-0.5' : 'py-1.5 px-3'}`}>
      <div className="flex items-center justify-between gap-1">
        <span className="font-medium truncate text-xs">{r.clinicName}</span>
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
