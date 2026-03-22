import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { patientService, type Patient, type PatientRequest, type PatientStatus } from '../services/patientService';
import { clinicService } from '../services/clinicService';

const PAGE_SIZE = 20;

function Pagination({ page, totalPages, totalElements, onPage }: {
  page: number; totalPages: number; totalElements: number; onPage: (p: number) => void;
}) {
  const start = page * PAGE_SIZE + 1;
  const end = Math.min((page + 1) * PAGE_SIZE, totalElements);
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

const emptyForm: PatientRequest = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  phone: '',
  medicareNo: '',
  irnNo: '',
  remark: '',
  status: 'ACTIVE',
  statusReason: '',
  deceasedDate: '',
  clinicId: '',
  clinicLocationId: '',
};

const statusConfig: Record<PatientStatus, { label: string; classes: string }> = {
  ACTIVE:   { label: 'Active',   classes: 'bg-green-100 text-green-800' },
  INACTIVE: { label: 'Inactive', classes: 'bg-yellow-100 text-yellow-800' },
  DECEASED: { label: 'Deceased', classes: 'bg-gray-100 text-gray-600' },
};

export default function Patients() {
  const qc = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState<PatientRequest>(emptyForm);
  const [error, setError] = useState('');

  const { data: patientPage, isLoading } = useQuery({
    queryKey: ['patients', !showAll, search, page],
    queryFn: () => patientService.getAll(!showAll, search || undefined, 'lastName', 'asc', page, PAGE_SIZE),
  });

  const patients = patientPage?.content ?? [];
  const totalPages = patientPage?.totalPages ?? 0;
  const totalElements = patientPage?.totalElements ?? 0;

  const { data: clinics = [] } = useQuery({
    queryKey: ['clinics', true],
    queryFn: () => clinicService.getAll(true),
    enabled: modalOpen,
  });

  const selectedClinic = clinics.find(c => c.id === form.clinicId);
  const availableLocations = selectedClinic?.locations.filter(l => l.active) ?? [];

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? patientService.update(editing.id, form)
      : patientService.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      closeModal();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Save failed'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (p: Patient) => {
    setEditing(p);
    setForm({
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: p.dateOfBirth ?? '',
      phone: p.phone ?? '',
      medicareNo: p.medicareNo ?? '',
      irnNo: p.irnNo ?? '',
      remark: p.remark ?? '',
      status: p.status,
      statusReason: p.statusReason ?? '',
      deceasedDate: p.deceasedDate ?? '',
      clinicId: p.clinicId ?? '',
      clinicLocationId: p.clinicLocationId ?? '',
    });
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setError('');
  };

  const handleClinicChange = (clinicId: string) => {
    setForm(f => ({ ...f, clinicId, clinicLocationId: '' }));
  };

  const handleStatusChange = (status: PatientStatus) => {
    setForm(f => ({ ...f, status, deceasedDate: '' }));
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-AU');
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-sm text-gray-500 mt-1">{totalElements} record{totalElements !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
          Add Patient
        </button>
      </div>

      <div className="flex items-center space-x-4 mb-4">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="flex-1 max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={showAll} onChange={e => { setShowAll(e.target.checked); setPage(0); }} className="rounded border-gray-300" />
          <span>Show inactive / deceased</span>
        </label>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : patients.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No patients found</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DOB</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicare / IRN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clinic / Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {patients.map(p => {
                const sc = statusConfig[p.status];
                return (
                  <tr key={p.id} className={`hover:bg-gray-50 ${p.status !== 'ACTIVE' ? 'opacity-70' : ''}`}>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {p.firstName} {p.lastName}
                      {p.phone && <div className="text-xs text-gray-400 mt-0.5">{p.phone}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(p.dateOfBirth)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {p.medicareNo && <div>Medicare: <span className="font-medium">{p.medicareNo}</span></div>}
                      {p.irnNo && <div>IRN: <span className="font-medium">{p.irnNo}</span></div>}
                      {!p.medicareNo && !p.irnNo && <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {p.clinicName ? (
                        <div>
                          <span className="font-medium text-gray-800">{p.clinicName}</span>
                          {p.clinicLocationName && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {p.clinicLocationName}{p.clinicLocationAddress ? ` — ${p.clinicLocationAddress}` : ''}
                            </div>
                          )}
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sc.classes}`}>
                          {sc.label}
                        </span>
                        {p.status === 'DECEASED' && p.deceasedDate && (
                          <div className="text-xs text-gray-400 mt-0.5">{formatDate(p.deceasedDate)}</div>
                        )}
                        {p.status === 'INACTIVE' && p.statusReason && (
                          <div className="text-xs text-gray-400 mt-0.5 max-w-[120px] truncate" title={p.statusReason}>{p.statusReason}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onPage={setPage} />

      {modalOpen && (
        <Modal title={editing ? 'Edit Patient' : 'Add Patient'} onClose={closeModal} size="lg">
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-5">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}

            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input required value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input required value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

            {/* DOB + Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input type="date" value={form.dateOfBirth}
                  onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

            {/* Medicare + IRN */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medicare No</label>
                <input value={form.medicareNo}
                  onChange={e => setForm(f => ({ ...f, medicareNo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IRN No</label>
                <input value={form.irnNo}
                  onChange={e => setForm(f => ({ ...f, irnNo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

            {/* Remark — always visible */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
              <textarea value={form.remark}
                onChange={e => setForm(f => ({ ...f, remark: e.target.value }))}
                rows={2}
                placeholder="General notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none" />
            </div>

            {/* Status */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Status</p>
              <div className="flex gap-3 mb-3">
                {(['ACTIVE', 'INACTIVE', 'DECEASED'] as PatientStatus[]).map(s => (
                  <button key={s} type="button"
                    onClick={() => handleStatusChange(s)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      form.status === s
                        ? s === 'ACTIVE' ? 'bg-green-100 text-green-800 border-green-300'
                          : s === 'INACTIVE' ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                          : 'bg-gray-200 text-gray-700 border-gray-400'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}>
                    {statusConfig[s].label}
                  </button>
                ))}
              </div>
              {form.status === 'INACTIVE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inactive Reason</label>
                  <textarea value={form.statusReason}
                    onChange={e => setForm(f => ({ ...f, statusReason: e.target.value }))}
                    rows={2}
                    placeholder="Reason for inactive status..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none" />
                </div>
              )}
              {form.status === 'DECEASED' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Death</label>
                  <input type="date" value={form.deceasedDate}
                    onChange={e => setForm(f => ({ ...f, deceasedDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                </div>
              )}
            </div>

            {/* Clinic association */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Clinic Association</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clinic</label>
                  <select value={form.clinicId ?? ''}
                    onChange={e => handleClinicChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                    <option value="">— No clinic —</option>
                    {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {form.clinicId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    {availableLocations.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">No locations set up for this clinic yet.</p>
                    ) : (
                      <select value={form.clinicLocationId ?? ''}
                        onChange={e => setForm(f => ({ ...f, clinicLocationId: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                        <option value="">— No specific location —</option>
                        {availableLocations.map(l => (
                          <option key={l.id} value={l.id}>
                            {l.name || 'Unnamed'}{l.suburb ? ` — ${l.suburb}` : ''}{l.primary ? ' (Primary)' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button type="button" onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saveMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
