import * as fs from 'fs';
import * as path from 'path';
import * as loadPostCssConfig from 'postcss-load-config';
import * as ts_module from 'typescript/lib/tsserverlibrary';
import { createMatchers } from './helpers/createMatchers';
import { isCSSFn } from './helpers/cssExtensions';
import { DtsSnapshotCreator } from './helpers/DtsSnapshotCreator';
import { Options } from './options';
import { createLogger } from './helpers/logger';
import * as postcss from 'postcss';
import * as postcssIcssSelectors from 'postcss-icss-selectors';

const removePlugin = postcss.plugin('remove-mixins', () => (css) => {
  css.walkRules((rule) => {
    rule.walkAtRules((atRule) => {
      if (atRule.name === 'mixin') {
        atRule.remove();
      }
    });
  });
});

function getPostCssConfig(dir: string) {
  try {
    return loadPostCssConfig.sync({}, dir);
  } catch (error) {
    return { plugins: [] };
  }
}

const sassPathRegex = /^SASS_PATH=(.+)/m;

function init({ typescript: ts }: { typescript: typeof ts_module }) {
  let _isCSS: isCSSFn;

  function create(info: ts.server.PluginCreateInfo) {
    const logger = createLogger(info);
    const dtsSnapshotCreator = new DtsSnapshotCreator(logger);
    const postcssConfig = getPostCssConfig(info.project.getCurrentDirectory());
    const processor = postcss([
      removePlugin(),
      ...postcssConfig.plugins.filter(
        // Postcss mixins plugin might be async and will break the postcss sync output.
        (plugin) => !['postcss-mixins'].includes(plugin.postcssPlugin),
      ),
      postcssIcssSelectors({ mode: 'local' }),
    ]);

    // User options for plugin.
    const options: Options = info.config.options || {};

    logger.log(`options: ${JSON.stringify(options)}`);

    // Create matchers using options object.
    const { isCSS, isRelativeCSS } = createMatchers(logger, options);
    _isCSS = isCSS;

    // Creates new virtual source files for the CSS modules.
    const _createLanguageServiceSourceFile = ts.createLanguageServiceSourceFile;
    ts.createLanguageServiceSourceFile = (
      fileName,
      scriptSnapshot,
      ...rest
    ): ts.SourceFile => {
      if (isCSS(fileName)) {
        scriptSnapshot = dtsSnapshotCreator.getDtsSnapshot(
          ts,
          processor,
          fileName,
          scriptSnapshot,
          options,
        );
      }
      const sourceFile = _createLanguageServiceSourceFile(
        fileName,
        scriptSnapshot,
        ...rest,
      );
      if (isCSS(fileName)) {
        sourceFile.isDeclarationFile = true;
      }
      return sourceFile;
    };

    // Updates virtual source files as files update.
    const _updateLanguageServiceSourceFile = ts.updateLanguageServiceSourceFile;
    ts.updateLanguageServiceSourceFile = (
      sourceFile,
      scriptSnapshot,
      ...rest
    ): ts.SourceFile => {
      if (isCSS(sourceFile.fileName)) {
        scriptSnapshot = dtsSnapshotCreator.getDtsSnapshot(
          ts,
          processor,
          sourceFile.fileName,
          scriptSnapshot,
          options,
        );
      }
      sourceFile = _updateLanguageServiceSourceFile(
        sourceFile,
        scriptSnapshot,
        ...rest,
      );
      if (isCSS(sourceFile.fileName)) {
        sourceFile.isDeclarationFile = true;
      }
      return sourceFile;
    };

    if (info.languageServiceHost.resolveModuleNames) {
      const _resolveModuleNames = info.languageServiceHost.resolveModuleNames.bind(
        info.languageServiceHost,
      );

      info.languageServiceHost.resolveModuleNames = (
        moduleNames,
        containingFile,
        ...rest
      ) => {
        const resolvedModules = _resolveModuleNames(
          moduleNames,
          containingFile,
          ...rest,
        );

        return moduleNames.map((moduleName, index) => {
          try {
            if (isRelativeCSS(moduleName)) {
              return {
                extension: ts_module.Extension.Dts,
                isExternalLibraryImport: false,
                resolvedFileName: path.resolve(
                  path.dirname(containingFile),
                  moduleName,
                ),
              };
            } else if (isCSS(moduleName)) {
              // TODO: Move this section to a separate file and add basic tests.
              // Attempts to locate the module using TypeScript's previous search paths. These include "baseUrl" and "paths".
              const failedModule = info.project.getResolvedModuleWithFailedLookupLocationsFromCache(
                moduleName,
                containingFile,
              );
              const baseUrl = info.project.getCompilerOptions().baseUrl;
              const match = '/index.ts';

              // An array of paths TypeScript searched for the module. All include .ts, .tsx, .d.ts, or .json extensions.
              const failedLocations: string[] = (failedModule as any)
                .failedLookupLocations;
              // Filter to only one extension type, and remove that extension. This leaves us with the actual filename.
              // Example: "usr/person/project/src/dir/File.module.css/index.d.ts" > "usr/person/project/src/dir/File.module.css"
              const normalizedLocations = failedLocations.reduce(
                (locations, location) => {
                  if (
                    (baseUrl ? location.includes(baseUrl) : true) &&
                    location.endsWith(match)
                  ) {
                    return [...locations, location.replace(match, '')];
                  }
                  return locations;
                },
                [] as string[],
              );

              // Find the imported CSS module, if it exists.
              const cssModulePath = normalizedLocations.find((location) =>
                fs.existsSync(location),
              );

              if (cssModulePath) {
                return {
                  extension: ts_module.Extension.Dts,
                  isExternalLibraryImport: false,
                  resolvedFileName: path.resolve(cssModulePath),
                };
              }
            }
          } catch (e) {
            logger.error(e);
            return resolvedModules[index];
          }
          return resolvedModules[index];
        });
      };
    }

    const projectDir = info.project.getCurrentDirectory();
    const dotenvPath = path.resolve(projectDir, '.env'); // MAYBE TODO: custom .env file name/path in Options?

    // Manually open .env and parse just the SASS_PATH part,
    // because we don't *need* to apply the full .env to this environment,
    // and we are not sure doing so wouldn't have side effects
    const dotenv = fs.readFileSync(dotenvPath, { encoding: 'utf8' });
    const sassPathMatch = sassPathRegex.exec(dotenv);

    if (sassPathMatch && sassPathMatch[1]) {
      const sassPaths = sassPathMatch[1].split(path.delimiter);

      // Manually convert relative paths in SASS_PATH to absolute,
      // lest they be resolved relative to process.cwd which would almost certainly be wrong
      for (
        var i = 0, currPath = sassPaths[i];
        i < sassPaths.length;
        currPath = sassPaths[++i]
      ) {
        if (path.isAbsolute(currPath)) continue;
        sassPaths[i] = path.resolve(projectDir, currPath); // resolve path relative to project directory
      }
      // join modified array and assign to environment SASS_PATH
      process.env.SASS_PATH = sassPaths.join(path.delimiter);
    }

    return info.languageService;
  }

  function getExternalFiles(project: ts_module.server.ConfiguredProject) {
    return project.getFileNames().filter(_isCSS);
  }

  return { create, getExternalFiles };
}

export = init;
