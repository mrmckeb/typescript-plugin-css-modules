// TODO: Remove this when the related issue is resolved.
// https://github.com/css-modules/postcss-icss-keyframes/issues/3
// eslint-disable-next-line @typescript-eslint/unbound-method
const warn = global.console.warn;
global.console.warn = (...args: unknown[]) => {
  const isPostCSSDeprecationWarning =
    typeof args[0] === 'string' &&
    args[0].includes('postcss.plugin was deprecated');

  if (isPostCSSDeprecationWarning) {
    return;
  }

  warn(...args);
};
