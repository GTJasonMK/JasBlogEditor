import { lazy, Suspense, type ComponentType, type ReactElement } from 'react';
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

// 元数据表单：体积小，常驻显示，保持静态导入
import { DiaryMetaForm } from '@/components/forms/DiaryMetaForm';
import { DocMetaForm } from '@/components/forms/DocMetaForm';
import { GraphMetaForm } from '@/components/forms/GraphMetaForm';
import { NoteMetaForm } from '@/components/forms/NoteMetaForm';
import { ProjectMetaForm } from '@/components/forms/ProjectMetaForm';
import { RoadmapMetaForm } from '@/components/forms/RoadmapMetaForm';

// 预览组件：拉入 react-markdown / mermaid / @xyflow/react 等重型依赖，懒加载
const LazyNotePreview = lazy(() =>
  import('@/components/preview/previews/NotePreview').then(m => ({ default: m.NotePreview }))
);
const LazyProjectPreview = lazy(() =>
  import('@/components/preview/previews/ProjectPreview').then(m => ({ default: m.ProjectPreview }))
);
const LazyDiaryPreview = lazy(() =>
  import('@/components/preview/previews/DiaryPreview').then(m => ({ default: m.DiaryPreview }))
);
const LazyRoadmapPreview = lazy(() =>
  import('@/components/preview/previews/RoadmapPreview').then(m => ({ default: m.RoadmapPreview }))
);
const LazyGraphPreview = lazy(() =>
  import('@/components/preview/previews/GraphPreview').then(m => ({ default: m.GraphPreview }))
);
const LazyDocPreview = lazy(() =>
  import('@/components/preview/previews/DocPreview').then(m => ({ default: m.DocPreview }))
);

function PreviewLoading() {
  return (
    <div className="flex items-center justify-center py-20 text-[var(--color-text-muted)]">
      加载预览中...
    </div>
  );
}

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
 *
 * 预览组件使用 React.lazy 懒加载，避免在应用启动时加载全部重型渲染依赖。
 */
export const CONTENT_TYPE_UI: Record<ContentType, ContentTypeUiConfig> = {
  note: {
    MetaForm: NoteMetaForm,
    renderPreview: (file, bodyContent) => (
      <Suspense fallback={<PreviewLoading />}>
        <LazyNotePreview
          fileName={file.name}
          metadata={file.metadata as NoteMetadata}
          content={bodyContent}
        />
      </Suspense>
    ),
  },
  project: {
    MetaForm: ProjectMetaForm,
    renderPreview: (file, bodyContent) => (
      <Suspense fallback={<PreviewLoading />}>
        <LazyProjectPreview metadata={file.metadata as ProjectMetadata} content={bodyContent} />
      </Suspense>
    ),
  },
  diary: {
    MetaForm: DiaryMetaForm,
    renderPreview: (file, bodyContent) => (
      <Suspense fallback={<PreviewLoading />}>
        <LazyDiaryPreview
          filePath={file.path}
          fileName={file.name}
          metadata={file.metadata as DiaryMetadata}
          content={bodyContent}
        />
      </Suspense>
    ),
  },
  roadmap: {
    MetaForm: RoadmapMetaForm,
    renderPreview: (file, bodyContent) => (
      <Suspense fallback={<PreviewLoading />}>
        <LazyRoadmapPreview metadata={file.metadata as RoadmapMetadata} content={bodyContent} />
      </Suspense>
    ),
  },
  graph: {
    MetaForm: GraphMetaForm,
    renderPreview: (file, bodyContent) => (
      <Suspense fallback={<PreviewLoading />}>
        <LazyGraphPreview metadata={file.metadata as GraphMetadata} content={bodyContent} />
      </Suspense>
    ),
  },
  doc: {
    MetaForm: DocMetaForm,
    renderPreview: (file, bodyContent) => (
      <Suspense fallback={<PreviewLoading />}>
        <LazyDocPreview metadata={file.metadata as DocMetadata} content={bodyContent} />
      </Suspense>
    ),
  },
};
