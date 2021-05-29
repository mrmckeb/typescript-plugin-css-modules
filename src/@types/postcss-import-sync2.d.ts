declare module 'postcss-import-sync2' {
  import { PluginCreator } from 'postcss';
  const plugin: PluginCreator<unknown>;
  export = plugin;
}
