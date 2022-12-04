import camelCase from 'lodash.camelcase';
import { ClassnameTransformOptions } from '../options';

// The below is based on the CSS Modules implementation found here:
// https://github.com/webpack-contrib/css-loader

const dashCase = (classname: string): string =>
  classname.replace(/-+(\w)/g, (_match: string, firstLetter: string) =>
    firstLetter.toUpperCase(),
  );

export const transformClasses =
  (camelCaseOption?: ClassnameTransformOptions) =>
  (classname: string): string[] => {
    const entries: string[] = [];

    switch (camelCaseOption) {
      case 'camelCase': {
        entries.push(classname);
        const targetClassName = camelCase(classname);
        if (targetClassName !== classname) {
          entries.push(targetClassName);
        }
        break;
      }
      case 'camelCaseOnly':
        entries.push(camelCase(classname));
        break;
      case 'dashes': {
        entries.push(classname);
        const targetClassName = dashCase(classname);
        if (targetClassName !== classname) {
          entries.push(targetClassName);
        }
        break;
      }
      case 'dashesOnly':
        entries.push(dashCase(classname));
        break;
      case 'asIs':
      default:
        entries.push(classname);
        break;
    }

    return entries;
  };
