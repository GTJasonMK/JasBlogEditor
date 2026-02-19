import { create } from 'zustand';
import { invokeTauri } from '@/platform/tauri';
import type { UserTemplate, JasBlogContentType } from '@/types';
import type { RustUserTemplate } from '@/platform/tauriTypes';

// 前端 → Rust 转换
function toRustTemplate(t: UserTemplate): RustUserTemplate {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    template_type: t.type,
    content: t.content,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

// Rust → 前端 转换
function fromRustTemplate(r: RustUserTemplate): UserTemplate {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    type: r.template_type as JasBlogContentType,
    content: r.content,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

interface TemplateState {
  userTemplates: UserTemplate[];
  isLoading: boolean;
  error: string | null;

  loadTemplates: () => Promise<void>;
  saveAsTemplate: (
    name: string,
    description: string | undefined,
    type: JasBlogContentType,
    content: string
  ) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  userTemplates: [],
  isLoading: false,
  error: null,

  loadTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const rustTemplates = await invokeTauri('get_templates');
      set({
        userTemplates: rustTemplates.map(fromRustTemplate),
        isLoading: false,
      });
    } catch (error) {
      console.error('加载模板失败:', error);
      set({ error: `加载模板失败: ${error}`, isLoading: false });
    }
  },

  saveAsTemplate: async (name, description, type, content) => {
    const now = new Date().toISOString();
    const template: UserTemplate = {
      id: crypto.randomUUID(),
      name,
      description,
      type,
      content,
      createdAt: now,
      updatedAt: now,
    };

    const prev = get().userTemplates;
    const next = [...prev, template];
    set({ userTemplates: next, error: null });

    try {
      await invokeTauri('save_templates', {
        templates: next.map(toRustTemplate),
      });
    } catch (error) {
      // 回滚
      console.error('保存模板失败:', error);
      set({ userTemplates: prev, error: `保存模板失败: ${error}` });
    }
  },

  deleteTemplate: async (id) => {
    const prev = get().userTemplates;
    const next = prev.filter((t) => t.id !== id);
    set({ userTemplates: next, error: null });

    try {
      await invokeTauri('save_templates', {
        templates: next.map(toRustTemplate),
      });
    } catch (error) {
      // 回滚
      console.error('删除模板失败:', error);
      set({ userTemplates: prev, error: `删除模板失败: ${error}` });
    }
  },

  clearError: () => set({ error: null }),
}));
