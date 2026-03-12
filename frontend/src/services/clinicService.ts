import axios from '../lib/axios';

export interface Clinic {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  active: boolean;
  createdDate: string;
  createdBy: string;
  lastModifiedDate: string;
  lastModifiedBy: string;
  version: number;
}

export interface ClinicRequest {
  name: string;
  address?: string;
  phone?: string;
  fax?: string;
  email?: string;
}

export const clinicService = {
  async getAll(activeOnly = true): Promise<Clinic[]> {
    const res = await axios.get<Clinic[]>('/v1/admin/clinics', { params: { activeOnly } });
    return res.data;
  },
  async getById(id: string): Promise<Clinic> {
    const res = await axios.get<Clinic>(`/v1/admin/clinics/${id}`);
    return res.data;
  },
  async create(data: ClinicRequest): Promise<Clinic> {
    const res = await axios.post<Clinic>('/v1/admin/clinics', data);
    return res.data;
  },
  async update(id: string, data: ClinicRequest): Promise<Clinic> {
    const res = await axios.put<Clinic>(`/v1/admin/clinics/${id}`, data);
    return res.data;
  },
  async deactivate(id: string): Promise<void> {
    await axios.delete(`/v1/admin/clinics/${id}`);
  },
};
