import { name } from '../../package.json';

export interface Logger {
  log(msg: string): void;
  error(e: Error): void;
}

export class LanguageServiceLogger implements Logger {
  constructor(private readonly info: ts.server.PluginCreateInfo) {}

  public log(msg: string) {
    this.info.project.projectService.logger.info(`[${name}] ${msg}`);
  }

  public error(e: Error) {
    this.log(`Failed ${e.toString()}`);
    this.log(`Stack trace: ${e.stack}`);
  }
}
