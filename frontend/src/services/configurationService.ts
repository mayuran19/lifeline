import axios from '../lib/axios';

export interface Configuration {
  configGroup: string;
  groupDisplayOrder: number;
  configKey: string;
  configDescription: string | null;
  configDisplayOrder: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdDate: string;
  createdBy: string | null;
  lastModifiedDate: string;
  lastModifiedBy: string | null;
  version: number;
}

export interface ConfigurationCreateRequest {
  configGroup: string;
  groupDisplayOrder: number;
  configKey: string;
  configDescription?: string;
  configDisplayOrder: number;
}

export interface ConfigurationUpdateRequest {
  configDescription?: string;
  configDisplayOrder?: number;
  groupDisplayOrder?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export const configurationService = {
  async getAll(group?: string): Promise<Configuration[]> {
    const params: Record<string, string> = {};
    if (group) params.group = group;
    const res = await axios.get<Configuration[]>('/v1/admin/configurations', { params });
    return res.data;
  },
  async create(data: ConfigurationCreateRequest): Promise<Configuration> {
    const res = await axios.post<Configuration>('/v1/admin/configurations', data);
    return res.data;
  },
  async update(configGroup: string, configKey: string, data: ConfigurationUpdateRequest): Promise<Configuration> {
    const res = await axios.patch<Configuration>(
      `/v1/admin/configurations/${encodeURIComponent(configGroup)}/${encodeURIComponent(configKey)}`,
      data
    );
    return res.data;
  },
};
