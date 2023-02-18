import postcss, { AcceptedPlugin } from 'postcss';
import Processor from 'postcss/lib/processor';
import postcssLocalByDefault from 'postcss-modules-local-by-default';
import postcssModulesScope from 'postcss-modules-scope';

export const getProcessor = (
  additionalPlugins: AcceptedPlugin[] = [],
): Processor =>
  postcss([
    ...additionalPlugins,
    postcssLocalByDefault(),
    postcssModulesScope({
      generateScopedName: (name) => name,
    }),
  ]);
