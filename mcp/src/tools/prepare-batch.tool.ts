import { getTemplate } from '../api/api-client.js';
import type { Template } from '../types/template.types.js';
import { generateExecutionGuide } from './messages/batch-messages.js';

/**
 * 배치 실행 준비 결과
 */
export type BatchPreparation = {
  template: Template;
  totalCount: number;
  executionGuide: string;
};

/**
 * 변수 세트가 필수 변수를 모두 포함하는지 검증합니다.
 *
 * @param requiredVars - 필수 변수명 배열
 * @param variableSets - 검증할 변수 세트 배열
 * @throws {Error} 누락된 변수가 있을 경우 에러를 던집니다
 */
function validateVariableSets(
  requiredVars: string[],
  variableSets: Record<string, string>[],
): void {
  const missingVars = variableSets
    .map((vars, idx) => {
      const missing = requiredVars.filter((name) => !(name in vars));
      return missing.length > 0 ? { index: idx, missing } : null;
    })
    .filter((item): item is { index: number; missing: string[] } => item !== null);

  if (missingVars.length > 0) {
    throw new Error(
      `변수 누락 발견:\n${missingVars
        .map((m) => `세트 ${m.index + 1}: ${m.missing.join(', ')} 누락`)
        .join('\n')}`,
    );
  }
}

/**
 * 배치 실행을 준비합니다.
 *
 * @param templateId - 실행할 템플릿의 ID
 * @param variableSets - 적용할 변수 세트 배열
 * @returns 배치 실행 준비 정보
 */
export async function prepareBatch(
  templateId: string,
  variableSets: Record<string, string>[],
): Promise<BatchPreparation> {
  const template = await getTemplate(templateId);

  // 변수 검증 (템플릿에 정의된 변수 확인)
  const requiredVars = template.variables.map((v) => v.name);
  validateVariableSets(requiredVars, variableSets);

  return {
    template,
    totalCount: variableSets.length,
    executionGuide: generateExecutionGuide(template, variableSets),
  };
}
