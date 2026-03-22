import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import {
  configurationService,
  type Configuration,
  type ConfigurationCreateRequest,
  type ConfigurationUpdateRequest,
} from '../services/configurationService';

const GROUP_LABELS: Record<string, string> = {
  VISIT_TYPE: 'Visit Type',
  URGENCY: 'Urgency',
  REQUEST_STATUS: 'Request Status',
};

function groupLabel(g: string) {
  return GROUP_LABELS[g] ?? g;
}

export default function Configurations() {
  const qc = useQueryClient();
  const [addGroup, setAddGroup] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<Configuration | null>(null);
  const [error, setError] = useState('');

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['configurations'],
    queryFn: () => configurationService.getAll(),
  });

  // Group and sort
  const groups = configs.reduce<Record<string, Configuration[]>>((acc, c) => {
    if (!acc[c.configGroup]) acc[c.configGroup] = [];
    acc[c.configGroup].push(c);
    return acc;
  }, {});
  const sortedGroups = Object.entries(groups).sort(([, a], [, b]) =>
    (a[0]?.groupDisplayOrder ?? 0) - (b[0]?.groupDisplayOrder ?? 0)
  );

  // Add mutation
  const [addForm, setAddForm] = useState<ConfigurationCreateRequest>({
    configGroup: '', groupDisplayOrder: 0, configKey: '', configDescription: '', configDisplayOrder: 0,
  });
  const addMutation = useMutation({
    mutationFn: () => configurationService.create(addForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['configurations'] }); setAddGroup(null); setError(''); },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to create'),
  });

  const openAdd = (group: string) => {
    const existing = groups[group] ?? [];
    const maxGroupOrder = existing[0]?.groupDisplayOrder ?? (sortedGroups.length + 1);
    const maxDisplayOrder = Math.max(0, ...existing.map(c => c.configDisplayOrder)) + 1;
    setAddForm({ configGroup: group, groupDisplayOrder: maxGroupOrder, configKey: '', configDescription: '', configDisplayOrder: maxDisplayOrder });
    setAddGroup(group);
    setError('');
  };

  // Edit mutation
  const [editForm, setEditForm] = useState<ConfigurationUpdateRequest>({});
  const editMutation = useMutation({
    mutationFn: () => configurationService.update(editConfig!.configGroup, editConfig!.configKey, editForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['configurations'] }); setEditConfig(null); setError(''); },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to update'),
  });

  const openEdit = (c: Configuration) => {
    setEditConfig(c);
    setEditForm({ configDescription: c.configDescription ?? '', configDisplayOrder: c.configDisplayOrder, groupDisplayOrder: c.groupDisplayOrder, status: c.status });
    setError('');
  };

  if (isLoading) return <Layout><div className="text-center py-12 text-gray-500">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurations</h1>
        <p className="text-sm text-gray-500 mt-1">Manage dropdown options for requests</p>
      </div>

      <div className="space-y-6">
        {sortedGroups.map(([group, items]) => (
          <div key={group} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{groupLabel(group)}</h2>
                <p className="text-xs text-gray-500 mt-0.5">Group: {group}</p>
              </div>
              <button
                onClick={() => openAdd(group)}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                + Add
              </button>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Status</th>
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...items].sort((a, b) => a.configDisplayOrder - b.configDisplayOrder).map(c => (
                  <tr key={`${c.configGroup}-${c.configKey}`} className={c.status === 'INACTIVE' ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{c.configKey}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{c.configDescription ?? <span className="text-gray-400 italic">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.configDisplayOrder}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {addGroup && (
        <Modal title={`Add to ${groupLabel(addGroup)}`} onClose={() => { setAddGroup(null); setError(''); }}>
          <div className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Key *</label>
              <input value={addForm.configKey}
                onChange={e => setAddForm(f => ({ ...f, configKey: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
                placeholder="e.g. PHONE_VISIT"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono" />
              <p className="text-xs text-gray-400 mt-1">Uppercase letters and underscores only. Cannot be changed after creation.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input value={addForm.configDescription ?? ''}
                onChange={e => setAddForm(f => ({ ...f, configDescription: e.target.value }))}
                placeholder="Human-readable label shown in dropdowns"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input type="number" value={addForm.configDisplayOrder}
                onChange={e => setAddForm(f => ({ ...f, configDisplayOrder: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setAddGroup(null); setError(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={() => addMutation.mutate()} disabled={!addForm.configKey || addMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                {addMutation.isPending ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editConfig && (
        <Modal title={`Edit — ${editConfig.configKey}`} onClose={() => { setEditConfig(null); setError(''); }}>
          <div className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
              <input value={editConfig.configKey} disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-500 font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input value={editForm.configDescription ?? ''}
                onChange={e => setEditForm(f => ({ ...f, configDescription: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                <input type="number" value={editForm.configDisplayOrder ?? 0}
                  onChange={e => setEditForm(f => ({ ...f, configDisplayOrder: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={editForm.status ?? 'ACTIVE'}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value as 'ACTIVE' | 'INACTIVE' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
            {editForm.status === 'INACTIVE' && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                Inactive items won't appear in dropdowns for new requests, but existing records using this value will still display it.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setEditConfig(null); setError(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={() => editMutation.mutate()} disabled={editMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                {editMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
