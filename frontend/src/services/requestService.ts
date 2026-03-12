import axios from '../lib/axios';

export type VisitType = 'ROUTINE_ROUND' | 'URGENT' | 'AFTER_HOURS' | 'PHONE_CONSULT';
export type Urgency = 'ROUTINE' | 'URGENT' | 'EMERGENCY';
export type RequestStatus = 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED';

export interface RequestPatient {
  requestPatientId: string;
  patientId: string;
  patientFirstName: string;
  patientLastName: string;
  notes: string | null;
}

export interface Request {
  id: string;
  clinicId: string;
  clinicName: string;
  doctorId: string | null;
  doctorName: string | null;
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
  doctorId?: string;
  visitType: VisitType;
  urgency: Urgency;
  requestDetails?: string;
  receivedAt?: string;
  startTime?: string;
  endTime?: string;
  patients?: { patientId: string; notes?: string }[];
}

export interface RequestUpdateRequest {
  doctorId?: string;
  visitType?: VisitType;
  urgency?: Urgency;
  status?: RequestStatus;
  requestDetails?: string;
  receivedAt?: string;
  startTime?: string;
  endTime?: string;
}

export const requestService = {
  async getAll(status?: RequestStatus, clinicId?: string): Promise<Request[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (clinicId) params.clinicId = clinicId;
    const res = await axios.get<Request[]>('/v1/admin/requests', { params });
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
};
