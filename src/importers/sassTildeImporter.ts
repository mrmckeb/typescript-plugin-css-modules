import path from 'path';
import fs from 'fs';
import sass from 'sass';

const DEFAULT_EXTS = ['scss', 'sass', 'css'];

export function resolveUrls(url: string, extensions: string[] = DEFAULT_EXTS) {
  // We only care about tilde-prefixed imports that do not look like paths.
  if (!url.startsWith('~') || url.startsWith('~/')) {
    return [];
  }

  const module_path = path.join('node_modules', url.substring(1));
  let variants = [module_path];

  const parts = path.parse(module_path);

  // Support sass partials by including paths where the file is prefixed by an underscore.
  if (!parts.base.startsWith('_')) {
    const underscore_name = '_'.concat(parts.name);
    const replacement = {
      root: parts.root,
      dir: parts.dir,
      ext: parts.ext,
      base: `${underscore_name}${parts.ext}`,
      name: underscore_name,
    };
    variants.push(path.format(replacement));
  }

  // Support index files.
  variants.push(path.join(module_path, '_index'));

  // Create variants such that it has entries of the form
  // node_modules/@foo/bar/baz.(scss|sass)
  // for an import of the form ~@foo/bar/baz(.(scss|sass))?
  if (!extensions.some((ext) => parts.ext == `.${ext}`)) {
    variants = extensions.flatMap((ext) =>
      variants.map((variant) => `${variant}.${ext}`),
    );
  }

  return variants;
}

/**
 * Creates a sass importer which resolves Webpack-style tilde-imports.
 */
export const sassTildeImporter: sass.FileImporter<'sync'> = {
  findFileUrl(url) {
    const searchPaths = resolveUrls(url);

    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        return new URL(`file://${path.resolve(searchPath)}`);
      }
    }

    // Returning null is not itself an error, it tells sass to instead try the
    // next import resolution method if one exists
    return null;
  },
};
