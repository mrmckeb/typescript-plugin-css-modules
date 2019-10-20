import { CSSExports } from 'icss-utils';
import reserved from 'reserved-words';
import { Options } from '../options';
import { transformClasses } from './classTransforms';

const NOT_CAMELCASE_REGEXP = /[\-_]/;

const classNameToProperty = (className: string) => `'${className}': string;`;
const classNameToNamedExport = (className: string) =>
  `export const ${className}: string;`;

const flattenClassNames = (
  previousValue: string[] = [],
  currentValue: string[],
) => previousValue.concat(currentValue);

export const createExports = (classes: CSSExports, options: Options) => {
  const isCamelCase = (className: string) =>
    !NOT_CAMELCASE_REGEXP.test(className);
  const isReservedWord = (className: string) => !reserved.check(className);

  const processedClasses = Object.keys(classes)
    .map(transformClasses(options.classnameTransform))
    .reduce(flattenClassNames, []);
  const camelCasedKeys = processedClasses
    .filter(isCamelCase)
    .filter(isReservedWord)
    .map(classNameToNamedExport);

  const defaultExport = `\
declare const classes: {
${processedClasses.map(classNameToProperty).join('\n  ')}
};
export default classes;
`;

  if (camelCasedKeys.length) {
    return defaultExport + camelCasedKeys.join('\n') + '\n';
  }
  return defaultExport;
};
