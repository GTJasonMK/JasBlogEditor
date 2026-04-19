import type { AIApplyMode } from "./aiWritingAssistantTypes";

export interface PendingAISuggestion {
  mode: AIApplyMode;
  sourceContent: string;
  generatedText: string;
  selectionStart: number;
  selectionEnd: number;
  nextContent: string;
  selectedText: string;
}
