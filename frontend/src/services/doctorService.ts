import axios from '../lib/axios';

export interface DoctorClinic {
  id: string;
  clinicId: string;
  clinicName: string | null;
  clinicLocationId: string | null;
  clinicLocationName: string | null;
  clinicLocationAddress: string | null;
  active: boolean;
}

export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  providerNumber: string | null;
  prescriberNo: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  clinics: DoctorClinic[];
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
  prescriberNo?: string;
  phone?: string;
  email?: string;
}

export interface DoctorClinicRequest {
  clinicId: string;
  clinicLocationId?: string;
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
  async addClinic(id: string, data: DoctorClinicRequest): Promise<Doctor> {
    const res = await axios.post<Doctor>(`/v1/admin/doctors/${id}/clinics`, data);
    return res.data;
  },
  async removeClinic(id: string, associationId: string): Promise<Doctor> {
    const res = await axios.delete<Doctor>(`/v1/admin/doctors/${id}/clinics/${associationId}`);
    return res.data;
  },
};
