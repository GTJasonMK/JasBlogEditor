import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import { Compartment, EditorSelection, EditorState } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightSpecialChars,
  keymap,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { searchKeymap } from "@codemirror/search";
import { markdown } from "@codemirror/lang-markdown";
import type { PendingAISuggestion } from "@/services/aiSuggestionTypes";
import type { EditorSurfaceHandle } from "@/services/editorSurface";
import { EMPTY_SELECTION } from "@/services/editorSurface";
import { createSuggestionDecorations } from "@/services/codeMirrorSuggestionDecorations";

interface MarkdownCodeEditorProps {
  value: string;
  readOnly: boolean;
  isGenerating: boolean;
  suggestion: PendingAISuggestion | null;
  onChange: (value: string) => void;
}

const themeExtension = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "var(--color-paper)",
    color: "var(--color-text)",
    fontFamily:
      '"Fira Code", "JetBrains Mono", "Consolas", "Monaco", "Menlo", monospace',
    fontSize: "14px",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "inherit",
    lineHeight: "1.6",
  },
  ".cm-content": {
    minHeight: "100%",
    padding: "16px",
    caretColor: "var(--color-primary)",
  },
  ".cm-focused": {
    outline: "none",
  },
  ".cm-line": {
    padding: "0",
  },
  ".cm-gutters": {
    display: "none",
  },
  ".cm-selectionBackground": {
    backgroundColor: "var(--color-primary) !important",
    color: "#fff",
  },
});

function buildEditorExtensions(
  editableCompartment: Compartment,
  readOnlyCompartment: Compartment,
  suggestionCompartment: Compartment,
  onChange: (value: string) => void,
  onExternalUpdate: MutableRefObject<boolean>
) {
  return [
    highlightSpecialChars(),
    history(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(false),
    EditorView.lineWrapping,
    highlightActiveLine(),
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
    markdown(),
    themeExtension,
    editableCompartment.of(EditorView.editable.of(true)),
    readOnlyCompartment.of(EditorState.readOnly.of(false)),
    suggestionCompartment.of([]),
    EditorView.updateListener.of((update) => {
      if (!update.docChanged || onExternalUpdate.current) {
        return;
      }

      onChange(update.state.doc.toString());
    }),
  ];
}

export const MarkdownCodeEditor = forwardRef<EditorSurfaceHandle, MarkdownCodeEditorProps>(
  function MarkdownCodeEditor(
    { value, readOnly, isGenerating, suggestion, onChange },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const viewRef = useRef<EditorView | null>(null);
    const externalUpdateRef = useRef(false);
    const editableCompartment = useMemo(() => new Compartment(), []);
    const readOnlyCompartment = useMemo(() => new Compartment(), []);
    const suggestionCompartment = useMemo(() => new Compartment(), []);

    useEffect(() => {
      if (!containerRef.current || viewRef.current) {
        return;
      }

      const state = EditorState.create({
        doc: value,
        extensions: buildEditorExtensions(
          editableCompartment,
          readOnlyCompartment,
          suggestionCompartment,
          onChange,
          externalUpdateRef
        ),
      });

      viewRef.current = new EditorView({
        state,
        parent: containerRef.current,
      });

      return () => {
        viewRef.current?.destroy();
        viewRef.current = null;
      };
    }, [onChange, readOnlyCompartment, suggestionCompartment, value]);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) {
        return;
      }

      view.dispatch({
        effects: [
          editableCompartment.reconfigure(EditorView.editable.of(!readOnly)),
          readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)),
        ],
      });
    }, [editableCompartment, readOnly, readOnlyCompartment]);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) {
        return;
      }

      view.dispatch({
        effects: suggestionCompartment.reconfigure(
          createSuggestionDecorations(suggestion, isGenerating)
        ),
      });
    }, [isGenerating, suggestion, suggestionCompartment]);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) {
        return;
      }

      const current = view.state.doc.toString();
      if (current === value) {
        return;
      }

      externalUpdateRef.current = true;
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
      externalUpdateRef.current = false;
    }, [value]);

    useImperativeHandle(ref, () => ({
      getSelectionSnapshot: () => {
        const view = viewRef.current;
        if (!view) {
          return EMPTY_SELECTION;
        }

        const main = view.state.selection.main;
        return {
          start: main.from,
          end: main.to,
          text: view.state.sliceDoc(main.from, main.to),
        };
      },
      focusRange: (start, end) => {
        const view = viewRef.current;
        if (!view) {
          return;
        }

        view.dispatch({
          selection: EditorSelection.range(start, end),
          scrollIntoView: true,
        });
        view.focus();
      },
    }), []);

    return <div ref={containerRef} className="h-full min-h-0 editor-codemirror" />;
  }
);
