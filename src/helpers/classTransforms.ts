import { camelCase } from 'lodash';

// The below is based on the CSS Modules implementation found here:
// https://github.com/webpack-contrib/css-loader/blob/master/lib/compile-exports.js

const dashesCamelCase = (className: string) =>
  className.replace(/-+(\w)/g, (match, firstLetter) =>
    firstLetter.toUpperCase(),
  );

export const transformClasses = (camelCaseOption?: boolean | string) => (
  className: string,
) => {
  const entries: string[] = [];

  switch (camelCaseOption) {
    case true: {
      entries.push(className);
      const targetClassName = camelCase(className);
      if (targetClassName !== className) {
        entries.push(targetClassName);
      }
      break;
    }
    case 'dashes': {
      entries.push(className);
      const targetClassName = dashesCamelCase(className);
      if (targetClassName !== className) {
        entries.push(targetClassName);
      }
      break;
    }
    case 'only':
      entries.push(camelCase(className));
      break;
    case 'dashesOnly':
      entries.push(dashesCamelCase(className));
      break;
    default:
      entries.push(className);
      break;
  }

  return entries;
};
