import postcssPresetEnv from 'postcss-preset-env';
import postcssModulesScope from 'postcss-modules-scope';
import { filterPlugins } from '../filterPlugins';

describe('helpers / filterPlugins', () => {
  describe('filterPlugins', () => {
    it('should filter plugins by name', () => {
      const plugins = [postcssPresetEnv(), postcssModulesScope()];
      expect(filterPlugins({ plugins, exclude: [] })).toHaveLength(2);
      expect(
        filterPlugins({ plugins, exclude: ['postcss-preset-env'] }),
      ).toHaveLength(1);
      expect(
        filterPlugins({
          plugins,
          exclude: ['postcss-preset-env', 'postcss-modules-scope'],
        }),
      ).toHaveLength(0);
    });
  });
});
