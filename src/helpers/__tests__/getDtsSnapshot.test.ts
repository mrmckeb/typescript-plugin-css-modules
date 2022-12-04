import { readFileSync } from 'fs';
import { join } from 'path';
import postcssImportSync from 'postcss-import-sync2';
import tsModule from 'typescript/lib/tsserverlibrary';
import { CSSExportsWithSourceMap, getCssExports } from '../getCssExports';
import { createDtsExports } from '../createDtsExports';
import { Logger } from '../logger';
import { getProcessor } from '../getProcessor';
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

const processor = getProcessor([
  // For testing PostCSS import support/functionality.
  postcssImportSync(),
]);

describe('utils / cssSnapshots', () => {
  testFileNames.forEach((testFile) => {
    let cssExports: CSSExportsWithSourceMap;
    const fileName = join(__dirname, 'fixtures', testFile);
    const css = readFileSync(fileName, 'utf8');

    beforeAll(() => {
      cssExports = getCssExports({
        css,
        fileName,
        logger,
        options,
        processor,
        compilerOptions,
        directory: __dirname,
      });
    });

    describe(`with file '${testFile}'`, () => {
      describe('getCssExports', () => {
        it('should return an object matching expected CSS', () => {
          expect(cssExports.classes).toMatchSnapshot();
        });
      });

      describe('createExports', () => {
        it('should create an exports file', () => {
          const dts = createDtsExports({
            cssExports,
            fileName,
            logger,
            options: {},
          });
          expect(dts).toMatchSnapshot();
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

          const dts = createDtsExports({
            cssExports,
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

    beforeAll(() => {
      // Hides output for deprecation, fixed in an upcoming release.
      // https://github.com/twbs/bootstrap/issues/37430
      jest.spyOn(process.stderr, 'write').mockImplementation();
    });

    it('should find external files', () => {
      const cssExports = getCssExports({
        css,
        fileName,
        logger,
        options,
        processor,
        compilerOptions,
        directory: __dirname,
      });

      expect(cssExports.classes.test).toMatchSnapshot();
    });
  });

  describe('with a custom renderer', () => {
    const fileName = 'exampleFileContents';
    const css = 'exampleFileName';
    const customRenderer = join(__dirname, 'fixtures', 'customRenderer.js');

    const options: Options = { customRenderer };

    it('should process a file and log', () => {
      const cssExports = getCssExports({
        css,
        fileName,
        logger,
        options,
        processor,
        compilerOptions,
        directory: __dirname,
      });

      expect(cssExports.classes).toMatchSnapshot();
      expect(logger.log).toHaveBeenCalledWith('Example log');
    });
  });

  describe('with includePaths in sass options', () => {
    const fileName = join(__dirname, 'fixtures', 'include-path.module.scss');
    const css = readFileSync(fileName, 'utf8');

    const options: Options = {
      rendererOptions: {
        sass: { loadPaths: [join(__dirname, 'external')] },
      },
    };

    it('should find external file from includePaths', () => {
      const cssExports = getCssExports({
        css,
        fileName,
        logger,
        options,
        processor,
        compilerOptions,
        directory: __dirname,
      });

      expect(cssExports.classes).toMatchSnapshot();
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
      const cssExports = getCssExports({
        css,
        fileName,
        logger,
        options,
        processor,
        compilerOptions,
        directory: __dirname,
      });

      expect(cssExports.classes).toMatchSnapshot();
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
      const cssExports = getCssExports({
        css,
        fileName,
        logger,
        options,
        processor,
        compilerOptions,
        directory: __dirname,
      });

      expect(cssExports.classes).toMatchSnapshot();
    });
  });

  describe('with goToDefinition enabled', () => {
    const fileName = join(__dirname, 'fixtures', 'test.module.scss');
    const css = readFileSync(fileName, 'utf8');
    const options: Options = {
      classnameTransform: 'camelCaseOnly',
      goToDefinition: true,
    };

    const cssExports = getCssExports({
      css,
      fileName,
      logger,
      options,
      processor,
      compilerOptions,
      directory: __dirname,
    });

    it('should return an object with classes, css, and a source map', () => {
      if (cssExports.sourceMap?.sources) {
        const cwd = process.cwd();
        cssExports.sourceMap.sources = cssExports.sourceMap.sources.map((src) =>
          src.replace(cwd, '[cwd]'),
        );
      }
      expect(cssExports).toMatchSnapshot();
    });

    it('should return a line-accurate dts file', () => {
      const dts = createDtsExports({
        cssExports,
        fileName,
        logger,
        options,
      });
      expect(dts).toMatchSnapshot();
    });
  });

  describe('with noUncheckedIndexedAccess enabled', () => {
    const fileName = join(__dirname, 'fixtures', 'test.module.scss');
    const css = readFileSync(fileName, 'utf8');
    const options: Options = {
      classnameTransform: 'camelCaseOnly',
      noUncheckedIndexedAccess: true,
    };

    const cssExports = getCssExports({
      css,
      fileName,
      logger,
      options,
      processor,
      compilerOptions,
      directory: __dirname,
    });

    it('should return a dts file with only possibly undefined strings', () => {
      const dts = createDtsExports({
        cssExports,
        fileName,
        logger,
        options,
      });
      expect(dts).not.toMatch(/\w'?: string/);
      expect(dts).toMatchSnapshot();
    });
  });

  describe('with allowAdditionalClasses enabled', () => {
    const fileName = join(__dirname, 'fixtures', 'test.module.scss');
    const css = readFileSync(fileName, 'utf8');
    const options: Options = {
      classnameTransform: 'camelCaseOnly',
      allowAdditionalClasses: true,
    };

    const cssExports = getCssExports({
      css,
      fileName,
      logger,
      options,
      processor,
      compilerOptions,
      directory: __dirname,
    });

    it('should return a dts file that allows any string value', () => {
      const dts = createDtsExports({
        cssExports,
        fileName,
        logger,
        options,
      });
      expect(dts).toMatchSnapshot();
    });
  });
});
