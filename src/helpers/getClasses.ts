import path from 'path';
import fs from 'fs';
import postcss from 'postcss';
import less from 'less';
import sass from 'sass';
import stylus from 'stylus';
import { extractICSS } from 'icss-utils';
import tsModule from 'typescript/lib/tsserverlibrary';
import { createMatchPath } from 'tsconfig-paths';
import { Logger } from './logger';
import { Options, CustomRenderer } from '../options';

export const enum FileTypes {
  css = 'css',
  less = 'less',
  sass = 'sass',
  scss = 'scss',
  styl = 'styl',
}

export const getFileType = (fileName: string) => {
  if (fileName.endsWith('.css')) return FileTypes.css;
  if (fileName.endsWith('.less')) return FileTypes.less;
  if (fileName.endsWith('.sass')) return FileTypes.sass;
  if (fileName.endsWith('.styl')) return FileTypes.styl;
  return FileTypes.scss;
};

const getFilePath = (fileName: string) => path.dirname(fileName);

// Creates a sass importer which resolves Webpack-style tilde-imports
const webpackTildeSupportingImporter: sass.Importer = (
  rawImportPath: string,
  source: string,
) => {
  // We only care about tilde-prefixed imports that do not look like paths
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
    // Look for .scss first
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

export const getClasses = ({
  css,
  fileName,
  logger,
  options,
  processor,
  compilerOptions,
}: {
  css: string;
  fileName: string;
  logger: Logger;
  options: Options;
  processor: postcss.Processor;
  compilerOptions: tsModule.CompilerOptions;
}) => {
  try {
    const fileType = getFileType(fileName);
    const rendererOptions = options.rendererOptions || {};

    let transformedCss = '';

    if (options.customRenderer) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const customRenderer = require(options.customRenderer) as CustomRenderer;
      transformedCss = customRenderer(css, {
        fileName,
        logger,
        compilerOptions,
      });
    } else if (fileType === FileTypes.less) {
      less.render(
        css,
        {
          syncImport: true,
          filename: fileName,
          ...(rendererOptions.less || {}),
        } as Less.Options,
        (error, output) => {
          if (error || output === undefined) throw error;
          transformedCss = output.css.toString();
        },
      );
    } else if (fileType === FileTypes.scss || fileType === FileTypes.sass) {
      const filePath = getFilePath(fileName);
      const { includePaths, enableWebpackTildeImports, ...sassOptions } =
        rendererOptions.sass || {};
      const { baseUrl, paths } = compilerOptions;
      const matchPath =
        baseUrl && paths ? createMatchPath(path.resolve(baseUrl), paths) : null;

      const aliasImporter: sass.Importer = (url) => {
        const newUrl = matchPath !== null ? matchPath(url) : undefined;
        return newUrl ? { file: newUrl } : null;
      };

      const importers = [aliasImporter];
      if (enableWebpackTildeImports !== false) {
        importers.push(webpackTildeSupportingImporter);
      }

      transformedCss = sass
        .renderSync({
          file: fileName,
          indentedSyntax: fileType === FileTypes.sass,
          includePaths: [filePath, 'node_modules', ...(includePaths || [])],
          importer: importers,
          ...sassOptions,
        })
        .css.toString();
    } else if (fileType === FileTypes.styl) {
      transformedCss = stylus(css, {
        ...(rendererOptions.stylus || {}),
        filename: fileName,
      }).render();
    } else {
      transformedCss = css;
    }

    const processedCss = processor.process(transformedCss, {
      from: fileName,
    });

    return processedCss.root ? extractICSS(processedCss.root).icssExports : {};
  } catch (e) {
    logger.error(e);
    return {};
  }
};
