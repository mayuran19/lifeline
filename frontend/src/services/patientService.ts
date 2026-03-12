import axios from '../lib/axios';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  phone: string | null;
  active: boolean;
  createdDate: string;
  createdBy: string;
  lastModifiedDate: string;
  lastModifiedBy: string;
  version: number;
}

export interface PatientRequest {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phone?: string;
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
  async deactivate(id: string): Promise<void> {
    await axios.delete(`/v1/admin/patients/${id}`);
  },
};
