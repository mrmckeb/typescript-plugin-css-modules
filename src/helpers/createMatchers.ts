import { createIsCSS, createIsRelativeCSS } from './cssExtensions';
import { Options } from '../options';
import { Logger } from './Logger';

export const createMatchers = (logger: Logger, options: Options = {}) => {
  // Allow custom matchers to be used, and handle bad matcher patterns.
  let isCSS = createIsCSS();
  try {
    const { customMatcher } = options;
    if (customMatcher) {
      const customMatcherRegExp = new RegExp(customMatcher);
      isCSS = createIsCSS(customMatcherRegExp);
    }
  } catch (e) {
    logger.error(e);
    // TODO: Provide error/warning to user.
  }

  // Create the relative CSS checker.
  const isRelativeCSS = createIsRelativeCSS(isCSS);

  return { isCSS, isRelativeCSS };
};
