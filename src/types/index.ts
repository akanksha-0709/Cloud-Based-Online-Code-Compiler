export interface CodeExecutionRequest {
  language: string;
  code: string;
  input?: string;
}

export interface CodeExecutionResponse {
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
  memoryUsed?: number;
}

export interface Language {
  id: string;
  name: string;
  extension: string;
  template: string;
}