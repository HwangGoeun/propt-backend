import { getTemplate } from '../api/api-client.js';
import type { Template } from '../types/template.types.js';

/**
 * 단일 템플릿의 상세 정보를 조회합니다.
 *
 * @param templateId - 조회할 템플릿의 ID
 * @returns 템플릿 상세 정보
 */
export async function getTemplateById(templateId: string): Promise<Template> {
  return await getTemplate(templateId);
}
