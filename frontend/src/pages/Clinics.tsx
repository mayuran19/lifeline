import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  clinicService,
  type Clinic,
  type ClinicRequest,
  type ClinicEmail,
  type ClinicEmailRequest,
  type ClinicLocation,
  type ClinicLocationRequest,
} from '../services/clinicService';

// ── small helpers ──────────────────────────────────────────────────────────────

const emptyClinicForm: ClinicRequest = { name: '', phone: '', fax: '' };

const emptyEmailForm: ClinicEmailRequest = { email: '', label: '', primary: false };

const emptyLocationForm: ClinicLocationRequest = {
  name: '', addressLine1: '', addressLine2: '', suburb: '',
  state: 'VIC', postcode: '', managerName: '', careCoordinationName: '',
  phone: '', fax: '', primary: false, emails: [],
};

function EmailBadge({ email }: { email: ClinicEmail }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">
      {email.primary && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />}
      {email.label ? `${email.label}: ` : ''}{email.email}
    </span>
  );
}

// ── Email modal ────────────────────────────────────────────────────────────────

function EmailModal({
  clinicId, editing, onClose, onSaved,
}: { clinicId: string; editing: ClinicEmail | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<ClinicEmailRequest>(
    editing
      ? { email: editing.email, label: editing.label ?? '', primary: editing.primary }
      : emptyEmailForm
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      if (editing) {
        await clinicService.updateEmail(clinicId, editing.id, form);
      } else {
        await clinicService.addEmail(clinicId, form);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={editing ? 'Edit Email' : 'Add Email'} onClose={onClose}>
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input type="email" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Label <span className="text-gray-400 font-normal">(e.g. General, Referrals, Billing)</span></label>
          <input type="text" value={form.label ?? ''}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={!!form.primary}
            onChange={e => setForm(f => ({ ...f, primary: e.target.checked }))} />
          Set as primary email
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : editing ? 'Update' : 'Add Email'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Location modal ─────────────────────────────────────────────────────────────

function LocationModal({
  clinicId,
  editing,
  onClose,
  onSaved,
}: {
  clinicId: string;
  editing: ClinicLocation | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ClinicLocationRequest>(
    editing ? {
      name: editing.name ?? '',
      addressLine1: editing.addressLine1 ?? '',
      addressLine2: editing.addressLine2 ?? '',
      suburb: editing.suburb ?? '',
      state: editing.state ?? 'VIC',
      postcode: editing.postcode ?? '',
      managerName: editing.managerName ?? '',
      careCoordinationName: editing.careCoordinationName ?? '',
      phone: editing.phone ?? '',
      fax: editing.fax ?? '',
      primary: editing.primary,
      emails: editing.emails.map(e => ({ email: e.email, label: e.label ?? '', primary: e.primary })),
    } : { ...emptyLocationForm, emails: [] }
  );
  const [emailDraft, setEmailDraft] = useState<ClinicEmailRequest>(emptyEmailForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const addEmail = () => {
    if (!emailDraft.email) return;
    setForm(f => ({ ...f, emails: [...(f.emails ?? []), { ...emailDraft }] }));
    setEmailDraft(emptyEmailForm);
  };

  const removeEmail = (idx: number) => {
    setForm(f => ({ ...f, emails: (f.emails ?? []).filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      if (editing) {
        await clinicService.updateLocation(clinicId, editing.id, form);
      } else {
        await clinicService.addLocation(clinicId, form);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof ClinicLocationRequest, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} placeholder={placeholder}
        value={(form[key] as string) ?? ''}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );

  return (
    <Modal title={editing ? 'Edit Location' : 'Add Location'} onClose={onClose} size="xl">
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {field('Location Name', 'name', 'text', 'e.g. Main Building')}

        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Address</p>
          {field('Address Line 1', 'addressLine1')}
          {field('Address Line 2', 'addressLine2')}
          <div className="grid grid-cols-3 gap-3 mt-3">
            {field('Suburb', 'suburb')}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <select value={form.state ?? 'VIC'}
                onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'].map(s =>
                  <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {field('Postcode', 'postcode')}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Contact</p>
          <div className="grid grid-cols-2 gap-3">
            {field('Manager Name', 'managerName')}
            {field('Care Coordination (CCC)', 'careCoordinationName')}
            {field('Phone', 'phone')}
            {field('Fax', 'fax')}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Emails</p>
          {(form.emails ?? []).map((e, i) => (
            <div key={i} className="flex items-center justify-between py-1 border-b border-gray-100 text-sm">
              <span>{e.primary ? '★ ' : ''}{e.email}{e.label ? ` (${e.label})` : ''}</span>
              <button onClick={() => removeEmail(i)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
            </div>
          ))}
          <div className="flex gap-2 items-end flex-wrap mt-2">
            <input type="email" placeholder="Email" value={emailDraft.email}
              onChange={e => setEmailDraft(f => ({ ...f, email: e.target.value }))}
              className="border border-gray-300 rounded px-2 py-1 text-sm w-44 focus:outline-none focus:ring-1 focus:ring-blue-400" />
            <input type="text" placeholder="Label" value={emailDraft.label}
              onChange={e => setEmailDraft(f => ({ ...f, label: e.target.value }))}
              className="border border-gray-300 rounded px-2 py-1 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-blue-400" />
            <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" checked={!!emailDraft.primary}
                onChange={e => setEmailDraft(f => ({ ...f, primary: e.target.checked }))} />
              Primary
            </label>
            <button onClick={addEmail}
              className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
              + Add
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={!!form.primary}
              onChange={e => setForm(f => ({ ...f, primary: e.target.checked }))} />
            Set as primary location
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Location'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Expanded clinic row ────────────────────────────────────────────────────────

function ClinicDetail({
  clinic, onRefresh,
}: { clinic: Clinic; onRefresh: () => void }) {
  const [locationModal, setLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ClinicLocation | null>(null);
  const [confirmLocationId, setConfirmLocationId] = useState<string | null>(null);
  const [emailModal, setEmailModal] = useState(false);
  const [editingEmail, setEditingEmail] = useState<ClinicEmail | null>(null);
  const [confirmEmailId, setConfirmEmailId] = useState<string | null>(null);

  const openAddLocation = () => { setEditingLocation(null); setLocationModal(true); };
  const openEditLocation = (l: ClinicLocation) => { setEditingLocation(l); setLocationModal(true); };
  const openAddEmail = () => { setEditingEmail(null); setEmailModal(true); };
  const openEditEmail = (e: ClinicEmail) => { setEditingEmail(e); setEmailModal(true); };

  return (
    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 space-y-5">

      {/* Clinic emails */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Clinic Emails</h4>
          <button onClick={openAddEmail}
            className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700">
            + Add Email
          </button>
        </div>
        {clinic.emails.length === 0 && <p className="text-xs text-gray-400">No emails added yet.</p>}
        <div className="space-y-1">
          {clinic.emails.map(e => (
            <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <div className="flex items-center gap-2 text-sm">
                {e.primary && <span className="text-xs font-medium px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Primary</span>}
                <span className="text-gray-800">{e.email}</span>
                {e.label && <span className="text-gray-400 text-xs">({e.label})</span>}
              </div>
              <div className="flex gap-3">
                <button onClick={() => openEditEmail(e)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                <button onClick={() => setConfirmEmailId(e.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Locations */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Locations</h4>
          <button onClick={openAddLocation}
            className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700">
            + Add Location
          </button>
        </div>

        {clinic.locations.length === 0 && (
          <p className="text-xs text-gray-400">No locations added yet.</p>
        )}

        <div className="space-y-3">
          {clinic.locations.map(loc => (
            <div key={loc.id} className={`rounded-lg border p-3 bg-white ${!loc.active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    {loc.primary && (
                      <span className="text-xs font-medium px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Primary</span>
                    )}
                    <span className="text-sm font-medium text-gray-900">{loc.name || 'Unnamed Location'}</span>
                    {!loc.active && <span className="text-xs text-gray-400">(Inactive)</span>}
                  </div>
                  {loc.formattedAddress && (
                    <p className="text-xs text-gray-500">{loc.formattedAddress}</p>
                  )}
                  {!loc.formattedAddress && loc.addressLine1 && (
                    <p className="text-xs text-gray-500">
                      {[loc.addressLine1, loc.addressLine2, loc.suburb, loc.state, loc.postcode]
                        .filter(Boolean).join(', ')}
                    </p>
                  )}
                  <div className="flex gap-4 text-xs text-gray-500 pt-1 flex-wrap">
                    {loc.managerName && <span>Manager: <strong>{loc.managerName}</strong></span>}
                    {loc.careCoordinationName && <span>CCC: <strong>{loc.careCoordinationName}</strong></span>}
                    {loc.phone && <span>Ph: {loc.phone}</span>}
                    {loc.fax && <span>Fax: {loc.fax}</span>}
                  </div>
                  {loc.emails.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {loc.emails.map(e => <EmailBadge key={e.id} email={e} />)}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <button onClick={() => openEditLocation(loc)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                  {loc.active && (
                    <button onClick={() => setConfirmLocationId(loc.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium">Deactivate</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {locationModal && (
        <LocationModal
          clinicId={clinic.id}
          editing={editingLocation}
          onClose={() => setLocationModal(false)}
          onSaved={onRefresh}
        />
      )}

      {emailModal && (
        <EmailModal
          clinicId={clinic.id}
          editing={editingEmail}
          onClose={() => setEmailModal(false)}
          onSaved={onRefresh}
        />
      )}

      {confirmLocationId && (
        <ConfirmDialog
          message="Deactivate this location?"
          onConfirm={async () => {
            await clinicService.deactivateLocation(clinic.id, confirmLocationId);
            setConfirmLocationId(null);
            onRefresh();
          }}
          onCancel={() => setConfirmLocationId(null)}
        />
      )}

      {confirmEmailId && (
        <ConfirmDialog
          message="Remove this email?"
          onConfirm={async () => {
            await clinicService.deleteEmail(clinic.id, confirmEmailId);
            setConfirmEmailId(null);
            onRefresh();
          }}
          onCancel={() => setConfirmEmailId(null)}
        />
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function Clinics() {
  const qc = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Clinic | null>(null);
  const [form, setForm] = useState<ClinicRequest>(emptyClinicForm);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: clinics = [], isLoading, refetch } = useQuery({
    queryKey: ['clinics', !showInactive],
    queryFn: () => clinicService.getAll(!showInactive),
  });

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? clinicService.update(editing.id, form)
      : clinicService.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinics'] });
      closeModal();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Save failed'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => clinicService.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clinics'] }),
  });

  const openCreate = () => {
    setEditing(null); setForm(emptyClinicForm); setError(''); setModalOpen(true);
  };

  const openEdit = (c: Clinic) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone ?? '', fax: c.fax ?? '' });
    setError(''); setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false); setEditing(null); setForm(emptyClinicForm); setError('');
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clinics</h1>
          <p className="text-sm text-gray-500 mt-1">{clinics.length} record{clinics.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
              className="rounded border-gray-300" />
            <span>Show inactive</span>
          </label>
          <button onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
            Add Clinic
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : clinics.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No clinics found</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-8 px-4 py-3" />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Primary Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Primary Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clinics.map(c => {
                const primaryEmail = c.emails.find(e => e.primary) ?? c.emails[0];
                const primaryLocation = c.locations.find(l => l.primary) ?? c.locations[0];
                const isExpanded = expandedId === c.id;

                return (
                  <>
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <button onClick={() => toggleExpand(c.id)}
                          className="text-gray-400 hover:text-gray-600">
                          <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {primaryEmail ? primaryEmail.email : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {primaryLocation
                          ? primaryLocation.formattedAddress
                            ?? [primaryLocation.suburb, primaryLocation.state].filter(Boolean).join(', ')
                            ?? primaryLocation.name
                            ?? '—'
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{c.phone || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {c.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm space-x-3">
                        <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                        {c.active && (
                          <button onClick={() => setConfirmId(c.id)} className="text-red-500 hover:text-red-700 font-medium">Deactivate</button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${c.id}-detail`}>
                        <td colSpan={7} className="p-0">
                          <ClinicDetail clinic={c} onRefresh={() => refetch()} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Clinic create/edit modal */}
      {modalOpen && (
        <Modal title={editing ? 'Edit Clinic' : 'Add Clinic'} onClose={closeModal}>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fax</label>
                <input value={form.fax}
                  onChange={e => setForm(f => ({ ...f, fax: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            <p className="text-xs text-gray-400">After saving, expand the row to add emails and locations.</p>
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

      {confirmId && (
        <ConfirmDialog
          message="Deactivate this clinic? It will no longer appear in active lists."
          onConfirm={() => { deactivateMutation.mutate(confirmId); setConfirmId(null); }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </Layout>
  );
}
