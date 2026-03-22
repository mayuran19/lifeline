import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { doctorService, type Doctor, type DoctorRequest, type DoctorClinicRequest } from '../services/doctorService';
import { clinicService } from '../services/clinicService';

const emptyForm: DoctorRequest = {
  firstName: '',
  lastName: '',
  providerNumber: '',
  prescriberNo: '',
  phone: '',
  email: '',
};

const emptyClinicForm: DoctorClinicRequest = {
  clinicId: '',
  clinicLocationId: '',
};

// ── Clinic association modal ───────────────────────────────────────────────────

function ClinicAssocModal({
  doctorId,
  onClose,
}: {
  doctorId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<DoctorClinicRequest>(emptyClinicForm);
  const [error, setError] = useState('');

  const { data: clinics = [] } = useQuery({
    queryKey: ['clinics', true],
    queryFn: () => clinicService.getAll(true),
  });

  const selectedClinic = clinics.find(c => c.id === form.clinicId);
  const availableLocations = selectedClinic?.locations.filter(l => l.active) ?? [];

  const addMutation = useMutation({
    mutationFn: () => doctorService.addClinic(doctorId, {
      clinicId: form.clinicId,
      clinicLocationId: form.clinicLocationId || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctors'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to add clinic'),
  });

  return (
    <Modal title="Add Clinic Association" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); addMutation.mutate(); }} className="space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Clinic *</label>
          <select required value={form.clinicId}
            onChange={e => setForm(f => ({ ...f, clinicId: e.target.value, clinicLocationId: '' }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            <option value="">— Select clinic —</option>
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
        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={addMutation.isPending || !form.clinicId}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
            {addMutation.isPending ? 'Adding...' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Doctor detail (expandable row) ────────────────────────────────────────────

function DoctorDetail({ doctor }: { doctor: Doctor }) {
  const qc = useQueryClient();
  const [addingClinic, setAddingClinic] = useState(false);

  const removeMutation = useMutation({
    mutationFn: (assocId: string) => doctorService.removeClinic(doctor.id, assocId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctors'] }),
  });

  const activeAssocs = doctor.clinics.filter(c => c.active);

  return (
    <tr>
      <td colSpan={6} className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase">Clinic Associations</p>
          <button onClick={() => setAddingClinic(true)}
            className="px-3 py-1 text-xs font-medium text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50">
            + Add Clinic
          </button>
        </div>
        {activeAssocs.length === 0 ? (
          <p className="text-sm text-gray-400">No clinic associations yet.</p>
        ) : (
          <div className="space-y-2">
            {activeAssocs.map(assoc => (
              <div key={assoc.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-3 py-2">
                <div className="text-sm">
                  <span className="font-medium text-gray-800">{assoc.clinicName ?? '—'}</span>
                  {assoc.clinicLocationName && (
                    <span className="text-gray-400 ml-2">
                      {assoc.clinicLocationName}{assoc.clinicLocationAddress ? ` — ${assoc.clinicLocationAddress}` : ''}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeMutation.mutate(assoc.id)}
                  disabled={removeMutation.isPending}
                  className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        {addingClinic && <ClinicAssocModal doctorId={doctor.id} onClose={() => setAddingClinic(false)} />}
      </td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Doctors() {
  const qc = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [form, setForm] = useState<DoctorRequest>(emptyForm);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors', !showInactive],
    queryFn: () => doctorService.getAll(!showInactive),
  });

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? doctorService.update(editing.id, form)
      : doctorService.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctors'] });
      closeModal();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Save failed'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => doctorService.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctors'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (d: Doctor) => {
    setEditing(d);
    setForm({
      firstName: d.firstName,
      lastName: d.lastName,
      providerNumber: d.providerNumber ?? '',
      prescriberNo: d.prescriberNo ?? '',
      phone: d.phone ?? '',
      email: d.email ?? '',
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

  const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctors</h1>
          <p className="text-sm text-gray-500 mt-1">{doctors.length} record{doctors.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded border-gray-300" />
            <span>Show inactive</span>
          </label>
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
            Add Doctor
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No doctors found</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider / Prescriber</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone / Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clinics</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {doctors.map(d => {
                const activeClinicCount = d.clinics.filter(c => c.active).length;
                const isExpanded = expandedId === d.id;
                return (
                  <>
                    <tr key={d.id} className={`hover:bg-gray-50 ${!d.active ? 'opacity-70' : ''}`}>
                      <td className="px-6 py-4 font-medium text-gray-900">Dr. {d.firstName} {d.lastName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {d.providerNumber && <div>Provider: <span className="font-medium">{d.providerNumber}</span></div>}
                        {d.prescriberNo && <div>Prescriber: <span className="font-medium">{d.prescriberNo}</span></div>}
                        {!d.providerNumber && !d.prescriberNo && <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {d.phone && <div>{d.phone}</div>}
                        {d.email && <div className="text-xs text-gray-400">{d.email}</div>}
                        {!d.phone && !d.email && <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <button onClick={() => toggleExpand(d.id)} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800">
                          <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span>{activeClinicCount} clinic{activeClinicCount !== 1 ? 's' : ''}</span>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${d.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {d.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm space-x-3">
                        <button onClick={() => openEdit(d)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                        {d.active && (
                          <button onClick={() => setConfirmId(d.id)} className="text-red-500 hover:text-red-700 font-medium">Deactivate</button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && <DoctorDetail key={`detail-${d.id}`} doctor={d} />}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal title={editing ? 'Edit Doctor' : 'Add Doctor'} onClose={closeModal} size="lg">
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider Number</label>
                <input value={form.providerNumber} onChange={e => setForm(f => ({ ...f, providerNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prescriber No</label>
                <input value={form.prescriberNo} onChange={e => setForm(f => ({ ...f, prescriberNo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saveMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirmId && (
        <ConfirmDialog
          message="Deactivate this doctor? They will no longer appear in active lists."
          onConfirm={() => { deactivateMutation.mutate(confirmId); setConfirmId(null); }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </Layout>
  );
}
