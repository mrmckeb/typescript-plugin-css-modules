import postcss, { AcceptedPlugin } from 'postcss';
import Processor from 'postcss/lib/processor';
import postcssIcssKeyframes from 'postcss-icss-keyframes';

export const getProcessor = (
  additionalPlugins: AcceptedPlugin[] = [],
): Processor => postcss([...additionalPlugins, postcssIcssKeyframes()]);
