import type { HelpTabContentDefinition } from "./helpModalSchema";
import { HELP_MODAL_ADVANCED_MARKDOWN_TABS } from "./helpModalAdvancedMarkdownTabs";
import { HELP_MODAL_BASIC_MARKDOWN_TABS } from "./helpModalBasicMarkdownTabs";

export const HELP_MODAL_MARKDOWN_TABS: HelpTabContentDefinition[] = [
  ...HELP_MODAL_BASIC_MARKDOWN_TABS,
  ...HELP_MODAL_ADVANCED_MARKDOWN_TABS,
];
