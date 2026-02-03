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
 * 프롬프트 문자열을 쉘에서 안전하게 사용할 수 있도록 이스케이프합니다.
 */
function escapeForShell(str: string): string {
  return str.replace(/'/g, "'\\''");
}

/**
 * 파일 생성이 필요한 출력 형식인지 확인합니다.
 */
function requiresFileCreation(outputType: string | null): boolean {
  if (!outputType) return false;
  const fileExtensions = ['pdf', 'docx', 'pptx', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'svg'];
  return fileExtensions.includes(outputType.toLowerCase());
}

/**
 * 배치 실행 가이드를 생성합니다.
 * 각 항목이 완전히 독립된 컨텍스트에서 실행되도록 claude -p 명령어를 사용합니다.
 */
export function generateExecutionGuide(
  template: Template,
  variableSets: Record<string, string>[],
): string {
  const items = prepareBatchItems(template, variableSets);
  const needsTools = requiresFileCreation(template.outputType);

  const commands = items.map((item) => {
    const instruction = getOutputTypeInstruction(template.outputType, item.id);
    const promptWithInstruction = instruction
      ? `${item.filledPrompt}\n\n${instruction}`
      : item.filledPrompt;
    const escapedPrompt = escapeForShell(promptWithInstruction);
    const toolsOption = needsTools ? " --allowedTools 'Bash,Write,Read,Edit'" : '';
    return `claude -p '${escapedPrompt}'${toolsOption} > "batch_result_${item.id}.md"`;
  });

  return `# 배치 실행 (${items.length}건) - 독립 컨텍스트 모드

## 실행 방법

각 항목을 **완전히 독립된 컨텍스트**에서 실행합니다.
아래 명령어들을 Bash 도구로 실행해주세요.

**핵심 원칙:**
- 각 명령어는 새로운 Claude 세션에서 실행됨
- 이전 항목의 응답을 전혀 알 수 없음
- 완벽한 컨텍스트 분리 보장

---

## 실행할 명령어

${commands.map((cmd, i) => `### [${items[i].id}]\n\`\`\`bash\n${cmd}\n\`\`\``).join('\n\n')}

---

## 실행 지시사항

1. 위 명령어들을 **순서대로** Bash 도구로 실행해주세요.
2. 각 명령어 실행이 완료될 때까지 기다린 후 다음 명령어를 실행하세요.
3. 모든 실행이 완료되면 결과 파일들(batch_result_A.md, batch_result_B.md, ...)을 확인해주세요.

실행을 시작해주세요.`;
}

export function getOutputTypeInstruction(outputType: string | null, itemId?: string): string {
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

  // 파일명 지시 (배치 실행 시 ID가 있으면 포함)
  const filenameSuffix = itemId ? `_${itemId}` : '';
  const filenameInstruction = itemId
    ? `- 파일명은 반드시 "output${filenameSuffix}.${outputType}" 형식으로 지정하세요`
    : '';

  // 프리셋에 없는 경우 Claude가 스스로 판단하도록 지시
  return `**[필수] 출력 형식: ${outputType}**

이 출력 형식이 파일 확장자(pdf, docx, pptx, xlsx 등)인 경우:
- 반드시 도구를 사용하여 실제 파일을 생성해야 합니다
${filenameInstruction}
- 텍스트로만 응답하지 마세요
- 파일 생성이 불가능한 경우에만 이유를 설명해주세요

텍스트 형식인 경우:
- 해당 형식으로 응답을 작성해주세요`;
}
