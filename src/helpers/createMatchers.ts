import { Options } from '../options';
import {
  createIsCSS,
  createIsRelativeCSS,
  isCSSFn,
  isRelativeCSSFn,
} from './cssExtensions';
import { Logger } from './logger';

interface Matchers {
  isCSS: isCSSFn;
  isRelativeCSS: isRelativeCSSFn;
}

export const createMatchers = (
  logger: Logger,
  options: Options = {},
): Matchers => {
  // Allow custom matchers to be used, and handle bad matcher patterns.
  let isCSS = createIsCSS();
  try {
    const { customMatcher } = options;
    if (customMatcher) {
      const customMatcherRegExp = new RegExp(customMatcher);
      isCSS = createIsCSS(customMatcherRegExp);
    }
  } catch (e: any) {
    logger.error(e);
    // TODO: Provide error/warning to user.
  }

  // Create the relative CSS checker.
  const isRelativeCSS = createIsRelativeCSS(isCSS);

  return { isCSS, isRelativeCSS };
};
