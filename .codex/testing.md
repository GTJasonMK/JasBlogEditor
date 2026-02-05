# testing.md

日期：2026-02-05  
执行者：Codex  

## 单元测试

### 命令

- `npm test`

### 结果

- 通过（2/2）
  - `resolveLocalBin returns a usable string`
  - `pickDevPorts returns a port + hmrPort pair`

## TypeScript 编译验证

### 命令

- `npx tsc -b --pretty false`

### 结果

- 通过（无输出）

## 前端构建（冒烟测试）

### 命令

- `npm run build`

### 结果（摘要）

- 通过
- Vite：`vite v6.4.1 building for production...`
- 警告：存在单个 chunk 体积较大（>500kB）提示（未阻塞构建）

## 追加回归（修复 Windows spawn EINVAL 后）

### 命令

- `npx tsc -b --pretty false`
- `npm test`
- `npm run build`

### 结果

- 全部通过
