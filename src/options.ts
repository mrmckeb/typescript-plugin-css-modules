export interface Options {
  camelCase?: CamelCaseOptions;
  customMatcher?: string;
}

export type CamelCaseOptions =
  | true
  | 'dashes'
  | 'dashesOnly'
  | 'only'
  | undefined;
