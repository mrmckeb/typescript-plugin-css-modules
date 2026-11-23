import fs from 'fs';
import os from 'os';
import path from 'path';
import ts from 'typescript/lib/tsserverlibrary';
import init from '../index';

const pluginName = 'typescript-plugin-css-modules';

describe('configured projects', () => {
  it('keeps CSS diagnostics working when tsconfig.json changes', () => {
    const originalDirectory = process.cwd();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'css-modules-'));
    const configFile = path.join(directory, 'tsconfig.json');
    const sourceFile = path.join(directory, 'index.ts');
    const source =
      "import styles from './styles.module.css'; styles.foo; styles.missing;";
    const writeConfig = (strict: boolean) => {
      fs.writeFileSync(
        configFile,
        JSON.stringify({
          compilerOptions: { strict, plugins: [{ name: pluginName }] },
          files: ['index.ts'],
        }),
      );
    };
    writeConfig(false);
    fs.writeFileSync(sourceFile, source);
    fs.writeFileSync(path.join(directory, 'styles.module.css'), '.foo {}');

    const watchers = new Map<string, ts.FileWatcherCallback>();
    const timers = new Map<number, () => void>();
    let nextTimer = 0;
    const host: ts.server.ServerHost = {
      ...ts.sys,
      watchFile: (fileName, callback) => {
        watchers.set(fileName, callback);
        return { close: () => watchers.delete(fileName) };
      },
      watchDirectory: () => ({ close: () => undefined }),
      setTimeout: (
        callback: (...args: unknown[]) => void,
        _ms,
        ...args: unknown[]
      ) => {
        timers.set(++nextTimer, () => {
          callback(...args);
        });
        return nextTimer;
      },
      clearTimeout: (id: number) => timers.delete(id),
      setImmediate,
      clearImmediate,
      require: (_initialPath, name) =>
        name === pluginName
          ? { module: init, error: undefined }
          : { module: undefined, error: { message: name } },
    };
    const logger: ts.server.Logger = {
      close: () => undefined,
      hasLevel: () => false,
      loggingEnabled: () => false,
      perftrc: () => undefined,
      info: () => undefined,
      startGroup: () => undefined,
      endGroup: () => undefined,
      msg: () => undefined,
      getLogFileName: () => undefined,
    };
    const service = new ts.server.ProjectService({
      host,
      logger,
      cancellationToken: { isCancellationRequested: () => false },
      useSingleInferredProject: false,
      useInferredProjectPerProjectRoot: false,
      allowLocalPluginLoads: true,
      session: undefined,
    });
    try {
      service.openClientFile(sourceFile);
      const project = service.getDefaultProjectForFile(
        ts.server.toNormalizedPath(sourceFile),
        true,
      );
      expect(project).toBeDefined();
      if (!project) throw new Error('Configured project was not created');
      const diagnostics = () =>
        project
          .getLanguageService()
          .getSemanticDiagnostics(sourceFile)
          .map((diagnostic) =>
            ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
          );
      expect(diagnostics()).toEqual([
        "Property 'missing' does not exist on type '{ foo: string; }'.",
      ]);

      for (const strict of [true, false]) {
        writeConfig(strict);
        const onConfigChange = watchers.get(configFile);
        if (!onConfigChange) throw new Error('Config file was not watched');
        onConfigChange(configFile, ts.FileWatcherEventKind.Changed);
        for (let iteration = 0; timers.size && iteration < 20; iteration++) {
          const pending = Array.from(timers.values());
          timers.clear();
          pending.forEach((callback) => {
            callback();
          });
        }
        expect(timers.size).toBe(0);
        expect(diagnostics()).toEqual([
          "Property 'missing' does not exist on type '{ foo: string; }'.",
        ]);
        const completions = project
          .getLanguageService()
          .getCompletionsAtPosition(sourceFile, source.indexOf('foo'), {});
        expect(completions?.entries.map(({ name }) => name)).toEqual(['foo']);
      }
    } finally {
      service.configuredProjects.forEach((project) => {
        project.close();
      });
      service.inferredProjects.forEach((project) => {
        project.close();
      });
      process.chdir(originalDirectory);
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe('language service hosts', () => {
  it.each(['literals', 'legacy'])(
    'preserves prior plugins with %s resolution',
    (resolver) => {
      const originalDirectory = process.cwd();
      const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'css-modules-'));
      const fileName = path.join(directory, 'index.ts');
      const cssFile = path.join(directory, 'styles.module.css');
      const source =
        "import styles from '@styles/styles.module.css'; styles.foo; styles.missing;";
      fs.writeFileSync(fileName, source);
      fs.writeFileSync(cssFile, '.foo {}');
      const options: ts.CompilerOptions = {
        baseUrl: directory,
        paths: { '@styles/*': ['./*'] },
        noLib: true,
      };
      const host: ts.LanguageServiceHost = {
        getCompilationSettings: () => options,
        getCurrentDirectory: () => directory,
        getDefaultLibFileName: () => '',
        getScriptFileNames: () => [fileName],
        getScriptVersion: () => '1',
        getScriptKind: function () {
          expect(this).toBe(host);
          return ts.ScriptKind.TS;
        },
        getScriptSnapshot: function (name) {
          expect(this).toBe(host);
          const text = ts.sys.readFile(name);
          return text === undefined
            ? undefined
            : ts.ScriptSnapshot.fromString(text);
        },
        fileExists: (name) => ts.sys.fileExists(name),
        readFile: (name) => ts.sys.readFile(name),
      };
      const resolve = (name: string, containingFile: string) =>
        ts.resolveModuleName(name, containingFile, options, host);
      if (resolver === 'literals') {
        host.resolveModuleNameLiterals = function (names, containingFile) {
          expect(this).toBe(host);
          return names.map(({ text }) => resolve(text, containingFile));
        };
      } else {
        host.resolveModuleNames = function (names, containingFile) {
          expect(this).toBe(host);
          return names.map(
            (name) => resolve(name, containingFile).resolvedModule,
          );
        };
        host.getResolvedModuleWithFailedLookupLocationsFromCache = function (
          name,
          containingFile,
        ) {
          expect(this).toBe(host);
          return resolve(name, containingFile);
        };
      }
      const languageService = ts.createLanguageService(host);
      const quickInfo = jest.fn(
        languageService.getQuickInfoAtPosition.bind(languageService),
      );
      const priorPlugin = {
        ...languageService,
        getQuickInfoAtPosition: quickInfo,
      };
      const project = {
        getCurrentDirectory: () => directory,
        getCompilerOptions: () => options,
        projectService: { logger: { info: () => undefined } },
      } as unknown as ts.server.Project;
      try {
        const decorated = init({ typescript: ts }).create({
          languageService: priorPlugin,
          languageServiceHost: host,
          project,
          config: {},
          serverHost: ts.sys as ts.server.ServerHost,
        });
        expect(
          decorated.getSemanticDiagnostics(fileName).map(({ code }) => code),
        ).toEqual([2339]);
        decorated.getQuickInfoAtPosition(fileName, source.indexOf('foo'));
        expect(quickInfo).toHaveBeenCalledTimes(1);
        expect(decorated).toBe(priorPlugin);
        expect(
          host.getScriptSnapshot(path.join(directory, 'missing.ts')),
        ).toBeUndefined();

        // Reinitializing with new options must not keep the old CSS matcher.
        const readSnapshot = host.getScriptSnapshot.bind(host);
        const laterPlugin = jest.fn(readSnapshot);
        host.getScriptSnapshot = laterPlugin;
        init({ typescript: ts }).create({
          languageService: priorPlugin,
          languageServiceHost: host,
          project,
          config: { options: { customMatcher: '\\.sass$' } },
          serverHost: ts.sys as ts.server.ServerHost,
        });
        const snapshot = host.getScriptSnapshot(cssFile);
        expect(snapshot?.getText(0, snapshot.getLength())).toBe('.foo {}');
        expect(laterPlugin).toHaveBeenCalledWith(cssFile);
      } finally {
        languageService.dispose();
        process.chdir(originalDirectory);
        fs.rmSync(directory, { recursive: true, force: true });
      }
    },
  );
});

describe('subpath imports', () => {
  it.each([
    ts.ModuleResolutionKind.Node10,
    ts.ModuleResolutionKind.Node16,
    ts.ModuleResolutionKind.Bundler,
  ])(
    'resolves Node.js package.json subpath imports with moduleResolution=%s',
    (moduleResolution) => {
      const originalDirectory = process.cwd();
      const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'css-modules-'));
      const srcDir = path.join(directory, 'src');
      const stylesDir = path.join(srcDir, 'styles');
      fs.mkdirSync(stylesDir, { recursive: true });

      const fileName = path.join(srcDir, 'index.ts');
      const wildcardCssFile = path.join(stylesDir, 'Home.module.css');
      const exactCssFile = path.join(stylesDir, 'Button.module.css');
      const conditionalCssFile = path.join(stylesDir, 'Card.module.css');
      const fallbackCssFile = path.join(stylesDir, 'Badge.module.css');
      const utilTsFile = path.join(srcDir, 'util.ts');

      fs.writeFileSync(
        path.join(directory, 'package.json'),
        JSON.stringify({
          name: 'subpath-imports-fixture',
          imports: {
            '#styles/*': './src/styles/*',
            '#button': './src/styles/Button.module.css',
            '#conditional/*': {
              import: './src/styles/*',
              default: './src/fallback/*',
            },
            '#array/*': ['./src/missing/*', './src/styles/*'],
            '#util': './src/util.ts',
          },
        }),
      );

      fs.writeFileSync(wildcardCssFile, '.title {}');
      fs.writeFileSync(exactCssFile, '.btn {}');
      fs.writeFileSync(conditionalCssFile, '.card {}');
      fs.writeFileSync(fallbackCssFile, '.badge {}');
      fs.writeFileSync(utilTsFile, 'export const value = 1;');

      const source = [
        "import homeStyles from '#styles/Home.module.css';",
        "import buttonStyles from '#button';",
        "import cardStyles from '#conditional/Card.module.css';",
        "import badgeStyles from '#array/Badge.module.css';",
        'homeStyles.title;',
        'homeStyles.missing;',
        'buttonStyles.btn;',
        'cardStyles.card;',
        'badgeStyles.badge;',
      ].join('\n');
      fs.writeFileSync(fileName, source);

      const options: ts.CompilerOptions = {
        moduleResolution,
        module:
          moduleResolution === ts.ModuleResolutionKind.Node16
            ? ts.ModuleKind.Node16
            : ts.ModuleKind.ESNext,
        noLib: true,
      };
      const host: ts.LanguageServiceHost = {
        getCompilationSettings: () => options,
        getCurrentDirectory: () => directory,
        getDefaultLibFileName: () => '',
        getScriptFileNames: () => [fileName],
        getScriptVersion: () => '1',
        getScriptKind: () => ts.ScriptKind.TS,
        getScriptSnapshot: (name) => {
          const text = ts.sys.readFile(name);
          return text === undefined
            ? undefined
            : ts.ScriptSnapshot.fromString(text);
        },
        fileExists: (name) => ts.sys.fileExists(name),
        readFile: (name) => ts.sys.readFile(name),
        resolveModuleNameLiterals: (names, containingFile) =>
          names.map(({ text }) =>
            ts.resolveModuleName(text, containingFile, options, host),
          ),
      };

      const languageService = ts.createLanguageService(host);
      const project = {
        getCurrentDirectory: () => directory,
        getCompilerOptions: () => options,
        projectService: { logger: { info: () => undefined } },
      } as unknown as ts.server.Project;

      try {
        const decorated = init({ typescript: ts }).create({
          languageService,
          languageServiceHost: host,
          project,
          config: {},
          serverHost: ts.sys as ts.server.ServerHost,
        });

        const diagnostics = decorated
          .getSemanticDiagnostics(fileName)
          .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
        expect(diagnostics).toEqual([
          "Property 'missing' does not exist on type '{ title: string; }'.",
        ]);

        const completions = decorated.getCompletionsAtPosition(
          fileName,
          source.indexOf('title'),
          {},
        );
        expect(completions?.entries.map(({ name }) => name)).toEqual(['title']);
      } finally {
        languageService.dispose();
        process.chdir(originalDirectory);
        fs.rmSync(directory, { recursive: true, force: true });
      }
    },
  );

  it('does not hijack non-CSS subpath imports under Bundler resolution', () => {
    const originalDirectory = process.cwd();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'css-modules-'));
    const srcDir = path.join(directory, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    const fileName = path.join(srcDir, 'index.ts');
    fs.writeFileSync(
      path.join(directory, 'package.json'),
      JSON.stringify({
        name: 'subpath-non-css-fixture',
        imports: { '#util': './src/util.ts' },
      }),
    );
    fs.writeFileSync(path.join(srcDir, 'util.ts'), 'export const value = 1;');
    fs.writeFileSync(fileName, "import { value } from '#util'; void value;");

    const options: ts.CompilerOptions = {
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      module: ts.ModuleKind.ESNext,
      noLib: true,
    };
    const host: ts.LanguageServiceHost = {
      getCompilationSettings: () => options,
      getCurrentDirectory: () => directory,
      getDefaultLibFileName: () => '',
      getScriptFileNames: () => [fileName],
      getScriptVersion: () => '1',
      getScriptKind: () => ts.ScriptKind.TS,
      getScriptSnapshot: (name) => {
        const text = ts.sys.readFile(name);
        return text === undefined
          ? undefined
          : ts.ScriptSnapshot.fromString(text);
      },
      fileExists: (name) => ts.sys.fileExists(name),
      readFile: (name) => ts.sys.readFile(name),
      resolveModuleNameLiterals: (names, containingFile) =>
        names.map(({ text }) =>
          ts.resolveModuleName(text, containingFile, options, host),
        ),
    };
    const languageService = ts.createLanguageService(host);
    const project = {
      getCurrentDirectory: () => directory,
      getCompilerOptions: () => options,
      projectService: { logger: { info: () => undefined } },
    } as unknown as ts.server.Project;

    try {
      const decorated = init({ typescript: ts }).create({
        languageService,
        languageServiceHost: host,
        project,
        config: {},
        serverHost: ts.sys as ts.server.ServerHost,
      });
      expect(decorated.getSemanticDiagnostics(fileName)).toEqual([]);
    } finally {
      languageService.dispose();
      process.chdir(originalDirectory);
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
