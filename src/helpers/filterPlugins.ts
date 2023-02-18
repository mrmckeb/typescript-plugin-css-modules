import { type AcceptedPlugin } from 'postcss';

interface FilterPluginsOptions {
  plugins: AcceptedPlugin[];
  exclude?: string[];
}

export const filterPlugins = ({ plugins, exclude }: FilterPluginsOptions) =>
  plugins.filter(
    (plugin) =>
      'postcssPlugin' in plugin && !exclude.includes(plugin.postcssPlugin),
  );
