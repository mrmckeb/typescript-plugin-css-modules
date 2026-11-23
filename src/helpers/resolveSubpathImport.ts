import fs from 'fs';
import path from 'path';

type ImportTarget =
  | string
  | null
  | ImportTarget[]
  | { [condition: string]: ImportTarget };

interface PackageJson {
  imports?: Record<string, ImportTarget>;
}

const CONDITION_PRIORITY = [
  'types',
  'import',
  'require',
  'node',
  'browser',
  'default',
];

const findNearestPackageJson = (startDir: string): string | undefined => {
  let currentDir = path.resolve(startDir);
  let parentDir = path.dirname(currentDir);
  while (currentDir !== parentDir) {
    const candidate = path.join(currentDir, 'package.json');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    if (path.basename(parentDir) === 'node_modules') {
      return undefined;
    }
    currentDir = parentDir;
    parentDir = path.dirname(currentDir);
  }
  return undefined;
};

const resolveImportTarget = (
  target: ImportTarget | undefined,
  packageDir: string,
  subpath: string,
): string | undefined => {
  if (!target) return undefined;

  if (typeof target === 'string') {
    if (!target.startsWith('./') && !target.startsWith('../')) {
      return undefined;
    }
    const mapped = subpath ? target.replace(/\*/g, subpath) : target;
    const candidate = path.resolve(packageDir, mapped);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
    return undefined;
  }

  if (Array.isArray(target)) {
    for (const item of target) {
      const resolved = resolveImportTarget(item, packageDir, subpath);
      if (resolved) return resolved;
    }
    return undefined;
  }

  if (typeof target === 'object') {
    const keys = Object.keys(target);
    const orderedKeys = [
      ...CONDITION_PRIORITY.filter((key) => keys.includes(key)),
      ...keys.filter((key) => !CONDITION_PRIORITY.includes(key)),
    ];
    for (const key of orderedKeys) {
      const resolved = resolveImportTarget(target[key], packageDir, subpath);
      if (resolved) return resolved;
    }
  }

  return undefined;
};

export const resolveSubpathImport = (
  moduleName: string,
  containingFile: string,
): string | undefined => {
  if (!moduleName.startsWith('#')) return undefined;

  const packageJsonPath = findNearestPackageJson(path.dirname(containingFile));
  if (!packageJsonPath) return undefined;

  let pkg: PackageJson;
  try {
    pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJson;
  } catch {
    return undefined;
  }

  const imports = pkg.imports;
  if (!imports || typeof imports !== 'object') return undefined;

  const packageDir = path.dirname(packageJsonPath);

  if (
    !moduleName.includes('*') &&
    Object.prototype.hasOwnProperty.call(imports, moduleName)
  ) {
    return resolveImportTarget(imports[moduleName], packageDir, '');
  }

  const patternMatches: {
    prefix: string;
    suffix: string;
    target: ImportTarget;
  }[] = [];

  for (const [key, target] of Object.entries(imports)) {
    if (!key.startsWith('#')) continue;
    const starIndex = key.indexOf('*');
    if (starIndex === -1 || key.includes('*', starIndex + 1)) continue;

    const prefix = key.slice(0, starIndex);
    const suffix = key.slice(starIndex + 1);
    if (
      moduleName.startsWith(prefix) &&
      moduleName.endsWith(suffix) &&
      moduleName.length >= prefix.length + suffix.length
    ) {
      patternMatches.push({ prefix, suffix, target });
    }
  }

  patternMatches.sort((a, b) => {
    if (a.prefix.length !== b.prefix.length) {
      return b.prefix.length - a.prefix.length;
    }
    return b.suffix.length - a.suffix.length;
  });

  for (const { prefix, suffix, target } of patternMatches) {
    const subpath = moduleName.slice(
      prefix.length,
      moduleName.length - suffix.length,
    );
    const resolved = resolveImportTarget(target, packageDir, subpath);
    if (resolved) return resolved;
  }

  return undefined;
};
