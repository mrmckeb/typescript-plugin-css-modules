export type isCSSFn = (fileName: string) => boolean;
const DEFAULT_REGEXP = /\.module\.(c|le|sa|sc)ss$/;

const isRelative = (fileName: string) => /^\.\.?($|[\\/])/.test(fileName);

export const createIsCSS = (
  customMatcher: RegExp = DEFAULT_REGEXP,
): isCSSFn => (fileName: string) => customMatcher.test(fileName);
export const createIsRelativeCSS = (isCSS: isCSSFn) => (fileName: string) =>
  isCSS(fileName) && isRelative(fileName);
