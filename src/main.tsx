import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ExamplePreviewWindow } from "@/features/examplePreview/ExamplePreviewWindow";
import { parseRootViewFromSearch } from "@/features/examplePreview/examplePreviewModel";
import { useThemeEffect } from "@/hooks";
import { useSettingsStore } from "@/store";
import "./index.css";
import "./editor-ai-diff.css";

function ExamplePreviewRoot({ exampleId }: { exampleId: string | null }) {
  const { settings, loadSettings } = useSettingsStore();

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useThemeEffect(settings.theme);
  return <ExamplePreviewWindow initialExampleId={exampleId} />;
}

const rootView = parseRootViewFromSearch(window.location.search);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {rootView.kind === "example-preview" ? (
      <ExamplePreviewRoot exampleId={rootView.exampleId} />
    ) : (
      <App />
    )}
  </StrictMode>,
);
