import { readFileSync } from 'fs';
import { CSSExports } from 'icss-utils';
import { join } from 'path';
import postcss from 'postcss';
import postcssIcssSelectors from 'postcss-icss-selectors';
import postcssImportSync from 'postcss-import-sync2';
import postcssIcssKeyframes from 'postcss-icss-keyframes';
import tsModule from 'typescript/lib/tsserverlibrary';
import { getClasses } from '../getClasses';
import { createExports } from '../createExports';
import { Logger } from '../logger';
import { Options } from '../../options';

const testFileNames = [
  'test.module.css',
  'test.module.less',
  'test.module.styl',
  'test.module.scss',
  'test.module.sass',
  'empty.module.less',
  'empty.module.sass',
  'empty.module.scss',
  'empty.module.styl',
  'import.module.css',
  'import.module.less',
  'import.module.styl',
];

const logger: Logger = {
  log: jest.fn(),
  error: jest.fn(),
};

const options: Options = {};

const compilerOptions: tsModule.CompilerOptions = {};

const processor = postcss([
  postcssImportSync(),
  postcssIcssSelectors({ mode: 'local' }),
  postcssIcssKeyframes(),
]);

describe('utils / cssSnapshots', () => {
  testFileNames.forEach((testFile) => {
    let classes: CSSExports;
    const fileName = join(__dirname, 'fixtures', testFile);
    const css = readFileSync(fileName, 'utf8');

    beforeAll(() => {
      classes = getClasses({
        css,
        fileName,
        logger,
        options,
        processor,
        compilerOptions,
      });
    });

    describe(`with file '${testFile}'`, () => {
      describe('getClasses', () => {
        it('should return an object matching expected CSS', () => {
          expect(classes).toMatchSnapshot();
        });
      });

      describe('createExports', () => {
        it('should create an exports file', () => {
          const exports = createExports({
            classes,
            fileName,
            logger,
            options: {},
          });
          expect(exports).toMatchSnapshot();
        });
      });

      describe('with a custom template', () => {
        it('should transform the generated dts', () => {
          const customTemplate = join(
            __dirname,
            'fixtures',
            'customTemplate.js',
          );

          const options: Options = { customTemplate };

          const dts = createExports({
            classes,
            fileName,
            logger,
            options,
          });
          expect(dts).toMatchSnapshot();
        });
      });
    });
  });

  describe('with a Bootstrap import', () => {
    const fileName = join(__dirname, 'fixtures', 'bootstrap.module.scss');
    const css = readFileSync(fileName, 'utf8');

    it('should find external files', () => {
      const classes = getClasses({
        css,
        fileName,
        logger,
        options,
        processor,
        compilerOptions,
      });

      expect(classes.test).toMatchSnapshot();
    });
  });

  describe('with a custom renderer', () => {
    const fileName = 'exampleFileContents';
    const css = 'exampleFileName';
    const customRenderer = join(__dirname, 'fixtures', 'customRenderer.js');

    const options: Options = { customRenderer };

    it('should process a file and log', () => {
      const classes = getClasses({
        css,
        fileName,
        logger,
        options,
        processor,
        compilerOptions,
      });

      expect(classes).toMatchSnapshot();
      expect(logger.log).toHaveBeenCalledWith('Example log');
    });
  });

  describe('with includePaths in sass options', () => {
    const fileName = join(__dirname, 'fixtures', 'include-path.module.scss');
    const css = readFileSync(fileName, 'utf8');

    const options: Options = {
      rendererOptions: {
        sass: { includePaths: [join(__dirname, 'external')] },
      },
    };

    it('should find external file from includePaths', () => {
      const classes = getClasses({
        css,
        fileName,
        logger,
        options,
        processor,
        compilerOptions,
      });

      expect(classes).toMatchSnapshot();
    });
  });

  describe('with includePaths in stylus options', () => {
    const fileName = join(__dirname, 'fixtures', 'include-path.module.styl');
    const css = readFileSync(fileName, 'utf8');

    const options: Options = {
      rendererOptions: {
        stylus: {
          paths: [join(__dirname, 'external')],
        },
      },
    };

    it('should find external file from includePaths', () => {
      const classes = getClasses({
        css,
        fileName,
        logger,
        options,
        processor,
        compilerOptions,
      });

      expect(classes).toMatchSnapshot();
    });
  });

  describe('with baseUrl and paths in compilerOptions', () => {
    const fileName = join(__dirname, 'fixtures', 'tsconfig-paths.module.scss');
    const css = readFileSync(fileName, 'utf8');
    const compilerOptions = {
      baseUrl: __dirname,
      paths: {
        '@scss/*': ['external/package/*'],
        'alias.scss': ['external/package/public.module.scss'],
      },
    };

    it('sass should find the files', () => {
      const classes = getClasses({
        css,
        fileName,
        logger,
        options,
        processor,
        compilerOptions,
      });

      expect(classes).toMatchSnapshot();
    });
  });
});
