import type { ComponentType, ReactElement } from 'react';
import type {
  ContentType,
  DocMetadata,
  DiaryMetadata,
  EditorFile,
  GraphMetadata,
  NoteMetadata,
  ProjectMetadata,
  RoadmapMetadata,
} from '@/types';

import { DiaryMetaForm } from '@/components/forms/DiaryMetaForm';
import { DocMetaForm } from '@/components/forms/DocMetaForm';
import { GraphMetaForm } from '@/components/forms/GraphMetaForm';
import { NoteMetaForm } from '@/components/forms/NoteMetaForm';
import { ProjectMetaForm } from '@/components/forms/ProjectMetaForm';
import { RoadmapMetaForm } from '@/components/forms/RoadmapMetaForm';

import { DiaryPreview } from '@/components/preview/previews/DiaryPreview';
import { DocPreview } from '@/components/preview/previews/DocPreview';
import { GraphPreview } from '@/components/preview/previews/GraphPreview';
import { NotePreview } from '@/components/preview/previews/NotePreview';
import { ProjectPreview } from '@/components/preview/previews/ProjectPreview';
import { RoadmapPreview } from '@/components/preview/previews/RoadmapPreview';

type PreviewRenderer = (file: EditorFile, bodyContent: string) => ReactElement;

export interface ContentTypeUiConfig {
  MetaForm: ComponentType;
  renderPreview: PreviewRenderer;
}

/**
 * 内容类型 UI 配置注册表
 *
 * 目标：
 * - 新增内容类型时只需补 1 处配置
 * - 避免在多个组件里写 switch/if 链
 */
export const CONTENT_TYPE_UI: Record<ContentType, ContentTypeUiConfig> = {
  note: {
    MetaForm: NoteMetaForm,
    renderPreview: (file, bodyContent) => (
      <NotePreview
        fileName={file.name}
        metadata={file.metadata as NoteMetadata}
        content={bodyContent}
      />
    ),
  },
  project: {
    MetaForm: ProjectMetaForm,
    renderPreview: (file, bodyContent) => (
      <ProjectPreview metadata={file.metadata as ProjectMetadata} content={bodyContent} />
    ),
  },
  diary: {
    MetaForm: DiaryMetaForm,
    renderPreview: (file, bodyContent) => (
      <DiaryPreview
        filePath={file.path}
        fileName={file.name}
        metadata={file.metadata as DiaryMetadata}
        content={bodyContent}
      />
    ),
  },
  roadmap: {
    MetaForm: RoadmapMetaForm,
    renderPreview: (file, bodyContent) => (
      <RoadmapPreview metadata={file.metadata as RoadmapMetadata} content={bodyContent} />
    ),
  },
  graph: {
    MetaForm: GraphMetaForm,
    renderPreview: (file, bodyContent) => (
      <GraphPreview metadata={file.metadata as GraphMetadata} content={bodyContent} />
    ),
  },
  doc: {
    MetaForm: DocMetaForm,
    renderPreview: (file, bodyContent) => (
      <DocPreview metadata={file.metadata as DocMetadata} content={bodyContent} />
    ),
  },
};
