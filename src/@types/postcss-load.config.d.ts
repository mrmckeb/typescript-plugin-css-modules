declare module 'postcss-load-config' {
  export interface PostCSSConfig {
    plugins: any[];
    options?: any;
  }

  interface Load {
    (context: object, path?: string, options?: object): Promise<PostCSSConfig>;
    sync(context: object, path?: string, options?: object): PostCSSConfig;
  }

  const load: Load;

  export default load;
}
