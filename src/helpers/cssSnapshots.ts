import { extractICSS, IICSSExports } from 'icss-utils';
import * as postcss from 'postcss';
import * as postcssIcssSelectors from 'postcss-icss-selectors';
import * as ts_module from 'typescript/lib/tsserverlibrary';

const processor = postcss(postcssIcssSelectors({ mode: 'local' }));

export const getClasses = (css: string) =>
  extractICSS(processor.process(css).root).icssExports;

const exportNameToProperty = (exportName: string) => `'${exportName}': string;`;
export const createExports = (classes: IICSSExports) => `
declare const classes: {
  ${Object.keys(classes)
    .map(exportNameToProperty)
    .join('\n  ')}
};
export default classes;
`;

export const getDtsSnapshot = (
  ts: typeof ts_module,
  scriptSnapshot: ts.IScriptSnapshot,
) => {
  const css = scriptSnapshot.getText(0, scriptSnapshot.getLength());
  const classes = getClasses(css);
  const dts = createExports(classes);
  return ts.ScriptSnapshot.fromString(dts);
};
