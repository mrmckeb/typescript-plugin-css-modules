import * as path from 'path';
import * as ts_module from 'typescript/lib/tsserverlibrary';
import { isCSS as _isCSS, isRelativeCSS } from './helpers/cssExtensions';
import { getDtsSnapshot } from './helpers/cssSnapshots';

interface IOptions {
  customMatcher?: string;
}

function init({ typescript: ts }: { typescript: typeof ts_module }) {
  let isCSS = _isCSS;
  function create(info: ts.server.PluginCreateInfo) {
    // Allow custom matchers to be used, handling bad matcher patterns;
    try {
      const { customMatcher }: IOptions = info.config.options || {};
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
        scriptSnapshot = getDtsSnapshot(ts, scriptSnapshot);
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
        scriptSnapshot = getDtsSnapshot(ts, scriptSnapshot);
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
