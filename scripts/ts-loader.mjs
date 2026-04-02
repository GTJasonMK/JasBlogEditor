import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const loaderDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(loaderDir, '..');
const srcRoot = path.join(repoRoot, 'src');
const knownExtensions = ['.ts', '.tsx', '.mjs', '.js'];

async function resolveFilePath(basePath) {
  for (const extension of knownExtensions) {
    const direct = `${basePath}${extension}`;
    try {
      await fs.access(direct);
      return direct;
    } catch {
      // noop
    }
  }

  for (const extension of knownExtensions) {
    const indexPath = path.join(basePath, `index${extension}`);
    try {
      await fs.access(indexPath);
      return indexPath;
    } catch {
      // noop
    }
  }

  return null;
}

async function resolveMaybeTsPath(candidatePath) {
  const resolved = await resolveFilePath(candidatePath);
  if (resolved) return resolved;
  return candidatePath;
}

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith('@/')) {
    const resolvedPath = await resolveMaybeTsPath(path.join(srcRoot, specifier.slice(2)));
    return {
      url: pathToFileURL(resolvedPath).href,
      shortCircuit: true,
    };
  }

  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    context.parentURL?.startsWith('file:')
  ) {
    if (path.extname(specifier)) {
      return defaultResolve(specifier, context, defaultResolve);
    }

    const parentPath = fileURLToPath(context.parentURL);
    const resolvedPath = await resolveMaybeTsPath(
      path.resolve(path.dirname(parentPath), specifier)
    );
    return {
      url: pathToFileURL(resolvedPath).href,
      shortCircuit: true,
    };
  }

  return defaultResolve(specifier, context, defaultResolve);
}

export async function load(url, context, defaultLoad) {
  if (url.endsWith('.ts') || url.endsWith('.tsx')) {
    const source = await fs.readFile(fileURLToPath(url), 'utf8');
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        jsx: ts.JsxEmit.ReactJSX,
        verbatimModuleSyntax: true,
      },
      fileName: fileURLToPath(url),
    });

    return {
      format: 'module',
      source: transpiled.outputText,
      shortCircuit: true,
    };
  }

  return defaultLoad(url, context, defaultLoad);
}
