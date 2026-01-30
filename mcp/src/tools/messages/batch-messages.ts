import type { Template } from '../../types/template.types.js';

/**
 * 배치 항목 정보
 */
export type BatchItem = {
  id: string;
  variables: Record<string, string>;
  filledPrompt: string;
};

/**
 * 템플릿 문자열의 플레이스홀더를 실제 값으로 치환합니다.
 */
function fillTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    return variables[key] ?? `{${key}}`;
  });
}

/**
 * 익명화된 ID를 생성합니다 (A, B, C, ... Z, AA, AB, ...)
 */
function generateAnonymousId(index: number): string {
  let id = '';
  let n = index;
  do {
    id = String.fromCharCode(65 + (n % 26)) + id;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return id;
}

/**
 * 배치 항목들을 준비합니다.
 */
export function prepareBatchItems(
  template: Template,
  variableSets: Record<string, string>[],
): BatchItem[] {
  return variableSets.map((vars, i) => ({
    id: generateAnonymousId(i),
    variables: vars,
    filledPrompt: fillTemplate(template.content, vars),
  }));
}

/**
 * 클로드 데스크탑에 최적화된 배치 실행 가이드를 생성합니다.
 * 컨텍스트 분리에 초점을 맞춘 범용 프롬프트입니다.
 */
export function generateExecutionGuide(
  template: Template,
  variableSets: Record<string, string>[],
): string {
  const items = prepareBatchItems(template, variableSets);

  const promptList = items
    .map(
      (item) => `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[${item.id}]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${item.filledPrompt}`,
    )
    .join('\n\n');

  const outputInstruction = getOutputTypeInstruction(template.outputType);

  return `# 배치 처리 요청 (${items.length}건)

## 처리 방식
각 항목을 **독립적으로** 처리해주세요.

**핵심 원칙:**
- 각 항목은 별개의 요청으로 취급
- 해당 항목의 내용만을 기반으로 응답 생성
- 항목 간 참조나 비교 없이 개별 처리

**주의사항:**
- 다른 항목의 내용을 언급하지 않음
- "다른 항목과 달리", "앞선 내용처럼" 등의 표현 사용 금지
- 각 응답은 해당 항목만 보고 작성한 것처럼 구성

---

## 처리할 항목

${promptList}

---

## 응답 형식
${outputInstruction ? `\n> **출력 형식 지시사항**\n> ${outputInstruction}\n` : ''}
각 항목별로 구분하여 응답해주세요:

## [A]
(A에 대한 응답)

## [B]
(B에 대한 응답)

---

처리를 시작해주세요.`;
}

export function getOutputTypeInstruction(outputType: string | null): string {
  if (!outputType) return '';

  const presetInstructions: Record<string, string> = {
    markdown: '응답 전체를 마크다운 코드 블록(```markdown)으로 감싸서 작성해주세요.',
    json: '응답 전체를 JSON 코드 블록(```json)으로 감싸서 작성해주세요.',
    table: '응답을 마크다운 표 형식으로 작성해주세요.',
    bullet_list: '응답을 불릿 리스트 형식으로 작성해주세요.',
    csv: '응답 전체를 CSV 코드 블록(```csv)으로 감싸서 작성해주세요.',
    html: '응답 전체를 HTML 코드 블록(```html)으로 감싸서 작성해주세요.',
  };

  if (outputType in presetInstructions) {
    return presetInstructions[outputType];
  }

  // 프리셋에 없는 경우 Claude가 스스로 판단하도록 지시
  return `**[필수] 출력 형식: ${outputType}**

이 출력 형식이 파일 확장자(pdf, docx, pptx, xlsx 등)인 경우:
- 반드시 도구를 사용하여 실제 파일을 생성해야 합니다
- 텍스트로만 응답하지 마세요
- 파일 생성이 불가능한 경우에만 이유를 설명해주세요

텍스트 형식인 경우:
- 해당 형식으로 응답을 작성해주세요`;
}
