declare interface IOptions {
  camelCase?: CamelCaseOptions;
  customMatcher?: string;
}

declare type CamelCaseOptions =
  | true
  | 'dashes'
  | 'dashesOnly'
  | 'only'
  | undefined;
