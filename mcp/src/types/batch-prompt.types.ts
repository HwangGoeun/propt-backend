/**
 * 배치 실행용 개별 프롬프트
 */
export type BatchPromptItem = {
  index: number;
  variables: Record<string, string>;
  prompt: string;
};

/**
 * 배치 실행용 프롬프트 목록
 */
export type BatchPrompts = {
  templateTitle: string;
  prompts: BatchPromptItem[];
};
