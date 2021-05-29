import path from 'path';
import postcss from 'postcss';
import less from 'less';
import sass from 'sass';
import stylus from 'stylus';
import { CSSExports, extractICSS } from 'icss-utils';
import tsModule from 'typescript/lib/tsserverlibrary';
import { createMatchPath } from 'tsconfig-paths';
import { sassTildeImporter } from '../importers/sassTildeImporter';
import { Options, CustomRenderer } from '../options';
import { Logger } from './logger';

export const enum FileType {
  css = 'css',
  less = 'less',
  sass = 'sass',
  scss = 'scss',
  styl = 'styl',
}

export const getFileType = (fileName: string): FileType => {
  if (fileName.endsWith('.css')) return FileType.css;
  if (fileName.endsWith('.less')) return FileType.less;
  if (fileName.endsWith('.sass')) return FileType.sass;
  if (fileName.endsWith('.styl')) return FileType.styl;
  return FileType.scss;
};

const getFilePath = (fileName: string) => path.dirname(fileName);

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
}): CSSExports => {
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
    } else if (fileType === FileType.less) {
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
    } else if (fileType === FileType.scss || fileType === FileType.sass) {
      const filePath = getFilePath(fileName);
      const { includePaths, ...sassOptions } = rendererOptions.sass || {};
      const { baseUrl, paths } = compilerOptions;
      const matchPath =
        baseUrl && paths ? createMatchPath(path.resolve(baseUrl), paths) : null;

      const aliasImporter: sass.Importer = (url) => {
        const newUrl = matchPath !== null ? matchPath(url) : undefined;
        return newUrl ? { file: newUrl } : null;
      };

      const importers = [aliasImporter, sassTildeImporter];

      transformedCss = sass
        .renderSync({
          file: fileName,
          indentedSyntax: fileType === FileType.sass,
          includePaths: [filePath, 'node_modules', ...(includePaths || [])],
          importer: importers,
          ...sassOptions,
        })
        .css.toString();
    } else if (fileType === FileType.styl) {
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
