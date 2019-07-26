import { extractICSS, IICSSExports } from 'icss-utils';
import postcss from 'postcss';
import * as ts_module from 'typescript/lib/tsserverlibrary';
import * as less from 'less';
import * as sass from 'sass';
import * as reserved from 'reserved-words';
import { transformClasses } from './classTransforms';
import { Options } from '../options';

const NOT_CAMELCASE_REGEXP = /[\-_]/;

const classNameToProperty = (className: string) => `'${className}': string;`;
const classNameToNamedExport = (className: string) =>
  `export const ${className}: string;`;

const flattenClassNames = (
  previousValue: string[] = [],
  currentValue: string[],
) => previousValue.concat(currentValue);

export const enum FileTypes {
  css = 'css',
  less = 'less',
  scss = 'scss',
}

export const getFileType = (fileName: string) => {
  if (fileName.endsWith('.css')) return FileTypes.css;
  if (fileName.endsWith('.less')) return FileTypes.less;
  return FileTypes.scss;
};

const getFilePath = (fileName: string) =>
  fileName.substring(0, fileName.lastIndexOf('/'));

export const getClasses = (
  processor: postcss.Processor,
  info: ts.server.PluginCreateInfo,
  css: string,
  fileName: string,
) => {
  try {
    const fileType = getFileType(fileName);
    let transformedCss = '';

    if (fileType === FileTypes.less) {
      less.render(css, { asyncImport: true } as any, (err, output) => {
        transformedCss = output.css.toString();
      });
    } else if (fileType === FileTypes.scss) {
      const filePath = getFilePath(fileName);
      transformedCss = sass
        .renderSync({
          data: css,
          includePaths: [filePath],
        })
        .css.toString();
    } else {
      transformedCss = css;
    }

    info.project.projectService.logger.info('CSS');
    info.project.projectService.logger.info(transformedCss);

    const processedCss = processor.process(transformedCss);

    return processedCss.root ? extractICSS(processedCss.root).icssExports : {};
  } catch (e) {
    info.project.projectService.logger.info('ERROR');
    info.project.projectService.logger.info(e);

    return {};
  }
};

export const createExports = (classes: IICSSExports, options: Options) => {
  const isCamelCase = (className: string) =>
    !NOT_CAMELCASE_REGEXP.test(className);
  const isReservedWord = (className: string) => !reserved.check(className);

  const processedClasses = Object.keys(classes)
    .map(transformClasses(options.camelCase))
    .reduce(flattenClassNames, []);
  const camelCasedKeys = processedClasses
    .filter(isCamelCase)
    .filter(isReservedWord)
    .map(classNameToNamedExport);

  const defaultExport = `\
declare const classes: {
  ${processedClasses.map(classNameToProperty).join('\n  ')}
};
export default classes;
`;

  if (camelCasedKeys.length) {
    return defaultExport + camelCasedKeys.join('\n') + '\n';
  }
  return defaultExport;
};

export const getDtsSnapshot = (
  ts: typeof ts_module,
  info: ts.server.PluginCreateInfo,
  processor: postcss.Processor,
  fileName: string,
  scriptSnapshot: ts.IScriptSnapshot,
  options: Options,
) => {
  info.project.projectService.logger.info('look here');
  info.project.projectService.logger.info(fileName);
  const source = scriptSnapshot.getText(0, scriptSnapshot.getLength());

  if (source.includes('declare const classes')) {
    return ts.ScriptSnapshot.fromString(source);
  }

  const classes = getClasses(processor, info, source, fileName);
  info.project.projectService.logger.info(JSON.stringify(classes, null, 2));

  const dts = createExports(classes, options);
  return ts.ScriptSnapshot.fromString(dts);
};
