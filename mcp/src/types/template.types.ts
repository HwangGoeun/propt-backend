export type TemplateVariable = {
  name: string;
  description: string;
};

export type Template = {
  id: string;
  title: string;
  content: string;
  variables: TemplateVariable[] | [];
  outputType: string | null;
  createdAt: Date;
  updatedAt: Date;
};
