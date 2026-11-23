import { join } from 'path';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import type tsModule from 'typescript/lib/tsserverlibrary';
import { FileType, getCssExports, getFileType } from '../getCssExports';
import { getProcessor } from '../getProcessor';
import { Logger } from '../logger';
import { Options } from '../../options';

const logger: Logger = {
  log: jest.fn(),
  error: jest.fn(),
};

const processor = getProcessor();
const fixtures = join(__dirname, 'fixtures');

const run = ({
  css,
  fileName,
  options = {},
  compilerOptions = {},
}: {
  css: string;
  fileName: string;
  options?: Options;
  compilerOptions?: tsModule.CompilerOptions;
}) =>
  getCssExports({
    css,
    fileName,
    logger,
    options,
    processor,
    compilerOptions,
    directory: __dirname,
  });

describe('helpers / getCssExports', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  describe('getFileType', () => {
    it.each([
      ['a.module.css', FileType.css],
      ['a.module.less', FileType.less],
      ['a.module.sass', FileType.sass],
      ['a.module.scss', FileType.scss],
      ['a.module.styl', FileType.styl],
    ])('should detect %s as %s', (fileName, expected) => {
      expect(getFileType(fileName)).toBe(expected);
    });

    it('should default to scss for unknown extensions', () => {
      expect(getFileType('a.module.unknown')).toBe(FileType.scss);
    });
  });

  describe('plain CSS', () => {
    const fileName = join(fixtures, 'inline.module.css');

    it('should return class names as identity mappings', () => {
      const result = run({
        css: '.foo { color: red; } .bar-baz { color: blue; }',
        fileName,
      });
      expect(result.classes).toEqual({ foo: 'foo', 'bar-baz': 'bar-baz' });
    });

    it('should return the processed css and a source map', () => {
      const result = run({ css: '.foo { color: red; }', fileName });
      expect(result.css).toContain('.foo');
      expect(result.sourceMap).toBeDefined();
      expect(result.sourceMap?.mappings).toBeTruthy();
    });

    it('should return no classes for empty css', () => {
      expect(run({ css: '', fileName }).classes).toEqual({});
    });

    it('should ignore :global selectors', () => {
      const result = run({
        css: ':global(.ignored) { color: red; } .kept { color: blue; }',
        fileName,
      });
      expect(result.classes).toEqual({ kept: 'kept' });
    });

    it('should expose @value-free composes as a combined class', () => {
      const result = run({
        css: '.a { color: red; } .b { composes: a; color: blue; }',
        fileName,
      });
      expect(result.classes).toEqual({ a: 'a', b: 'b a' });
    });
  });

  describe('additionalData', () => {
    it('should prepend additionalData before processing', () => {
      const result = run({
        css: '.foo { color: red; }',
        fileName: join(fixtures, 'inline.module.css'),
        options: { additionalData: '.extra { color: blue; }\n' },
      });
      expect(Object.keys(result.classes)).toEqual(['extra', 'foo']);
    });

    it('should make additionalData sass variables available', () => {
      const result = run({
        css: '.foo { color: $primary; }',
        fileName: join(fixtures, 'inline.module.scss'),
        options: { additionalData: '$primary: red;\n' },
      });
      expect(result.classes).toEqual({ foo: 'foo' });
      expect(result.css).toContain('color: red');
    });
  });

  describe('SCSS', () => {
    const fileName = join(fixtures, 'inline.module.scss');

    it('should compile nesting, variables and mixins', () => {
      const result = run({
        css: `
          $c: red;
          @mixin m { color: $c; }
          .parent { @include m; .child { margin: 0; } }
        `,
        fileName,
      });
      expect(result.classes).toEqual({ parent: 'parent', child: 'child' });
      expect(result.css).toContain('color: red');
    });

    it('should produce a source map', () => {
      const result = run({ css: '.a { .b { color: red; } }', fileName });
      expect(result.sourceMap?.sources.length).toBeGreaterThan(0);
    });

    it('should resolve relative @use of a partial', () => {
      const result = run({
        css: "@use 'partial'; .x { color: partial.$primary-color; }",
        fileName: join(fixtures, 'partial.module.scss'),
      });
      expect(result.classes).toHaveProperty('x');
    });

    it('should honour sass loadPaths from rendererOptions', () => {
      const result = run({
        css: "@import 'external.module'; .local { color: red; }",
        fileName,
        options: {
          rendererOptions: {
            sass: { loadPaths: [join(__dirname, 'external', 'package')] },
          },
        },
      });
      expect(result.classes).toHaveProperty('local');
      expect(Object.keys(result.classes).length).toBeGreaterThan(1);
    });

    it('should resolve ~ imports from node_modules', () => {
      const result = run({
        css: "@use '~bootstrap/scss/functions'; .x { color: red; }",
        fileName,
      });
      expect(result.classes).toEqual({ x: 'x' });
    });

    it('should return empty classes and log on a syntax error', () => {
      const result = run({ css: '.a { color: ; ', fileName });
      expect(result).toEqual({ classes: {} });
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledTimes(1);
    });

    it('should return empty classes when an import cannot be found', () => {
      const result = run({ css: "@use 'does-not-exist';", fileName });
      expect(result).toEqual({ classes: {} });
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('SCSS path aliases', () => {
    const fileName = join(fixtures, 'alias.module.scss');
    const compilerOptions: tsModule.CompilerOptions = {
      baseUrl: __dirname,
      paths: {
        '@scss/*': ['external/package/*'],
        '@folder/*': ['fixtures/*'],
        'alias.scss': ['external/package/public.module.scss'],
      },
    };

    it('should resolve an exact aliased file', () => {
      const result = run({
        css: "@import 'alias.scss';",
        fileName,
        compilerOptions,
      });
      expect(result.classes).not.toEqual({});
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should resolve an aliased partial', () => {
      const result = run({
        css: "@import '@scss/external.module';",
        fileName,
        compilerOptions,
      });
      expect(result.classes).not.toEqual({});
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should resolve an aliased directory _index file', () => {
      const result = run({
        css: "@import '@folder/my-folder';",
        fileName,
        compilerOptions,
      });
      expect(result.classes).toHaveProperty('my-folder-index');
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should fail gracefully when an alias does not match anything', () => {
      const result = run({
        css: "@import '@scss/nope';",
        fileName,
        compilerOptions,
      });
      expect(result).toEqual({ classes: {} });
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('indented Sass', () => {
    it('should use the indented syntax for .sass files', () => {
      const result = run({
        css: '.foo\n  color: red\n  .bar\n    color: blue\n',
        fileName: join(fixtures, 'inline.module.sass'),
      });
      expect(result.classes).toEqual({ foo: 'foo', bar: 'bar' });
    });

    it('should fail on SCSS-only syntax in a .sass file', () => {
      const result = run({
        css: '.foo { color: red; }',
        fileName: join(fixtures, 'inline.module.sass'),
      });
      expect(result).toEqual({ classes: {} });
    });
  });

  describe('Less', () => {
    const fileName = join(fixtures, 'inline.module.less');

    it('should compile variables and nesting', () => {
      const result = run({
        css: '@c: red; .parent { color: @c; .child { margin: 0; } }',
        fileName,
      });
      expect(result.classes).toEqual({ parent: 'parent', child: 'child' });
      expect(result.css).toContain('color: red');
    });

    it('should produce a source map', () => {
      const result = run({ css: '.a { .b { color: red; } }', fileName });
      expect(result.sourceMap).toBeDefined();
    });

    it('should honour rendererOptions.less', () => {
      const result = run({
        css: '.a { width: (1 + 1); }',
        fileName,
        options: { rendererOptions: { less: { math: 'always' } } },
      });
      expect(result.css).toContain('width: 2');
    });

    it('should return empty classes and log on a syntax error', () => {
      const result = run({ css: '.a { color: @undefined; }', fileName });
      expect(result).toEqual({ classes: {} });
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('Stylus', () => {
    const fileName = join(fixtures, 'inline.module.styl');

    it('should compile stylus', () => {
      const result = run({ css: '.foo\n  color red\n', fileName });
      expect(result.classes).toEqual({ foo: 'foo' });
      expect(result.css).toContain('color: #f00');
    });

    it('should return empty classes on invalid stylus', () => {
      const result = run({ css: '.foo\n  color {{{\n', fileName });
      expect(result).toEqual({ classes: {} });
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('customRenderer', () => {
    let dir: string;

    beforeAll(() => {
      dir = mkdtempSync(join(tmpdir(), 'tpcm-renderer-'));
    });

    afterAll(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    const writeRenderer = (name: string, body: string) => {
      const file = join(dir, name);
      writeFileSync(file, `module.exports = ${body};`);
      return file;
    };

    it('should accept a string result', () => {
      const customRenderer = writeRenderer('string.js', '() => ".custom {}"');
      const result = run({
        css: '.ignored {}',
        fileName: join(fixtures, 'inline.module.scss'),
        options: { customRenderer },
      });
      expect(result.classes).toEqual({ custom: 'custom' });
    });

    it('should accept an object result with css only', () => {
      const customRenderer = writeRenderer(
        'object.js',
        '() => ({ css: ".objcss {}" })',
      );
      const result = run({
        css: '',
        fileName: join(fixtures, 'inline.module.css'),
        options: { customRenderer },
      });
      expect(result.classes).toEqual({ objcss: 'objcss' });
    });

    it('should pass raw css (with additionalData) and context to the renderer', () => {
      const customRenderer = writeRenderer(
        'args.js',
        '(css, { fileName, compilerOptions, logger }) => { logger.log(JSON.stringify({ css, fileName, compilerOptions })); return ".x {}"; }',
      );
      const fileName = join(fixtures, 'inline.module.css');
      run({
        css: '.in {}',
        fileName,
        options: { customRenderer, additionalData: '/* data */' },
        compilerOptions: { strict: true },
      });
      expect(logger.log).toHaveBeenCalledWith(
        JSON.stringify({
          css: '/* data */.in {}',
          fileName,
          compilerOptions: { strict: true },
        }),
      );
    });

    it('should bypass the built-in preprocessors', () => {
      const customRenderer = writeRenderer('bypass.js', '(css) => css');
      // `$x` is invalid CSS but would be valid SCSS; the renderer wins.
      const result = run({
        css: '.plain { color: red; }',
        fileName: join(fixtures, 'inline.module.scss'),
        options: { customRenderer },
      });
      expect(result.classes).toEqual({ plain: 'plain' });
    });

    it('should return empty classes if the renderer throws', () => {
      const customRenderer = writeRenderer(
        'throws.js',
        '() => { throw new Error("boom"); }',
      );
      const result = run({
        css: '',
        fileName: join(fixtures, 'inline.module.css'),
        options: { customRenderer },
      });
      expect(result).toEqual({ classes: {} });
      expect(logger.error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return empty classes if the renderer cannot be loaded', () => {
      const result = run({
        css: '',
        fileName: join(fixtures, 'inline.module.css'),
        options: { customRenderer: join(dir, 'missing.js') },
      });
      expect(result).toEqual({ classes: {} });
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
