import { useState, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/store';
import type { GraphData } from '@/types';

interface JsonError {
  message: string;
  line?: number;
  column?: number;
}

/**
 * 解析 JSON 错误信息，提取行号和列号
 */
function parseJsonError(error: unknown, jsonString: string): JsonError {
  if (!(error instanceof SyntaxError)) {
    return { message: String(error) };
  }

  const message = error.message;

  // 尝试从错误消息中提取位置信息
  // 不同环境的错误格式可能不同
  const posMatch = message.match(/position\s+(\d+)/i);
  if (posMatch) {
    const position = parseInt(posMatch[1], 10);
    const lines = jsonString.substring(0, position).split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    return { message, line, column };
  }

  // 尝试匹配 "at line X column Y" 格式
  const lineColMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (lineColMatch) {
    return {
      message,
      line: parseInt(lineColMatch[1], 10),
      column: parseInt(lineColMatch[2], 10),
    };
  }

  return { message };
}

/**
 * 验证 JSON 字符串
 */
function validateJson(jsonString: string): { valid: boolean; data?: GraphData; error?: JsonError } {
  try {
    const data = JSON.parse(jsonString);

    // 验证是否符合 GraphData 结构
    if (typeof data !== 'object' || data === null) {
      return {
        valid: false,
        error: { message: '根元素必须是对象' },
      };
    }

    // 基本结构验证
    const graphData: GraphData = {
      name: String(data.name || ''),
      description: String(data.description || ''),
      nodes: Array.isArray(data.nodes) ? data.nodes : [],
      edges: Array.isArray(data.edges) ? data.edges : [],
    };

    return { valid: true, data: graphData };
  } catch (error) {
    return {
      valid: false,
      error: parseJsonError(error, jsonString),
    };
  }
}

export function JsonEditor() {
  const { currentFile, updateMetadata } = useEditorStore();

  // 本地编辑状态，与 store 分离
  const [localJson, setLocalJson] = useState('');
  const [error, setError] = useState<JsonError | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // 当 currentFile 变化时，同步本地状态
  useEffect(() => {
    if (currentFile && currentFile.type === 'graph') {
      const graphData = currentFile.metadata as GraphData;
      const jsonString = JSON.stringify(graphData, null, 2);
      setLocalJson(jsonString);
      setError(null);
      setIsDirty(false);
    }
  }, [currentFile]);

  // 处理输入变化
  const handleChange = useCallback((value: string) => {
    setLocalJson(value);
    setIsDirty(true);

    const result = validateJson(value);
    if (result.valid && result.data) {
      setError(null);
      // JSON 有效时，同步到 store
      updateMetadata(result.data);
    } else {
      setError(result.error || null);
    }
  }, [updateMetadata]);

  if (!currentFile || currentFile.type !== 'graph') return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 状态栏 */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface-dark)] flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-[var(--color-text-muted)]">JSON 编辑器</span>
          {isDirty && !error && (
            <span className="text-green-600">已保存</span>
          )}
        </div>
        {error && (
          <div className="flex items-center gap-2 text-red-600">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>
              JSON 语法错误
              {error.line && ` (行 ${error.line}${error.column ? `, 列 ${error.column}` : ''})`}
            </span>
          </div>
        )}
      </div>

      {/* 编辑区域 */}
      <div className="flex-1 relative overflow-hidden">
        <textarea
          value={localJson}
          onChange={(e) => handleChange(e.target.value)}
          className={`w-full h-full p-4 resize-none bg-white editor-textarea focus:outline-none ${
            error ? 'border-l-4 border-l-red-500' : ''
          }`}
          spellCheck={false}
          placeholder='{\n  "name": "",\n  "description": "",\n  "nodes": [],\n  "edges": []\n}'
        />
      </div>

      {/* 错误详情 */}
      {error && (
        <div className="flex-shrink-0 px-4 py-3 bg-red-50 border-t border-red-200">
          <div className="text-sm text-red-700">
            <strong>错误详情：</strong>
            <code className="ml-2 px-2 py-1 bg-red-100 rounded text-xs">
              {error.message}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
