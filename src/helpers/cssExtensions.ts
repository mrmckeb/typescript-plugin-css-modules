const isRelative = (fileName: string) => /^\.\.?($|[\\/])/.test(fileName);

export const DEFAULT_EXTENSIONS_PATTERN = /\.module\.(sa|sc|c)ss$/;

let extensionsPattern: RegExp = DEFAULT_EXTENSIONS_PATTERN;

export const isCSS = (fileName: string) => extensionsPattern.test(fileName);

export const isRelativeCSS = (fileName: string) =>
  isCSS(fileName) && isRelative(fileName);

export const setExtensionsPattern = (newPattern?: RegExp) => {
  if (newPattern !== undefined) {
    extensionsPattern = newPattern;
  }
};
