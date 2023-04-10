import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { AcceptedPlugin } from 'postcss';
import postcssrc from 'postcss-load-config';
import type tsModule from 'typescript/lib/tsserverlibrary';
import { Options } from './options';
import { createMatchers } from './helpers/createMatchers';
import { isCSSFn } from './helpers/cssExtensions';
import { getDtsSnapshot } from './helpers/getDtsSnapshot';
import { createLogger } from './helpers/logger';
import { getProcessor } from './helpers/getProcessor';
import { filterPlugins } from './helpers/filterPlugins';

const getPostCssConfigPlugins = (directory: string) => {
  try {
    return postcssrc.sync({}, directory).plugins;
  } catch (error) {
    return [];
  }
};

const init: tsModule.server.PluginModuleFactory = ({ typescript: ts }) => {
  let _isCSS: isCSSFn;

  function create(
    info: tsModule.server.PluginCreateInfo,
  ): tsModule.LanguageService {
    const logger = createLogger(info);
    const directory = info.project.getCurrentDirectory();
    const compilerOptions = info.project.getCompilerOptions();

    const languageServiceHost = {} as Partial<tsModule.LanguageServiceHost>;

    const languageServiceHostProxy = new Proxy(info.languageServiceHost, {
      get(target, key: keyof tsModule.LanguageServiceHost) {
        return languageServiceHost[key]
          ? languageServiceHost[key]
          : target[key];
      },
    });

    const languageService = ts.createLanguageService(languageServiceHostProxy);

    // TypeScript plugins have a `cwd` of `/`, which causes issues with import resolution.
    process.chdir(directory);

    // User options for plugin.
    const options: Options =
      (info.config as { options?: Options }).options ?? {};
    logger.log(`options: ${JSON.stringify(options)}`);

    // Load environment variables like SASS_PATH.
    // TODO: Add tests for this option.
    const dotenvOptions = options.dotenvOptions;
    if (dotenvOptions) {
      dotenvOptions.path = path.resolve(
        directory,
        dotenvOptions.path ?? '.env',
      );
    }
    dotenv.config(dotenvOptions);

    // Normalise SASS_PATH array to absolute paths.
    if (process.env.SASS_PATH) {
      process.env.SASS_PATH = process.env.SASS_PATH.split(path.delimiter)
        .map((sassPath) =>
          path.isAbsolute(sassPath)
            ? sassPath
            : path.resolve(directory, sassPath),
        )
        .join(path.delimiter);
    }

    // Add postCSS config if enabled.
    const postcssOptions =
      options.postcssOptions ?? options.postCssOptions ?? {};

    let userPlugins: AcceptedPlugin[] = [];
    if (postcssOptions.useConfig) {
      const postcssConfigPlugins = getPostCssConfigPlugins(directory);
      userPlugins = filterPlugins({
        plugins: postcssConfigPlugins,
        exclude: postcssOptions.excludePlugins,
      });
    }

    // If a custom renderer is provided, resolve the path.
    if (options.customRenderer) {
      if (fs.existsSync(path.resolve(directory, options.customRenderer))) {
        options.customRenderer = path.resolve(
          directory,
          options.customRenderer,
        );
      } else if (fs.existsSync(require.resolve(options.customRenderer))) {
        options.customRenderer = require.resolve(options.customRenderer);
      } else {
        logger.error(
          new Error(
            `The file or package for \`customRenderer\` '${options.customRenderer}' could not be resolved.`,
          ),
        );
      }
    }

    // If a custom template is provided, resolve the path.
    if (options.customTemplate) {
      options.customTemplate = path.resolve(directory, options.customTemplate);
    }

    // Create PostCSS processor.
    const processor = getProcessor(userPlugins);

    // Create matchers using options object.
    const { isCSS, isRelativeCSS } = createMatchers(logger, options);
    _isCSS = isCSS;

    languageServiceHost.getScriptKind = (fileName) => {
      if (!info.languageServiceHost.getScriptKind) {
        return ts.ScriptKind.Unknown;
      }
      if (isCSS(fileName)) {
        return ts.ScriptKind.TS;
      }
      return info.languageServiceHost.getScriptKind(fileName);
    };

    languageServiceHost.getScriptSnapshot = (fileName) => {
      const fileExists = fs.existsSync(fileName);
      if (fileExists && isCSS(fileName)) {
        return getDtsSnapshot(
          ts,
          processor,
          fileName,
          options,
          logger,
          compilerOptions,
          directory,
        );
      }
      return info.languageServiceHost.getScriptSnapshot(fileName);
    };

    const createModuleResolver =
      (containingFile: string) =>
      (moduleName: string): tsModule.ResolvedModuleFull | undefined => {
        if (isRelativeCSS(moduleName)) {
          return {
            extension: ts.Extension.Dts,
            isExternalLibraryImport: false,
            resolvedFileName: path.resolve(
              path.dirname(containingFile),
              moduleName,
            ),
          };
        } else if (
          isCSS(moduleName) &&
          languageServiceHost.getResolvedModuleWithFailedLookupLocationsFromCache
        ) {
          // TODO: Move this section to a separate file and add basic tests.
          // Attempts to locate the module using TypeScript's previous search paths. These include "baseUrl" and "paths".
          const failedModule =
            languageServiceHost.getResolvedModuleWithFailedLookupLocationsFromCache(
              moduleName,
              containingFile,
            );
          const baseUrl = info.project.getCompilerOptions().baseUrl;
          const match = '/index.ts';

          // An array of paths TypeScript searched for the module. All include .ts, .tsx, .d.ts, or .json extensions.
          // NOTE: TypeScript doesn't expose this in their interfaces, which is why the type is unknown.
          // https://github.com/microsoft/TypeScript/issues/28770
          const failedLocations: readonly string[] = (
            failedModule as unknown as {
              failedLookupLocations: readonly string[];
            }
          ).failedLookupLocations;

          // Filter to only one extension type, and remove that extension. This leaves us with the actual file name.
          // Example: "usr/person/project/src/dir/File.module.css/index.d.ts" > "usr/person/project/src/dir/File.module.css"
          const normalizedLocations = failedLocations.reduce<string[]>(
            (locations, location) => {
              if (
                (baseUrl ? location.includes(baseUrl) : true) &&
                location.endsWith(match)
              ) {
                return [...locations, location.replace(match, '')];
              }
              return locations;
            },
            [],
          );

          // Find the imported CSS module, if it exists.
          const cssModulePath = normalizedLocations.find((location) =>
            fs.existsSync(location),
          );

          if (cssModulePath) {
            return {
              extension: ts.Extension.Dts,
              isExternalLibraryImport: false,
              resolvedFileName: path.resolve(cssModulePath),
            };
          }
        }
      };

    // TypeScript 5.x
    if (info.languageServiceHost.resolveModuleNameLiterals) {
      const _resolveModuleNameLiterals =
        info.languageServiceHost.resolveModuleNameLiterals.bind(
          info.languageServiceHost,
        );

      languageServiceHost.resolveModuleNameLiterals = (
        moduleNames,
        containingFile,
        ...rest
      ) => {
        const resolvedModules = _resolveModuleNameLiterals(
          moduleNames,
          containingFile,
          ...rest,
        );

        const moduleResolver = createModuleResolver(containingFile);

        return moduleNames.map(({ text: moduleName }, index) => {
          try {
            const resolvedModule = moduleResolver(moduleName);
            if (resolvedModule) return { resolvedModule };
          } catch (e) {
            logger.error(e);
            return resolvedModules[index];
          }
          return resolvedModules[index];
        });
      };
    }
    // TypeScript 4.x
    else if (info.languageServiceHost.resolveModuleNames) {
      const _resolveModuleNames =
        info.languageServiceHost.resolveModuleNames.bind(
          info.languageServiceHost,
        );

      languageServiceHost.resolveModuleNames = (
        moduleNames,
        containingFile,
        ...rest
      ) => {
        const resolvedModules = _resolveModuleNames(
          moduleNames,
          containingFile,
          ...rest,
        );

        const moduleResolver = createModuleResolver(containingFile);

        return moduleNames.map((moduleName, index) => {
          try {
            const resolvedModule = moduleResolver(moduleName);
            if (resolvedModule) return resolvedModule;
          } catch (e) {
            logger.error(e);
            return resolvedModules[index];
          }
          return resolvedModules[index];
        });
      };
    }

    return languageService;
  }

  function getExternalFiles(
    project: tsModule.server.ConfiguredProject,
  ): string[] {
    return project.getFileNames().filter(_isCSS);
  }

  return { create, getExternalFiles };
};

export = init;
