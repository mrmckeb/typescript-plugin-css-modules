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

    info.project.projectService.logger.info(`******** isCSS: ${isCSS}`);

    // Creates new virtual source files for the CSS modules.
    const _createLanguageServiceSourceFile = ts.createLanguageServiceSourceFile;
    ts.createLanguageServiceSourceFile = (
      fileName,
      scriptSnapshot,
      ...rest
    ): ts.SourceFile => {
      if (isCSS(fileName)) {
        scriptSnapshot = getDtsSnapshot(ts, scriptSnapshot, options);
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
        scriptSnapshot = getDtsSnapshot(ts, scriptSnapshot, options);
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
          if (isRelativeCSS(moduleName)) {
            return {
              extension: ts_module.Extension.Dts,
              isExternalLibraryImport: false,
              resolvedFileName: path.resolve(
                path.dirname(containingFile),
                moduleName,
              ),
            };
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
