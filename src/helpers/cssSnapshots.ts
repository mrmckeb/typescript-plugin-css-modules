import { extractICSS, IICSSExports } from 'icss-utils';
import * as postcss from 'postcss';
import * as postcssIcssSelectors from 'postcss-icss-selectors';
import * as ts_module from 'typescript/lib/tsserverlibrary';
import * as less from 'less';
import * as sass from 'sass';
import * as reserved from 'reserved-words';
import { transformClasses } from './classTransforms';
import { Options } from '../options';

const NOT_CAMELCASE_REGEXP = /[\-_]/;
const processor = postcss(postcssIcssSelectors({ mode: 'local' }));

const classNameToProperty = (className: string) => `'${className}': string;`;
const classNameToNamedExport = (className: string) =>
  `export const ${className}: string;`;

const flattenClassNames = (
  previousValue: string[] = [],
  currentValue: string[],
) => previousValue.concat(currentValue);

export const enum FileTypes {
  scss = 'scss',
  less = 'less',
}

export const getFileType = (fileName: string) =>
  fileName.endsWith('less') ? FileTypes.less : FileTypes.scss;

export const getClasses = (css: string, fileType: FileTypes) => {
  try {
    let transformedCss = '';

    if (fileType === FileTypes.less) {
      less.render(css, { asyncImport: true } as any, (err, output) => {
        transformedCss = output.css.toString();
      });
    } else {
      transformedCss = sass.renderSync({ data: css }).css.toString();
    }

    const processedCss = processor.process(transformedCss);

    return extractICSS(processedCss.root).icssExports;
  } catch (e) {
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
  fileName: string,
  scriptSnapshot: ts.IScriptSnapshot,
  options: Options,
) => {
  const css = scriptSnapshot.getText(0, scriptSnapshot.getLength());
  const fileType = getFileType(fileName);
  const classes = getClasses(css, fileType);
  const dts = createExports(classes, options);
  return ts.ScriptSnapshot.fromString(dts);
};
