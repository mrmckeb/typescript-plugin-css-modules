declare module 'postcss-icss-keyframes' {
  import { Plugin } from 'postcss';
  const plugin: Plugin<{
    generateScopeName: (
      keyframesName: string,
      filepath: string,
      css: string,
    ) => void;
  }>;
  export = plugin;
}
