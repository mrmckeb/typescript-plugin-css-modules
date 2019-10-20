import { Options as SassOptions } from 'sass';

export interface Options {
  camelCase?: CamelCaseOptions;
  customMatcher?: string;
  renderOptions?: {
    less?: Partial<Less.Options>;
    scss?: Partial<SassOptions>;
  };
}

export type CamelCaseOptions =
  | true
  | 'dashes'
  | 'dashesOnly'
  | 'only'
  | undefined;
