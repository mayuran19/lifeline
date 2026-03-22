import axios from '../lib/axios';

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  enabled: boolean;
  createdDate: string;
  lastModifiedDate: string;
}

export interface UserCreateRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

export interface UserUpdateRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  enabled?: boolean;
  password?: string;
}

export const userService = {
  async getAll(): Promise<UserResponse[]> {
    const response = await axios.get<UserResponse[]>('/v1/admin/users');
    return response.data;
  },

  async getById(id: string): Promise<UserResponse> {
    const response = await axios.get<UserResponse>(`/v1/admin/users/${id}`);
    return response.data;
  },

  async create(data: UserCreateRequest): Promise<UserResponse> {
    const response = await axios.post<UserResponse>('/v1/admin/users', data);
    return response.data;
  },

  async update(id: string, data: UserUpdateRequest): Promise<UserResponse> {
    const response = await axios.put<UserResponse>(`/v1/admin/users/${id}`, data);
    return response.data;
  },
};
