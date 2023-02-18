import postcss, { AcceptedPlugin } from 'postcss';
import Processor from 'postcss/lib/processor';
import modulesScope from 'postcss-modules-scope';
import localByDefault from 'postcss-modules-local-by-default';

export const getProcessor = (
  additionalPlugins: AcceptedPlugin[] = [],
): Processor =>
  postcss([
    ...additionalPlugins,
    localByDefault(),
    modulesScope({
      generateScopedName: (name) => name,
    }),
  ]);
