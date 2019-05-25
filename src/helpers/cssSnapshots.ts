import { extractICSS, IICSSExports } from 'icss-utils';
import * as postcss from 'postcss';
import * as postcssIcssSelectors from 'postcss-icss-selectors';
import * as ts_module from 'typescript/lib/tsserverlibrary';
import * as sass from 'sass';
import * as less from 'less';
import { transformClasses } from './classTransforms';
import { Options } from '../options';

const processor = postcss(postcssIcssSelectors({ mode: 'local' }));

const classNameToProperty = (className: string) => `'${className}': string;`;

const flattenClassNames = (
  previousValue: string[] = [],
  currentValue: string[],
) => previousValue.concat(currentValue);

export const enum FileTypes {
  css = 'css',
  sass = 'sass',
  less = 'less',
}

export const getClasses = (
  css: string,
  fileType: FileTypes = FileTypes.css,
) => {
  try {
    const transformedCss =
      fileType === FileTypes.less
        ? // @ts-ignore
          less.render(css, { syncImport: true }).css.toString()
        : sass.renderSync({ data: css }).css.toString();

    const processedCss = processor.process(transformedCss);

    return extractICSS(processedCss.root).icssExports;
  } catch (e) {
    return {};
  }
};

export const createExports = (classes: IICSSExports, options: Options) => `\
declare const classes: {
  ${Object.keys(classes)
    .map(transformClasses(options.camelCase))
    .reduce(flattenClassNames, [])
    .map(classNameToProperty)
    .join('\n  ')}
};
export default classes;
`;

export const getDtsSnapshot = (
  ts: typeof ts_module,
  scriptSnapshot: ts.IScriptSnapshot,
  options: Options,
) => {
  const css = scriptSnapshot.getText(0, scriptSnapshot.getLength());
  const classes = getClasses(css);
  const dts = createExports(classes, options);
  return ts.ScriptSnapshot.fromString(dts);
};
