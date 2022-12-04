import { SourceMapConsumer } from 'source-map-js';
import { CustomTemplate, Options } from '../options';
import { transformClasses } from './classTransforms';
import { CSSExportsWithSourceMap } from './getCssExports';
import { VALID_VARIABLE_REGEXP } from './validVarRegexp';
import { Logger } from './logger';

const isValidVariable = (className: string) =>
  VALID_VARIABLE_REGEXP.test(className);

const flattenClassNames = (
  previousValue: string[] = [],
  currentValue: string[],
) => previousValue.concat(currentValue);

export const createDtsExports = ({
  cssExports,
  fileName,
  logger,
  options,
}: {
  cssExports: CSSExportsWithSourceMap;
  fileName: string;
  logger: Logger;
  options: Options;
}): string => {
  const classes = cssExports.classes;

  const possiblyUndefined = Boolean(options.noUncheckedIndexedAccess);

  const classNameToProperty = (className: string) =>
    `'${className}'${possiblyUndefined ? '?' : ''}: string;`;
  const classNameToNamedExport = (className: string) =>
    `export let ${className}${possiblyUndefined ? '?' : ''}: string;`;

  const processedClasses = Object.keys(classes)
    .map(transformClasses(options.classnameTransform))
    .reduce(flattenClassNames, []);
  const filteredClasses = processedClasses
    .filter(isValidVariable)
    .map(classNameToNamedExport);

  let dts = `\
declare let classes: {
  ${processedClasses.map(classNameToProperty).join('\n  ')}
};
export default classes;
`;

  if (options.namedExports !== false && filteredClasses.length) {
    dts += filteredClasses.join('\n') + '\n';
  }

  if (options.goToDefinition && cssExports.sourceMap) {
    // Create a new source map consumer.
    const smc = new SourceMapConsumer(cssExports.sourceMap);

    // Split original CSS file into lines.
    const cssLines = cssExports.css?.split('\n') ?? [];

    // Create new equal size array of empty strings.
    const dtsLines = Array.from(Array(cssLines.length), () => '');

    // Create a list of filtered classnames and hashed classnames.
    const filteredClasses = Object.entries(cssExports.classes)
      .map(([className, hashedClassName]) => [
        // TODO: Improve this. It may return multiple valid classnames and we
        // want to handle all of those.
        transformClasses(options.classnameTransform)(className)[0],
        hashedClassName,
      ])
      .filter(([className]) => isValidVariable(className));

    filteredClasses.forEach(([className, hashedClassName]) => {
      const matchedLine = cssLines.findIndex((line) =>
        line.includes(hashedClassName),
      );
      const matchedColumn =
        matchedLine && cssLines[matchedLine].indexOf(hashedClassName);
      const { line: lineNumber } = smc.originalPositionFor({
        // Lines start at 1, not 0.
        line: matchedLine >= 0 ? matchedLine + 1 : 1,
        column: matchedColumn >= 0 ? matchedColumn : 0,
      });
      dtsLines[lineNumber ? lineNumber - 1 : 0] +=
        classNameToNamedExport(className);
    });

    dts = dtsLines.join('\n');
  }

  if (options.customTemplate) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const customTemplate = require(options.customTemplate) as CustomTemplate;
    return customTemplate(dts, {
      classes,
      fileName,
      logger,
    });
  }

  return dts;
};
