import axios from '../lib/axios';

export type VisitType = string;
export type Urgency = string;
export type RequestStatus = string;

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface RequestListParams {
  status?: RequestStatus;
  clinicId?: string;
  locationId?: string;
  doctorId?: string;
  receivedDate?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export interface RequestPatient {
  requestPatientId: string;
  patientId: string;
  patientFirstName: string;
  patientLastName: string;
  medicareNo: string | null;
  notes: string | null;
}

export interface Request {
  id: string;
  clinicId: string;
  clinicName: string;
  clinicLocationId: string | null;
  clinicLocationName: string | null;
  doctorId: string | null;
  doctorName: string | null;
  enteredBy: string | null;
  enteredByName: string | null;
  visitType: VisitType;
  urgency: Urgency;
  status: RequestStatus;
  requestDetails: string | null;
  receivedAt: string;
  startTime: string | null;
  endTime: string | null;
  patients: RequestPatient[];
  createdDate: string;
  createdBy: string;
  lastModifiedDate: string;
  lastModifiedBy: string;
  version: number;
}

export interface RequestCreateRequest {
  clinicId: string;
  clinicLocationId?: string;
  doctorId?: string;
  enteredBy?: string;
  visitType: VisitType;
  urgency: Urgency;
  requestDetails?: string;
  receivedAt?: string;
  patients?: { patientId: string; notes?: string }[];
}

export interface RequestUpdateRequest {
  clinicId?: string;
  clinicLocationId?: string | null;
  doctorId?: string | null;
  enteredBy?: string | null;
  visitType?: VisitType;
  urgency?: Urgency;
  status?: RequestStatus;
  requestDetails?: string;
  receivedAt?: string;
  startTime?: string | null;
  endTime?: string | null;
}

export const requestService = {
  async getAll(p: RequestListParams = {}): Promise<PageResponse<Request>> {
    const params: Record<string, string | number> = {};
    if (p.status) params.status = p.status;
    if (p.clinicId) params.clinicId = p.clinicId;
    if (p.locationId) params.locationId = p.locationId;
    if (p.doctorId) params.doctorId = p.doctorId;
    if (p.receivedDate) params.receivedDate = p.receivedDate;
    if (p.sortBy) params.sortBy = p.sortBy;
    if (p.sortDir) params.sortDir = p.sortDir;
    if (p.page !== undefined) params.page = p.page;
    if (p.size !== undefined) params.size = p.size;
    const res = await axios.get<PageResponse<Request>>('/v1/admin/requests', { params });
    return res.data;
  },
  async getById(id: string): Promise<Request> {
    const res = await axios.get<Request>(`/v1/admin/requests/${id}`);
    return res.data;
  },
  async create(data: RequestCreateRequest): Promise<Request> {
    const res = await axios.post<Request>('/v1/admin/requests', data);
    return res.data;
  },
  async update(id: string, data: RequestUpdateRequest): Promise<Request> {
    const res = await axios.patch<Request>(`/v1/admin/requests/${id}`, data);
    return res.data;
  },
  async addPatient(requestId: string, patientId: string, notes?: string): Promise<Request> {
    const res = await axios.post<Request>(`/v1/admin/requests/${requestId}/patients`, { patientId, notes });
    return res.data;
  },
  async removePatient(requestId: string, requestPatientId: string): Promise<Request> {
    const res = await axios.delete<Request>(`/v1/admin/requests/${requestId}/patients/${requestPatientId}`);
    return res.data;
  },
  async getUsers(): Promise<{ id: string; username: string; firstName: string | null; lastName: string | null }[]> {
    const res = await axios.get('/v1/admin/requests/users');
    return res.data;
  },
  async exportExcel(p: Pick<RequestListParams, 'status' | 'clinicId' | 'locationId' | 'doctorId' | 'receivedDate'>): Promise<void> {
    const params: Record<string, string> = {};
    if (p.status) params.status = p.status;
    if (p.clinicId) params.clinicId = p.clinicId;
    if (p.locationId) params.locationId = p.locationId;
    if (p.doctorId) params.doctorId = p.doctorId;
    if (p.receivedDate) params.receivedDate = p.receivedDate;
    const res = await axios.get('/v1/admin/requests/export', { params, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `requests-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },
  async searchPatients(search: string): Promise<{ id: string; firstName: string; lastName: string; medicareNo: string | null }[]> {
    const res = await axios.get('/v1/admin/patients/search', { params: { activeOnly: true, q: search } });
    return res.data;
  },
};
