import axios from '../lib/axios';

export interface ClinicEmail {
  id: string;
  email: string;
  label: string | null;
  primary: boolean;
}

export interface ClinicLocation {
  id: string;
  clinicId: string;
  name: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  suburb: string | null;
  state: string;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  formattedAddress: string | null;
  managerName: string | null;
  careCoordinationName: string | null;
  phone: string | null;
  fax: string | null;
  primary: boolean;
  active: boolean;
  emails: ClinicEmail[];
}

export interface Clinic {
  id: string;
  name: string;
  phone: string | null;
  fax: string | null;
  active: boolean;
  emails: ClinicEmail[];
  locations: ClinicLocation[];
  createdDate: string;
  lastModifiedDate: string;
  version: number;
}

export interface ClinicRequest {
  name: string;
  phone?: string;
  fax?: string;
}

export interface ClinicEmailRequest {
  email: string;
  label?: string;
  primary?: boolean;
}

export interface ClinicLocationRequest {
  name?: string;
  addressLine1?: string;
  addressLine2?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
  formattedAddress?: string;
  managerName?: string;
  careCoordinationName?: string;
  phone?: string;
  fax?: string;
  primary?: boolean;
  emails?: ClinicEmailRequest[];
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

  // Emails
  async addEmail(clinicId: string, data: ClinicEmailRequest): Promise<ClinicEmail> {
    const res = await axios.post<ClinicEmail>(`/v1/admin/clinics/${clinicId}/emails`, data);
    return res.data;
  },
  async updateEmail(clinicId: string, emailId: string, data: ClinicEmailRequest): Promise<ClinicEmail> {
    const res = await axios.put<ClinicEmail>(`/v1/admin/clinics/${clinicId}/emails/${emailId}`, data);
    return res.data;
  },
  async deleteEmail(clinicId: string, emailId: string): Promise<void> {
    await axios.delete(`/v1/admin/clinics/${clinicId}/emails/${emailId}`);
  },

  // Locations
  async addLocation(clinicId: string, data: ClinicLocationRequest): Promise<ClinicLocation> {
    const res = await axios.post<ClinicLocation>(`/v1/admin/clinics/${clinicId}/locations`, data);
    return res.data;
  },
  async updateLocation(clinicId: string, locationId: string, data: ClinicLocationRequest): Promise<ClinicLocation> {
    const res = await axios.put<ClinicLocation>(`/v1/admin/clinics/${clinicId}/locations/${locationId}`, data);
    return res.data;
  },
  async deactivateLocation(clinicId: string, locationId: string): Promise<void> {
    await axios.delete(`/v1/admin/clinics/${clinicId}/locations/${locationId}`);
  },
};