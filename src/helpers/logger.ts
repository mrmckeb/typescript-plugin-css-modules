import { server } from 'typescript/lib/tsserverlibrary';

export interface Logger {
  log: (message: string) => void;
  error: (error: unknown) => void;
}

export const createLogger = (info: server.PluginCreateInfo): Logger => {
  const log = (message: string) => {
    info.project.projectService.logger.info(
      `[typescript-plugin-css-modules] ${message}`,
    );
  };
  const error = (error: unknown) => {
    log(`Failed with error: ${error as string}`);
  };

  return {
    log,
    error,
  };
};
