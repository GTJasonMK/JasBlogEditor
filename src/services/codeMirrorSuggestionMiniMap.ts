/**
 * AI diff 滚动条 minimap
 *
 * 在编辑器右侧叠加一条 overlay，每个修改 hunk 一个彩色标记。
 * 用户即使在当前视口之外也能看到全文修改分布，点击标记直接跳转到对应位置。
 */

import type { Extension } from "@codemirror/state";
import {
  EditorView,
  ViewPlugin,
  type PluginValue,
  type ViewUpdate,
} from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import type { SuggestionPatchModel } from "./aiSuggestionInlineDiff";
import type { PendingAISuggestion } from "./aiSuggestionTypes";

function findHostElement(view: EditorView): HTMLElement {
  return view.dom;
}

function buildMarker(
  view: EditorView,
  anchor: number,
  docLength: number
): HTMLElement {
  const ratio = docLength === 0 ? 0 : anchor / docLength;
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "cm-ai-diff-minimap-marker";
  marker.style.top = `${Math.min(100, Math.max(0, ratio * 100))}%`;
  marker.title = "跳转到该修改";
  marker.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const safeAnchor = Math.max(0, Math.min(anchor, docLength));
    view.dispatch({
      selection: EditorSelection.single(safeAnchor),
      effects: EditorView.scrollIntoView(safeAnchor, { y: "center" }),
    });
    view.focus();
  });
  return marker;
}

export function createSuggestionMiniMap(
  suggestion: PendingAISuggestion,
  patchModel: SuggestionPatchModel
): Extension {
  const hunkAnchors = patchModel.hunks
    .map((hunk) => hunk.sourceAnchor)
    .filter((anchor, index, arr) => arr.indexOf(anchor) === index);

  if (hunkAnchors.length === 0) {
    return [];
  }

  return ViewPlugin.fromClass(
    class implements PluginValue {
      overlay: HTMLElement;

      constructor(view: EditorView) {
        this.overlay = document.createElement("div");
        this.overlay.className = "cm-ai-diff-minimap";
        const host = findHostElement(view);
        host.appendChild(this.overlay);
        this.render(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.render(update.view);
        }
      }

      render(view: EditorView) {
        this.overlay.replaceChildren();
        const docLength = suggestion.sourceContent.length;
        hunkAnchors.forEach((anchor) => {
          this.overlay.appendChild(buildMarker(view, anchor, docLength));
        });
      }

      destroy() {
        this.overlay.remove();
      }
    }
  );
}
