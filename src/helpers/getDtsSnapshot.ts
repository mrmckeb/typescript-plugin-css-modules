import postcss from 'postcss';
import tsModule from 'typescript/lib/tsserverlibrary';
import { Options } from '../options';
import { getClasses } from './getClasses';
import { createExports } from './createExports';
import { Logger } from './logger';

export const getDtsSnapshot = (
  ts: typeof tsModule,
  processor: postcss.Processor,
  fileName: string,
  scriptSnapshot: ts.IScriptSnapshot,
  options: Options,
  logger: Logger,
) => {
  const css = scriptSnapshot.getText(0, scriptSnapshot.getLength());

  /*
   * TODO: Temporary workaround for:
   * https://github.com/mrmckeb/typescript-plugin-css-modules/issues/41
   * Needs investigation for a more elegant solution.
   */
  if (/export default classes/.test(css)) {
    return scriptSnapshot;
  }

  const classes = getClasses(processor, css, fileName, options, logger);
  const dts = createExports(classes, options, fileName, logger);
  return ts.ScriptSnapshot.fromString(dts);
};
