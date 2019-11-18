import { readFileSync } from 'fs';
import { CSSExports } from 'icss-utils';
import { join } from 'path';
import postcss from 'postcss';
import postcssIcssSelectors from 'postcss-icss-selectors';
import postcssImportSync from 'postcss-import-sync2';
import { getClasses } from '../getClasses';
import { createExports } from '../createExports';
import { Logger } from '../logger';
import { Options } from '../../options';

const testFileNames = [
  'test.module.css',
  'test.module.less',
  'test.module.scss',
  'empty.module.less',
  'empty.module.scss',
  'import.module.css',
  'import.module.less',
];

const mockLogger: Logger = {
  log: jest.fn(),
  error: jest.fn(),
};

const mockOptions: Options = {};

const processor = postcss([
  postcssImportSync(),
  postcssIcssSelectors({ mode: 'local' }),
]);

describe('utils / cssSnapshots', () => {
  testFileNames.forEach((fileName) => {
    let classes: CSSExports;
    const fullFileName = join(__dirname, 'fixtures', fileName);
    const testFile = readFileSync(fullFileName, 'utf8');

    beforeAll(() => {
      classes = getClasses(
        processor,
        testFile,
        fullFileName,
        mockOptions,
        mockLogger,
      );
    });

    describe(`with file '${fileName}'`, () => {
      describe('getClasses', () => {
        it('should return an object matching expected CSS', () => {
          expect(classes).toMatchSnapshot();
        });
      });

      describe('createExports', () => {
        it('should create an exports file', () => {
          const exports = createExports(classes, {});
          expect(exports).toMatchSnapshot();
        });
      });
    });
  });

  describe('with a custom renderer', () => {
    const fullFileName = 'exampleFileContents';
    const testFile = 'exampleFileName';
    const customRenderer = join(__dirname, 'fixtures', 'customRenderer.js');
    const classes = getClasses(
      processor,
      testFile,
      fullFileName,
      { customRenderer },
      mockLogger,
    );

    it('should process a file and log', () => {
      expect(classes).toMatchSnapshot();
      expect(mockLogger.log).toHaveBeenCalledWith('Example log');
    });
  });

  describe('with includePaths in sass options', () => {
    const fullFileName = join(
      __dirname,
      'fixtures',
      'include-path.module.scss',
    );
    const testFile = readFileSync(fullFileName, 'utf8');

    it('should find external file from includePaths', () => {
      const classes = getClasses(
        processor,
        testFile,
        fullFileName,
        {
          rendererOptions: {
            sass: { includePaths: [join(__dirname, 'external')] },
          },
        },
        mockLogger,
      );

      expect(classes).toMatchSnapshot();
    });
  });
});
