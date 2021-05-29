import camelCase from 'lodash.camelcase';
import { ClassnameTransformOptions } from '../options';

// The below is based on the CSS Modules implementation found here:
// https://github.com/webpack-contrib/css-loader/blob/master/lib/compile-exports.js

const dashCase = (className: string): string =>
  className.replace(/-+(\w)/g, (_match, firstLetter) =>
    firstLetter.toUpperCase(),
  );

export const transformClasses =
  (camelCaseOption?: ClassnameTransformOptions) =>
  (className: string): string[] => {
    const entries: string[] = [];

    switch (camelCaseOption) {
      case 'camelCase': {
        entries.push(className);
        const targetClassName = camelCase(className);
        if (targetClassName !== className) {
          entries.push(targetClassName);
        }
        break;
      }
      case 'camelCaseOnly':
        entries.push(camelCase(className));
        break;
      case 'dashes': {
        entries.push(className);
        const targetClassName = dashCase(className);
        if (targetClassName !== className) {
          entries.push(targetClassName);
        }
        break;
      }
      case 'dashesOnly':
        entries.push(dashCase(className));
        break;
      case 'asIs':
      default:
        entries.push(className);
        break;
    }

    return entries;
  };
