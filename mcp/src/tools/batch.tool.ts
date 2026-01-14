import { getTemplate } from '../api/api-client.js';
import type { BatchPromptItem, BatchPrompts } from '../types/batch-prompt.types.js';
import type { Template } from '../types/template.types.js';

/**
 * 템플릿 문자열의 플레이스홀더를 실제 값으로 치환합니다.
 *
 * @param template - DB에 저장된 템플릿 원본 문자열 (예: "{과일}을 {언어}로 번역하면?")
 * @param variables - 변수명과 실제 값의 쌍 (예: { 과일: "바나나", 언어: "영어" })
 * @returns 플레이스홀더가 실제 값으로 치환된 문자열 (예: "바나나을 영어로 번역하면?")
 *
 * @example
 * fillTemplate("{과일}을 {언어}로 번역하면?", { 과일: "바나나", 언어: "영어" })
 * => "바나나을 영어로 번역하면?"
 */
export function fillTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    return variables[key] ?? `{${key}}`;
  });
}

/**
 * 하나의 템플릿에 여러 변수 세트를 적용하여 배치 실행용 프롬프트를 생성합니다.
 *
 * @param templateId - 실행할 템플릿의 ID
 * @param variableSets - 적용할 변수 세트 배열 (각 세트마다 하나의 프롬프트 생성)
 * @returns 템플릿 제목과 프롬프트 배열을 포함한 BatchPrompts
 *
 * @example
 * await executeBatch("template-123", [
 *   { 과일: "바나나", 언어: "영어" },
 *   { 과일: "사과", 언어: "영어" }
 * ])
 * => {
 *   templateTitle: "과일 다국어 번역",
 *   prompts: [
 *     { index: 0, variables: { 과일: "바나나", 언어: "영어" }, prompt: "바나나을 영어로 번역하면?" },
 *     { index: 1, variables: { 과일: "사과", 언어: "영어" }, prompt: "사과을 영어로 번역하면?" }
 *   ]
 * }
 */
export async function executeBatch(
  templateId: string,
  variableSets: Record<string, string>[],
): Promise<BatchPrompts> {
  const template: Template = await getTemplate(templateId);

  const prompts: BatchPromptItem[] = variableSets.map((variables, index) => ({
    index,
    variables,
    prompt: fillTemplate(template.content, variables),
  }));

  return {
    templateTitle: template.title,
    prompts,
  };
}
