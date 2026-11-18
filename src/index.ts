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
import { IScriptSnapshot } from 'typescript/lib/tsserverlibrary';

const getPostCssConfigPlugins = (directory: string) => {
  try {
    return postcssrc.sync({}, directory).plugins;
  } catch (error) {
    return [];
  }
};

type HostMethods = Pick<
  tsModule.LanguageServiceHost,
  | 'getScriptKind'
  | 'getScriptSnapshot'
  | 'resolveModuleNameLiterals'
  | 'resolveModuleNames'
  | 'getResolvedModuleWithFailedLookupLocationsFromCache'
>;

// tsserver can initialize the plugin again on the same host after a config edit.
const hostMethods = new WeakMap<
  tsModule.LanguageServiceHost,
  { original: HostMethods; overrides: HostMethods }
>();

const init: tsModule.server.PluginModuleFactory = ({ typescript: ts }) => {
  if (process.env.DISABLE_TS_PLUGIN_CSS_MODULES !== undefined) {
    return {
      create: (info: tsModule.server.PluginCreateInfo) => info.languageService,
    };
  }

  let _isCSS: isCSSFn;

  function create(
    info: tsModule.server.PluginCreateInfo,
  ): tsModule.LanguageService {
    const logger = createLogger(info);
    const directory = info.project.getCurrentDirectory();
    const compilerOptions = info.project.getCompilerOptions();
    const scriptSnapshotCache = new WeakMap<IScriptSnapshot, IScriptSnapshot>();

    // Keep the project's language service and its current program in sync.
    const host = info.languageServiceHost;
    let methods = hostMethods.get(host);
    if (!methods) {
      const original: HostMethods = {
        getScriptKind: host.getScriptKind?.bind(host),
        getScriptSnapshot: host.getScriptSnapshot.bind(host),
        resolveModuleNameLiterals: host.resolveModuleNameLiterals?.bind(host),
        resolveModuleNames: host.resolveModuleNames?.bind(host),
        getResolvedModuleWithFailedLookupLocationsFromCache:
          host.getResolvedModuleWithFailedLookupLocationsFromCache?.bind(host),
      };
      const overrides = { ...original };
      methods = { original, overrides };
      hostMethods.set(host, methods);
      host.getScriptKind = (fileName) =>
        overrides.getScriptKind?.(fileName) ?? ts.ScriptKind.Unknown;
      host.getScriptSnapshot = (fileName) =>
        overrides.getScriptSnapshot(fileName);
      if (original.resolveModuleNameLiterals) {
        const resolve = original.resolveModuleNameLiterals;
        host.resolveModuleNameLiterals = (...args) =>
          (overrides.resolveModuleNameLiterals ?? resolve)(...args);
      } else if (original.resolveModuleNames) {
        const resolve = original.resolveModuleNames;
        host.resolveModuleNames = (...args) =>
          (overrides.resolveModuleNames ?? resolve)(...args);
      }
    }
    const languageServiceHost = methods.overrides;
    const { getScriptKind, getScriptSnapshot, resolveModuleNameLiterals } =
      methods.original;

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
      if (!getScriptKind) {
        return ts.ScriptKind.Unknown;
      }
      if (isCSS(fileName)) {
        return ts.ScriptKind.TS;
      }
      return getScriptKind(fileName);
    };

    languageServiceHost.getScriptSnapshot = (fileName) => {
      const existingSnapshot = getScriptSnapshot(fileName);
      if (!isCSS(fileName) || !fs.existsSync(fileName)) return existingSnapshot;

      const cachedSnapshot =
        existingSnapshot && scriptSnapshotCache.get(existingSnapshot);
      if (cachedSnapshot && options.caching === 'always') {
        return cachedSnapshot;
      } else {
        const newSnapshot = getDtsSnapshot(
          ts,
          processor,
          fileName,
          options,
          logger,
          compilerOptions,
          directory,
        );
        if (existingSnapshot)
          scriptSnapshotCache.set(existingSnapshot, newSnapshot);
        return newSnapshot;
      }
    };

    const createModuleResolver =
      (containingFile: string) =>
      (
        moduleName: string,
        resolveModule: () =>
          tsModule.ResolvedModuleWithFailedLookupLocations | undefined,
      ): tsModule.ResolvedModuleFull | undefined => {
        if (isRelativeCSS(moduleName)) {
          return {
            extension: ts.Extension.Dts,
            isExternalLibraryImport: false,
            resolvedFileName: path.resolve(
              path.dirname(containingFile),
              moduleName,
            ),
          };
        }
        if (isCSS(moduleName)) {
          // TODO: Move this section to a separate file and add basic tests.
          // Attempts to locate the module using TypeScript's previous search paths. These include "baseUrl" and "paths".
          const resolvedModule = resolveModule();
          if (!resolvedModule) return;

          const baseUrl = info.project.getCompilerOptions().baseUrl;
          const match = '/index.ts';

          // An array of paths TypeScript searched for the module. All include .ts, .tsx, .d.ts, or .json extensions.
          // NOTE: TypeScript doesn't expose this in their interfaces, which is why the type is unknown.
          // https://github.com/microsoft/TypeScript/issues/28770
          const failedLocations: readonly string[] = (
            resolvedModule as unknown as {
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
    if (resolveModuleNameLiterals) {
      languageServiceHost.resolveModuleNameLiterals = (
        moduleNames,
        containingFile,
        ...rest
      ) => {
        const resolvedModules = resolveModuleNameLiterals(
          moduleNames,
          containingFile,
          ...rest,
        );

        const moduleResolver = createModuleResolver(containingFile);

        return moduleNames.map(({ text: moduleName }, index) => {
          try {
            const resolvedModule = moduleResolver(
              moduleName,
              () => resolvedModules[index],
            );
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
    else if (methods.original.resolveModuleNames) {
      const _resolveModuleNames = methods.original.resolveModuleNames;

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
            const resolvedModule = moduleResolver(moduleName, () =>
              languageServiceHost.getResolvedModuleWithFailedLookupLocationsFromCache?.(
                moduleName,
                containingFile,
              ),
            );
            if (resolvedModule) return resolvedModule;
          } catch (e) {
            logger.error(e);
            return resolvedModules[index];
          }
          return resolvedModules[index];
        });
      };
    }

    return info.languageService;
  }

  function getExternalFiles(
    project: tsModule.server.ConfiguredProject,
  ): string[] {
    return project.getFileNames().filter(_isCSS);
  }

  return { create, getExternalFiles };
};

export = init;
