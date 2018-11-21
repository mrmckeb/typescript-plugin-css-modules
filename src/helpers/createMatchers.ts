import { createIsCSS, createIsRelativeCSS } from './cssExtensions';

export const createMatchers = (options: IOptions = {}) => {
  // Allow custom matchers to be used, and handle bad matcher patterns.
  let isCSS = createIsCSS();
  try {
    const { customMatcher } = options;
    if (customMatcher) {
      const customMatcherRegExp = new RegExp(customMatcher);
      isCSS = createIsCSS(customMatcherRegExp);
    }
  } catch (e) {
    // TODO: Provide error/warning to user.
  }

  // Create the relative CSS checker.
  const isRelativeCSS = createIsRelativeCSS(isCSS);

  return { isCSS, isRelativeCSS };
};
