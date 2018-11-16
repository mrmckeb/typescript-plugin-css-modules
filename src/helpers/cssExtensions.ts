const isRelative = (fileName: string) => /^\.\.?($|[\\/])/.test(fileName);

export const isCSS = (fileName: string) =>
  /\.module\.(sa|sc|c)ss$/.test(fileName);

export const isRelativeCSS = (fileName: string) =>
  isCSS(fileName) && isRelative(fileName);
