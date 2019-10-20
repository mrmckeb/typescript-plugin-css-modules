import { Options as SassOptions } from 'sass';
import { DotenvConfigOptions } from 'dotenv/types';
import { Logger } from './helpers/logger';

export interface PostCssOptions {
  excludePlugins?: string[];
  useConfig?: boolean;
}

export interface RendererOptions {
  less?: Partial<Less.Options>;
  sass?: Partial<SassOptions>;
}

export interface Options {
  classnameTransform?: ClassnameTransformOptions;
  customMatcher?: string;
  customRenderer?: string;
  dotenvOptions?: DotenvConfigOptions;
  postCssOptions?: PostCssOptions;
  rendererOptions?: RendererOptions;
}

export type ClassnameTransformOptions =
  | 'asIs'
  | 'camelCase'
  | 'camelCaseOnly'
  | 'dashes'
  | 'dashesOnly';

export interface CustomRendererOptions {
  fileName: string;
  logger: Logger;
}

export type CustomRenderer = (
  css: string,
  options: CustomRendererOptions,
) => string;
