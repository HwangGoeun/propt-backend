export type TemplateVariable = {
  name: string;
  description: string;
};

export type Template = {
  id: string;
  title: string;
  content: string;
  variables: TemplateVariable[] | [];
  createdAt: Date;
  updatedAt: Date;
};
