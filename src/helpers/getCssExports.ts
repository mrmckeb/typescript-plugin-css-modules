import path from 'path';
import Processor from 'postcss/lib/processor';
import less from 'less';
import sass from 'sass';
import stylus from 'stylus';
import { CSSExports, extractICSS } from 'icss-utils';
import { RawSourceMap } from 'source-map-js';
import type tsModule from 'typescript/lib/tsserverlibrary';
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

export interface CSSExportsWithSourceMap {
  classes: CSSExports;
  css?: string;
  sourceMap?: RawSourceMap;
}

export const getCssExports = ({
  css,
  fileName,
  logger,
  options,
  processor,
  compilerOptions,
  directory,
}: {
  css: string;
  fileName: string;
  logger: Logger;
  options: Options;
  processor: Processor;
  compilerOptions: tsModule.CompilerOptions;
  directory: string;
}): CSSExportsWithSourceMap => {
  const rawCss = options.additionalData ? options.additionalData + css : css;

  const fileType = getFileType(fileName);
  const rendererOptions = options.rendererOptions ?? {};

  let transformedCss = '';
  let sourceMap: RawSourceMap | undefined;

  try {
    if (options.customRenderer) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const customRenderer = require(options.customRenderer) as CustomRenderer;
      const customResult = customRenderer(rawCss, {
        fileName,
        logger,
        compilerOptions,
      });
      if (typeof customResult === 'string') {
        transformedCss = customResult;
      } else if (customResult.css) {
        transformedCss = customResult.css;
        sourceMap = customResult.map;
      }
    } else {
      switch (fileType) {
        case FileType.less:
          less.render(
            rawCss,
            {
              syncImport: true,
              filename: fileName,
              paths: [directory],
              sourceMap: true,
              ...(rendererOptions.less ?? {}),
            } as Less.Options,
            (error?: Less.RenderError, output?: Less.RenderOutput) => {
              if (error) {
                throw new Error(error.message);
              }
              if (output === undefined) {
                throw new Error('No Less output.');
              }

              // This is typed as a `string`, but may be undefined.
              const stringSourceMap = output.map as string | undefined;

              sourceMap =
                typeof stringSourceMap === 'string'
                  ? (JSON.parse(stringSourceMap) as RawSourceMap)
                  : undefined;

              transformedCss = output.css.toString();
            },
          );
          break;

        case FileType.scss:
        case FileType.sass: {
          const filePath = getFilePath(fileName);
          const { loadPaths, ...sassOptions } = rendererOptions.sass ?? {};
          const { baseUrl = directory, paths } = compilerOptions;
          const matchPath =
            baseUrl && paths
              ? createMatchPath(path.resolve(baseUrl), paths)
              : null;

          const aliasImporter: sass.FileImporter<'sync'> = {
            findFileUrl(url) {
              const exactFileUrl = matchPath?.(url, undefined, undefined, [
                '.sass',
                '.scss',
              ]);

              if (exactFileUrl) {
                return new URL(`file://${exactFileUrl}`);
              }

              /*
               * In case it didn't find the exact file it'll proceed to
               * check other files matching the import process of Sass
               * guidelines:
               * https://sass-lang.com/documentation/at-rules/import/#partials
               * https://sass-lang.com/documentation/at-rules/import/#index-files
               */

              // Checks for partials
              const partialFileName = path.basename(url);
              const partialDirName = path.dirname(url);
              const partialFilePath = path.join(
                partialDirName,
                `_${partialFileName}`,
              );
              const partialFileUrl =
                matchPath !== null
                  ? matchPath(partialFilePath, undefined, undefined, [
                      '.sass',
                      '.scss',
                    ])
                  : undefined;

              if (partialFileUrl) {
                return new URL(`file://${partialFileUrl}`);
              }

              // Checks for an _index file
              const indexFilePath = path.join(
                partialDirName,
                partialFileName,
                `_index`,
              );
              const indexFileUrl =
                matchPath !== null
                  ? matchPath(indexFilePath, undefined, undefined, [
                      '.sass',
                      '.scss',
                    ])
                  : undefined;

              return indexFileUrl ? new URL(`file://${indexFileUrl}`) : null;
            },
          };

          const importers = [aliasImporter, sassTildeImporter];

          const result = sass.compileString(rawCss, {
            importers,
            loadPaths: [filePath, 'node_modules', ...(loadPaths ?? [])],
            sourceMap: true,
            syntax: fileType === FileType.sass ? 'indented' : 'scss',
            url: new URL(`file://${fileName}`),
            ...sassOptions,
          });

          sourceMap = result.sourceMap;
          transformedCss = result.css.toString();
          break;
        }

        case FileType.styl:
          transformedCss = stylus(rawCss, {
            ...(rendererOptions.stylus ?? {}),
            filename: fileName,
          }).render();
          break;

        default:
          transformedCss = rawCss;
          break;
      }
    }

    const processedCss = processor.process(transformedCss, {
      from: fileName,
      map: {
        inline: false,
        prev: sourceMap,
      },
    });

    return {
      classes: extractICSS(processedCss.root).icssExports,
      css: processedCss.css,
      sourceMap: processedCss.map.toJSON(),
    };
  } catch (e) {
    console.error(e);
    logger.error(e);
    return { classes: {} };
  }
};
