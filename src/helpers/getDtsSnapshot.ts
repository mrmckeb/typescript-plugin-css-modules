import tsModule from 'typescript/lib/tsserverlibrary';
import { Options } from '../options';
import { getCssExports } from './getCssExports';
import { createDtsExports } from './createDtsExports';
import { Logger } from './logger';
import Processor from 'postcss/lib/processor';

export const getDtsSnapshot = (
  ts: typeof tsModule,
  processor: Processor,
  fileName: string,
  scriptSnapshot: ts.IScriptSnapshot,
  options: Options,
  logger: Logger,
  compilerOptions: tsModule.CompilerOptions,
): tsModule.IScriptSnapshot => {
  const css = scriptSnapshot.getText(0, scriptSnapshot.getLength());

  /*
   * TODO: Temporary workaround for:
   * https://github.com/mrmckeb/typescript-plugin-css-modules/issues/41
   * Needs investigation for a more elegant solution.
   */
  if (/export default classes/.test(css)) {
    return scriptSnapshot;
  }

  const cssExports = getCssExports({
    css,
    fileName,
    logger,
    options,
    processor,
    compilerOptions,
  });
  const dts = createDtsExports({ cssExports, fileName, logger, options });
  return ts.ScriptSnapshot.fromString(dts);
};
