import path from 'path';
import fs from 'fs';
import sass from 'sass';

/**
 * Creates a sass importer which resolves Webpack-style tilde-imports.
 */
export const sassTildeImporter: sass.Importer = (
  rawImportPath: string,
  source: string,
) => {
  // We only care about tilde-prefixed imports that do not look like paths.
  if (!rawImportPath.startsWith('~') || rawImportPath.startsWith('~/')) {
    return null;
  }

  // Create subpathsWithExts such that it has entries of the form
  // node_modules/@foo/bar/baz.(scss|sass)
  // for an import of the form ~@foo/bar/baz(.(scss|sass))?
  const nodeModSubpath = path.join('node_modules', rawImportPath.substring(1));
  const subpathsWithExts: string[] = [];
  if (nodeModSubpath.endsWith('.scss') || nodeModSubpath.endsWith('.sass')) {
    subpathsWithExts.push(nodeModSubpath);
  } else {
    // Look for .scss first.
    subpathsWithExts.push(`${nodeModSubpath}.scss`, `${nodeModSubpath}.sass`);
  }

  // Climbs the filesystem tree until we get to the root, looking for the first
  // node_modules directory which has a matching module and filename.
  let prevDir = '';
  let dir = path.dirname(source);
  while (prevDir !== dir) {
    const searchPaths = subpathsWithExts.map((subpathWithExt) =>
      path.join(dir, subpathWithExt),
    );
    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        return { file: searchPath };
      }
    }
    prevDir = dir;
    dir = path.dirname(dir);
  }

  // Returning null is not itself an error, it tells sass to instead try the
  // next import resolution method if one exists
  return null;
};
