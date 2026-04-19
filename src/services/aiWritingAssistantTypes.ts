import type { EditorFile } from "@/types";

export type AIAction = "continue" | "polish" | "summary" | "translate" | "custom";
export type AIApplyMode = "insert" | "replace";

export interface BuildAIAssistantMessagesParams {
  action: AIAction;
  file: EditorFile;
  selectedText: string;
  customPrompt: string;
  mode: AIApplyMode;
  selectionStart: number;
  selectionEnd: number;
}

export interface ValidateGeneratedTextApplicationParams {
  file: EditorFile;
  mode: AIApplyMode;
  generatedText: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface GeneratedTextValidationResult {
  ok: boolean;
  nextContent: string;
  issues: string[];
  message?: string;
  discardSuggestion?: boolean;
}
