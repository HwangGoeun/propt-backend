import { apiRequest } from '../api/api-client.js';
import { ApiResponse } from '../types/api-response.types.js';
import { Template } from '../types/template.types.js';

export async function listTemplates(): Promise<Template[]> {
  const res = await apiRequest('/templates');

  if (!res.ok) {
    throw new Error(`템플릿 조회 실패 (HTTP ${res.status})`);
  }

  const responseBody = (await res.json()) as ApiResponse<Template[]>;

  if (!responseBody.ok) {
    throw new Error(`${responseBody.error.code}: ${responseBody.error.message}`);
  }

  return responseBody.data;
}
