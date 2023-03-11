import postcss, { AcceptedPlugin } from 'postcss';
import Processor from 'postcss/lib/processor';
import postcssLocalByDefault from 'postcss-modules-local-by-default';
import postcssModulesScope from 'postcss-modules-scope';
import postcssModulesExtractImports from 'postcss-modules-extract-imports';

export const getProcessor = (
  additionalPlugins: AcceptedPlugin[] = [],
): Processor =>
  postcss([
    ...additionalPlugins,
    postcssLocalByDefault(),
    postcssModulesExtractImports(),
    postcssModulesScope({
      generateScopedName: (name) => name,
    }),
  ]);
