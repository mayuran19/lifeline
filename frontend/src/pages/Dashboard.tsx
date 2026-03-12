import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { requestService } from '../services/requestService';
import { doctorService } from '../services/doctorService';
import { patientService } from '../services/patientService';
import { clinicService } from '../services/clinicService';

export default function Dashboard() {
  const { data: requests = [] } = useQuery({
    queryKey: ['requests', ''],
    queryFn: () => requestService.getAll(),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors', true],
    queryFn: () => doctorService.getAll(true),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', true],
    queryFn: () => patientService.getAll(true),
  });

  const { data: clinics = [] } = useQuery({
    queryKey: ['clinics', true],
    queryFn: () => clinicService.getAll(true),
  });

  const received = requests.filter(r => r.status === 'RECEIVED').length;
  const inProgress = requests.filter(r => r.status === 'IN_PROGRESS').length;
  const completed = requests.filter(r => r.status === 'COMPLETED').length;

  const stats = [
    { label: 'Received', value: received, color: 'text-blue-600', bg: 'bg-blue-50', path: '/requests' },
    { label: 'In Progress', value: inProgress, color: 'text-yellow-600', bg: 'bg-yellow-50', path: '/requests' },
    { label: 'Completed', value: completed, color: 'text-green-600', bg: 'bg-green-50', path: '/requests' },
    { label: 'Active Doctors', value: doctors.length, color: 'text-purple-600', bg: 'bg-purple-50', path: '/doctors' },
    { label: 'Active Patients', value: patients.length, color: 'text-indigo-600', bg: 'bg-indigo-50', path: '/patients' },
    { label: 'Active Clinics', value: clinics.length, color: 'text-teal-600', bg: 'bg-teal-50', path: '/clinics' },
  ];

  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
    .slice(0, 5);

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {stats.map(s => (
          <Link key={s.label} to={s.path} className={`${s.bg} rounded-lg p-4 hover:opacity-80 transition-opacity`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-600 mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Recent Requests</h2>
          <Link to="/requests" className="text-sm text-blue-600 hover:text-blue-800">View all</Link>
        </div>
        {recentRequests.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No requests yet</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr>
                <th className="pb-2 text-left text-xs font-medium text-gray-500">Clinic</th>
                <th className="pb-2 text-left text-xs font-medium text-gray-500">Doctor</th>
                <th className="pb-2 text-left text-xs font-medium text-gray-500">Patients</th>
                <th className="pb-2 text-left text-xs font-medium text-gray-500">Received</th>
                <th className="pb-2 text-left text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentRequests.map(r => (
                <tr key={r.id}>
                  <td className="py-2 font-medium text-gray-900">{r.clinicName}</td>
                  <td className="py-2 text-gray-600">{r.doctorName || <span className="text-gray-400 italic text-xs">Unassigned</span>}</td>
                  <td className="py-2 text-gray-600">{r.patients.length}</td>
                  <td className="py-2 text-gray-500">{new Date(r.receivedAt).toLocaleDateString()}</td>
                  <td className="py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.status === 'RECEIVED' ? 'bg-blue-100 text-blue-800' :
                      r.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>{r.status.replace('_', ' ')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
