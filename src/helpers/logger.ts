export interface Logger {
  log: (message: string) => void;
  error: (error: Error) => void;
}

export const createLogger = (info: ts.server.PluginCreateInfo): Logger => {
  const log = (message: string) => {
    info.project.projectService.logger.info(
      `[typescript-plugin-css-modules] ${message}`,
    );
  };
  const error = (error: Error) => {
    log(`Failed ${error.toString()}`);
    log(`Stack trace: ${error.stack}`);
  };

  return {
    log,
    error,
  };
};
