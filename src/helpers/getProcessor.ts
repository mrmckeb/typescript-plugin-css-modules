import postcss, { AcceptedPlugin } from 'postcss';
import Processor from 'postcss/lib/processor';
import postcssImportSync from 'postcss-import-sync2';
import postcssLocalByDefault from 'postcss-modules-local-by-default';
import postcssModulesScope from 'postcss-modules-scope';
import postcssModulesExtractImports from 'postcss-modules-extract-imports';

export const getProcessor = (
  additionalPlugins: AcceptedPlugin[] = [],
): Processor =>
  postcss([
    ...additionalPlugins,
    postcssImportSync(),
    postcssLocalByDefault(),
    postcssModulesExtractImports(),
    postcssModulesScope({
      generateScopedName: (name) => name,
    }),
  ]);
