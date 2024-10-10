import { SourceMapConsumer } from 'source-map-js';
import { CustomTemplate, Options } from '../options';
import { transformClasses } from './classTransforms';
import { CSSExportsWithSourceMap } from './getCssExports';
import { VALID_VARIABLE_REGEXP } from './validVarRegexp';
import { Logger } from './logger';

const isValidVariable = (classname: string) =>
  VALID_VARIABLE_REGEXP.test(classname);

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

  const classnameToProperty = (classname: string) =>
    `interface classes { '${classname}'${
      possiblyUndefined ? '?' : ''
    }: string; };`;
  const classnameToNamedExport = (classname: string) =>
    `export let ${classname}: string${
      possiblyUndefined ? ' | undefined' : ''
    };`;

  const processedClasses = Object.keys(classes)
    .map(transformClasses(options.classnameTransform))
    .reduce(flattenClassNames, []);
  const filteredClasses = processedClasses
    .filter(isValidVariable)
    .map(classnameToNamedExport);

  let dts = '';

  if (options.goToDefinition && cssExports.sourceMap) {
    // Create a new source map consumer.
    const smc = new SourceMapConsumer(cssExports.sourceMap);

    // Split original CSS file into lines.
    const cssLines = cssExports.css?.split('\n') ?? [];

    // Create new equal size array of empty strings.
    const dtsLines = Array.from(Array(cssLines.length), () => '');

    // Create a list of filtered classnames and hashed classnames.
    const transformedClasses = Object.entries(cssExports.classes).map(
      ([classname, originalClassname]) => [
        // TODO: Improve this. It may return multiple valid classnames and we
        // want to handle all of those.
        transformClasses(options.classnameTransform)(classname)[0],
        originalClassname,
      ],
    );

    transformedClasses.forEach(([classname, originalClassname]) => {
      let matchedLine;
      let matchedColumn;

      for (let i = 0; i < cssLines.length; i++) {
        const match = new RegExp(
          // NOTE: This excludes any match not starting with:
          // - `.` for classnames,
          // - `:` or ` ` for animation names,
          // and any matches followed by valid CSS selector characters.
          `[:.\\s]${originalClassname}(?![_a-zA-Z0-9-])`,
          'g',
        ).exec(cssLines[i]);

        if (match) {
          matchedLine = i;
          matchedColumn = match.index;
          break;
        }
      }

      const { line: lineNumber } = smc.originalPositionFor({
        // Lines start at 1, not 0.
        line: matchedLine ? matchedLine + 1 : 1,
        column: matchedColumn ? matchedColumn : 0,
      });

      if (isValidVariable(classname)) {
        dtsLines[lineNumber ? lineNumber - 1 : 0] +=
          classnameToNamedExport(classname);
      }

      dtsLines[lineNumber ? lineNumber - 1 : 0] +=
        classnameToProperty(classname);
    });

    dts = dtsLines.join('\n');
  } else {
    dts += processedClasses.map(classnameToProperty).join('\n  ');
    if (
      !options.goToDefinition &&
      options.namedExports !== false &&
      filteredClasses.length
    ) {
      dts += filteredClasses.join('\n') + '\n';
    }
  }

  if (options.allowUnknownClassnames) {
    dts += `
  interface classes { [key: string]: string };
    `;
  }

  dts = `interface classes { }; declare let _classes: classes; ${dts}
    export default _classes;
    `;

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
