import axios from '../lib/axios';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  username: string;
  email: string;
  role: string;
}

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>('/v1/auth/login', data);
    return response.data;
  },

  async logout(): Promise<void> {
    await axios.post('/v1/auth/logout');
  },

  async refresh(): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>('/v1/auth/refresh');
    return response.data;
  },
};
