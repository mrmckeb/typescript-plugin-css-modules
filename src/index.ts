import * as fs from 'fs';
import * as path from 'path';
import * as ts_module from 'typescript/lib/tsserverlibrary';
import { createMatchers } from './helpers/createMatchers';
import { isCSSFn } from './helpers/cssExtensions';
import { getDtsSnapshot } from './helpers/cssSnapshots';
import { Options } from './options';

function init({ typescript: ts }: { typescript: typeof ts_module }) {
  let _isCSS: isCSSFn;
  function create(info: ts.server.PluginCreateInfo) {
    // User options for plugin.
    const options: Options = info.config.options || {};

    // Create matchers using options object.
    const { isCSS, isRelativeCSS } = createMatchers(options);
    _isCSS = isCSS;

    // Creates new virtual source files for the CSS modules.
    const _createLanguageServiceSourceFile = ts.createLanguageServiceSourceFile;
    ts.createLanguageServiceSourceFile = (
      fileName,
      scriptSnapshot,
      ...rest
    ): ts.SourceFile => {
      if (isCSS(fileName)) {
        scriptSnapshot = getDtsSnapshot(ts, fileName, scriptSnapshot, options);
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
        scriptSnapshot = getDtsSnapshot(
          ts,
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
        reusedNames,
      ) => {
        const resolvedModules = _resolveModuleNames(
          moduleNames,
          containingFile,
          reusedNames,
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
            return resolvedModules[index];
          }
          return resolvedModules[index];
        });
      };
    }

    return info.languageService;
  }

  function getExternalFiles(project: ts_module.server.ConfiguredProject) {
    return project.getFileNames().filter(_isCSS);
  }

  return { create, getExternalFiles };
}

export = init;
