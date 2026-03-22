import axios from '../lib/axios';

export type PatientStatus = 'ACTIVE' | 'INACTIVE' | 'DECEASED';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  phone: string | null;
  medicareNo: string | null;
  irnNo: string | null;
  remark: string | null;
  status: PatientStatus;
  statusReason: string | null;
  deceasedDate: string | null;
  clinicId: string | null;
  clinicName: string | null;
  clinicLocationId: string | null;
  clinicLocationName: string | null;
  clinicLocationAddress: string | null;
  createdDate: string;
  lastModifiedDate: string;
  version: number;
}

export interface PatientRequest {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phone?: string;
  medicareNo?: string;
  irnNo?: string;
  remark?: string;
  status?: PatientStatus;
  statusReason?: string;
  deceasedDate?: string;
  clinicId?: string;
  clinicLocationId?: string;
}

export const patientService = {
  async getAll(activeOnly = true, search?: string): Promise<Patient[]> {
    const res = await axios.get<Patient[]>('/v1/admin/patients', { params: { activeOnly, search } });
    return res.data;
  },
  async getById(id: string): Promise<Patient> {
    const res = await axios.get<Patient>(`/v1/admin/patients/${id}`);
    return res.data;
  },
  async create(data: PatientRequest): Promise<Patient> {
    const res = await axios.post<Patient>('/v1/admin/patients', data);
    return res.data;
  },
  async update(id: string, data: PatientRequest): Promise<Patient> {
    const res = await axios.put<Patient>(`/v1/admin/patients/${id}`, data);
    return res.data;
  },
};
