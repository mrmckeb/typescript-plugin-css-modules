declare module 'postcss-load-config' {
  interface PostCSSConfig {
    plugins: any[];
    options?: any;
  }

  interface Load {
    (context: object, path?: string, options?: object): Promise<PostCSSConfig>;
    sync(context: object, path?: string, options?: object): PostCSSConfig;
  }

  const load: Load;

  export = load;
}
