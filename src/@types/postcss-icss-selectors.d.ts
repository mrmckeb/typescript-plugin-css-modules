declare module 'postcss-icss-selectors' {
  import { PluginCreator } from 'postcss';
  const plugin: PluginCreator<{
    generateScopedName?(
      localName: string,
      filepath: string,
      css: string,
    ): string;
    mode?: 'local' | 'global';
  }>;
  export = plugin;
}
