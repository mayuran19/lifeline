import axios from '../lib/axios';

export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  providerNumber: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  createdDate: string;
  createdBy: string;
  lastModifiedDate: string;
  lastModifiedBy: string;
  version: number;
}

export interface DoctorRequest {
  firstName: string;
  lastName: string;
  providerNumber?: string;
  phone?: string;
  email?: string;
}

export const doctorService = {
  async getAll(activeOnly = true): Promise<Doctor[]> {
    const res = await axios.get<Doctor[]>('/v1/admin/doctors', { params: { activeOnly } });
    return res.data;
  },
  async getById(id: string): Promise<Doctor> {
    const res = await axios.get<Doctor>(`/v1/admin/doctors/${id}`);
    return res.data;
  },
  async create(data: DoctorRequest): Promise<Doctor> {
    const res = await axios.post<Doctor>('/v1/admin/doctors', data);
    return res.data;
  },
  async update(id: string, data: DoctorRequest): Promise<Doctor> {
    const res = await axios.put<Doctor>(`/v1/admin/doctors/${id}`, data);
    return res.data;
  },
  async deactivate(id: string): Promise<void> {
    await axios.delete(`/v1/admin/doctors/${id}`);
  },
};
