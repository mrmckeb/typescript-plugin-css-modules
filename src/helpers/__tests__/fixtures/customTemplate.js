module.exports = (dts, { classes, logger }) => {
  logger.log('Example log');
  return [
    '/* eslint-disable */',
    dts,
    'export const __cssModule: true;',
    `export type AllClassNames = '${Object.keys(classes).join("' | '")}';`,
  ].join('\n');
};
