import postcss, { AcceptedPlugin } from 'postcss';
import Processor from 'postcss/lib/processor';
import postcssIcssKeyframes from 'postcss-icss-keyframes';
import postcssIcssSelectors from 'postcss-icss-selectors';

export const getProcessor = (
  additionalPlugins: AcceptedPlugin[] = [],
): Processor =>
  postcss([
    ...additionalPlugins,
    postcssIcssKeyframes(),
    postcssIcssSelectors({
      mode: 'local',
    }),
  ]);
