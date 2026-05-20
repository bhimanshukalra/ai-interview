import type { CreateInterviewResponse } from '@ai-interview/shared';

const codeEditorInterviewTypes: Array<CreateInterviewResponse['input']['type']> = [
  'technical',
  'system-design',
  'mixed',
];

export function shouldShowCodeEditor(interview: CreateInterviewResponse): boolean {
  return codeEditorInterviewTypes.includes(interview.input.type);
}
