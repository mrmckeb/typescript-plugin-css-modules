declare module 'postcss-icss-selectors' {
  import { Plugin } from 'postcss';
  const plugin: Plugin<{ mode: 'local' | 'global' }>;
  export = plugin;
}
