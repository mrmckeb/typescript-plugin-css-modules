import { readFileSync } from 'fs';
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
  options: Options,
  logger: Logger,
  compilerOptions: tsModule.CompilerOptions,
  directory: string,
): tsModule.IScriptSnapshot => {
  const css = readFileSync(fileName, 'utf-8');
  const cssExports = getCssExports({
    css,
    fileName,
    logger,
    options,
    processor,
    compilerOptions,
    directory,
  });
  const dts = createDtsExports({ cssExports, fileName, logger, options });
  return ts.ScriptSnapshot.fromString(dts);
};
