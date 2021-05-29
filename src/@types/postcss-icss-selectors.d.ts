declare module 'postcss-icss-selectors' {
  import { PluginCreator } from 'postcss';
  const plugin: PluginCreator<{ mode: 'local' | 'global' }>;
  export = plugin;
}
