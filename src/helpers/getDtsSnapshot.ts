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
  compilerOptions: tsModule.CompilerOptions,
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

  const classes = getClasses({
    css,
    fileName,
    logger,
    options,
    processor,
    compilerOptions,
  });
  const dts = createExports({ classes, fileName, logger, options });
  return ts.ScriptSnapshot.fromString(dts);
};
