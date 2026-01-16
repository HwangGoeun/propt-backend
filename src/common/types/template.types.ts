export type VariableType = 'text' | 'file';

/**
 * 템플릿에서 사용하는 변수 인터페이스
 */
export interface PromptTemplateVariable {
  name: string;
  type: VariableType;
}

/**
 * 템플릿 구조 인터페이스
 */
export interface PromptTemplate {
  id: string;
  title: string;
  description?: string;
  content: string;
  variables?: PromptTemplateVariable[];
  createdAt: Date;
  updatedAt: Date;
}
