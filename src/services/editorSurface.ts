export interface EditorSelectionSnapshot {
  start: number;
  end: number;
  text: string;
}

export interface EditorSurfaceHandle {
  getSelectionSnapshot: () => EditorSelectionSnapshot;
  focusRange: (start: number, end: number) => void;
}

export const EMPTY_SELECTION: EditorSelectionSnapshot = {
  start: 0,
  end: 0,
  text: "",
};
