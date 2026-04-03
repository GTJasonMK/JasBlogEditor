import {
  FRONTMATTER_HELP_EXAMPLES,
  type FrontmatterHelpExample,
} from "@/components/layout/toolbar/help/frontmatterHelpData";

export const EXAMPLE_PREVIEW_VIEW = "example-preview";
export const EXAMPLE_PREVIEW_WINDOW_LABEL = "example-preview";
export const EXAMPLE_PREVIEW_NAVIGATE_EVENT = "example-preview:navigate";

export type ExamplePreviewType = FrontmatterHelpExample["type"];
export type ExamplePreviewNavigatePayload = { exampleId: string };

export type RootView =
  | { kind: "editor" }
  | { kind: typeof EXAMPLE_PREVIEW_VIEW; exampleId: string | null };

const EXAMPLE_INDEX_BY_ID = new Map(
  FRONTMATTER_HELP_EXAMPLES.map((example, index) => [example.id, index])
);

function wrapIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

export function parseRootViewFromSearch(search: string): RootView {
  const params = new URLSearchParams(search);
  if (params.get("view") !== EXAMPLE_PREVIEW_VIEW) {
    return { kind: "editor" };
  }

  return {
    kind: EXAMPLE_PREVIEW_VIEW,
    exampleId: params.get("exampleId"),
  };
}

export function buildExamplePreviewUrl(
  currentHref: string,
  exampleId: string
): string {
  const url = new URL(currentHref);
  url.hash = "";
  url.search = "";
  url.searchParams.set("view", EXAMPLE_PREVIEW_VIEW);
  url.searchParams.set("exampleId", exampleId);
  return url.toString();
}

export function getFrontmatterHelpExampleById(
  exampleId: string | null | undefined
): FrontmatterHelpExample | null {
  if (!exampleId) {
    return null;
  }

  return FRONTMATTER_HELP_EXAMPLES.find((example) => example.id === exampleId) ?? null;
}

export function getFrontmatterHelpExamplesByType(
  type: ExamplePreviewType
): FrontmatterHelpExample[] {
  return FRONTMATTER_HELP_EXAMPLES.filter((example) => example.type === type);
}

export function getAdjacentExampleId(
  currentExampleId: string,
  offset: number
): string | null {
  const currentIndex = EXAMPLE_INDEX_BY_ID.get(currentExampleId);
  if (currentIndex === undefined || FRONTMATTER_HELP_EXAMPLES.length === 0) {
    return null;
  }

  const nextIndex = wrapIndex(
    currentIndex + offset,
    FRONTMATTER_HELP_EXAMPLES.length
  );
  return FRONTMATTER_HELP_EXAMPLES[nextIndex]?.id ?? null;
}
