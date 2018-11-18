import * as path from 'path';
import * as ts_module from 'typescript/lib/tsserverlibrary';
import { isCSS as _isCSS, isRelativeCSS } from './helpers/cssExtensions';
import { getDtsSnapshot } from './helpers/cssSnapshots';

function init({ typescript: ts }: { typescript: typeof ts_module }) {
  let isCSS = _isCSS;
  function create(info: ts.server.PluginCreateInfo) {
    // User options for plugin.
    const options: IOptions = info.config.options || {};

    // Allow custom matchers to be used, handling bad matcher patterns;
    try {
      const { customMatcher } = options;
      if (customMatcher) {
        isCSS = (fileName) => new RegExp(customMatcher).test(fileName);
      }
    } catch (e) {
      // TODO: Provide error/warning to user.
    }

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
        const resolvedCSS: ts.ResolvedModuleFull[] = [];

        return _resolveModuleNames(
          moduleNames.filter((moduleName) => {
            if (isRelativeCSS(moduleName)) {
              resolvedCSS.push({
                extension: ts_module.Extension.Dts,
                resolvedFileName: path.resolve(
                  path.dirname(containingFile),
                  moduleName,
                ),
              });
              return false;
            }
            return true;
          }),
          containingFile,
          reusedNames,
        ).concat(resolvedCSS);
      };
    }

    return info.languageService;
  }

  function getExternalFiles(project: ts_module.server.ConfiguredProject) {
    return project.getFileNames().filter(isCSS);
  }

  return { create, getExternalFiles };
}

export = init;
