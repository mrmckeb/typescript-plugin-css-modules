# typescript-plugin-css-modules

[![npm](https://img.shields.io/npm/v/typescript-plugin-css-modules)](https://www.npmjs.com/package/typescript-plugin-css-modules)
[![npm](https://img.shields.io/npm/dw/typescript-plugin-css-modules)](https://www.npmjs.com/package/typescript-plugin-css-modules)
[![license](https://img.shields.io/npm/l/typescript-plugin-css-modules)](https://github.com/mrmckeb/typescript-plugin-css-modules/blob/develop/LICENSE)

A [TypeScript language service plugin](https://github.com/Microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin)
for [CSS Modules](https://github.com/css-modules/css-modules).

<img src="https://raw.githubusercontent.com/mrmckeb/typescript-plugin-css-modules/main/.github/images/example.gif" alt="typescript-plugin-css-modules example" />

## Table of contents

- [typescript-plugin-css-modules](#typescript-plugin-css-modules)
  - [Table of contents](#about-this-plugin)
  - [About this plugin](#table-of-contents)
  - [Installation](#installation)
    - [Importing CSS](#importing-css)
    - [Options](#options)
      - [`classnameTransform`](#classnametransform)
      - [`customRenderer`](#customrenderer)
      - [`customTemplate`](#customtemplate)
      - [`postcssOptions`](#postcssoptions)
      - [`rendererOptions`](#rendereroptions)
    - [Visual Studio Code](#visual-studio-code)
      - [Recommended usage](#recommended-usage)
      - [Alternative usage](#alternative-usage)
    - [Custom definitions](#custom-definitions)
  - [Troubleshooting](#troubleshooting)
  - [About this project](#about-this-project)

## About this plugin

This plugin provides type information to IDEs and any other tools that work with [TypeScript language service plugins](https://github.com/microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin#whats-a-language-service-plugin).

At this time, TypeScript does not support plugins during compilation. This means that this plugin cannot:

- provide errors during compilation, or
- add CSS module support to your project.

For more information, and/or to add support for this feature, see: https://github.com/microsoft/TypeScript/issues/16607.

If you need a different solution, these projects might help:

- For Jest support, see https://www.npmjs.com/package/jest-css-modules-transform (one of a few options).
- For Webpack configuration, see https://webpack.js.org/loaders/css-loader/#pure-css-css-modules-and-postcss for an example.

## Installation

To install with Yarn:

```sh
yarn add -D typescript-plugin-css-modules
```

To install with npm:

```sh
npm install -D typescript-plugin-css-modules
```

Once installed, add this plugin to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [{ "name": "typescript-plugin-css-modules" }]
  }
}
```

If you're using Visual Studio Code, please also follow these [instructions](#visual-studio-code).

As Webpack configurations vary, you may need to provide additional [options](#options) to this plugin to match your project configuration. For Create React App users, this plugin will work without additional configuration.

### Importing CSS

A default export is always provided for your CSS module.

```tsx
import styles from 'my.module.css';

const a = styles.myClass;
const b = styles['my_other-class'];
```

As of version 1.1.0, you can also use named exports for classes that don't contain hyphens or underscores. You can still access other classes via the default export.

```tsx
import styles, { myClass } from 'my.module.css';

const a = myClass;
const b = styles['my_other-class'];
```

### Options

Please note that no options are required. However, depending on your configuration, you may need to customise these options.

| Option                     | Default value                              | Description                                                                                                                                  |
| -------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `additionalData`           | `undefined`                                | An optional string to append to the top of source files.                                                                                     |
| `allowUnknownClassnames`   | `false`                                    | Disables TypeScript warnings on unknown classnames (for default imports only).                                                               |
| `classnameTransform`       | `"asIs"`                                   | See [`classnameTransform`](#classnameTransform) below.                                                                                       |
| `customMatcher`            | `"\\.module\\.((c\|le\|sa\|sc)ss\|styl)$"` | Changes the file extensions that this plugin processes.                                                                                      |
| `customRenderer`           | `false`                                    | See [`customRenderer`](#customRenderer) below.                                                                                               |
| `customTemplate`           | `false`                                    | See [`customTemplate`](#customTemplate) below.                                                                                               |
| `goToDefinition`           | `false`                                    | Enables jump to definition. See [`goToDefinition`](#goToDefinition) below.                                                                   |
| `noUncheckedIndexedAccess` | `false`                                    | Enable for compatibility with TypeScript's `noUncheckedIndexedAccess`.                                                                       |
| `namedExports`             | `true`                                     | Enables named exports for compatible classnames.                                                                                             |
| `dotenvOptions`            | `{}`                                       | Provides options for [`dotenv`](https://github.com/motdotla/dotenv#options). Note that this plugin only accepts a `string` value for `path`. |
| `postcssOptions`           | `{}`                                       | See [`postcssOptions`](#postcssOptions) below.                                                                                               |
| `rendererOptions`          | `{}`                                       | See [`rendererOptions`](#rendererOptions) below.                                                                                             |

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typescript-plugin-css-modules",
        "options": {
          "classnameTransform": "dashes",
          "customMatcher": "\\.m\\.css$",
          "customRenderer": "./myRenderer.js",
          "dotenvOptions": {},
          "postcssOptions": {},
          "rendererOptions": {}
        }
      }
    ]
  }
}
```

#### `classnameTransform`

Implements the behaviour of the [`localsConvention`](https://github.com/webpack-contrib/css-loader#localsconvention) `css-loader` option.

Options available are: `'asIs'`, `'camelCase'`, `'camelCaseOnly'`, `'dashes'`, and `'dashesOnly'`.

#### `customRenderer`

The `customRenderer` is an advanced option, letting you provide the CSS renderer.

When a custom renderer is provided, not other renderers will be used.

The path to the `customRenderer` must be relative to the project root (i.e. `./myRenderer.js`).

The custom renderer itself should be a JavaScript file. The function will be called with three arguments: a `css` string, an `options` object (see [`options.ts`](https://github.com/mrmckeb/typescript-plugin-css-modules/blob/main/src/options.ts#L22-L34)), and a `compilerOptions` object - which contains options as set in your `tsconfig.json`. It must be synchronous, and must return valid CSS.

```js
module.exports = (css, { fileName, logger }) => {
  try {
    // ...process your css here.

    // `string`
    return renderedCss;
  } catch (error) {
    logger.error(error.message);
  }
};
```

If you want to return a a source map, you can return an object from your exported function.

```js
module.exports = (css, { fileName, logger }) => {
  try {
    // ...process your css here.

    return {
      // `string`
      css: renderedCss,
      // `RawSourceMap`
      sourceMap: sourceMap,
    };
  } catch (error) {
    logger.error(error.message);
  }
};
```

You can find an example custom renderer in our test fixtures ([`customRenderer.js`](https://github.com/mrmckeb/typescript-plugin-css-modules/blob/main/src/helpers/__tests__/fixtures/customRenderer.js)).

The [internal `logger`](https://github.com/mrmckeb/typescript-plugin-css-modules/blob/main/src/helpers/logger.ts) is provided for [debugging](#troubleshooting).

> If you use Webpack, note that tilde (`~`) imports not supported by Less and Sass natively.
>
> For Sass users: A custom importer has been implemented to resolve this as of v3.
>
> For Less users: This package exports a customRenderer that enables tilde imports: [`less-plugin-aliases`](https://github.com/dancon/less-plugin-aliases).

#### `customTemplate`

The `customTemplate` is an advanced option, letting you provide a template for the generated TypeScript declarations.

When a custom template is provided, its output is used as the virtual declaration (`*.d.ts`) file.

The path to the `customTemplate` must be relative to the project root (i.e. `./customTemplate.js`).

The custom renderer itself should be a JavaScript file. The function will be called with two arguments: a `dts` string, and an `options` object (see [`options.ts`](https://github.com/mrmckeb/typescript-plugin-css-modules/blob/main/src/options.ts#L43-L52)). It must be synchronous, and must return a valid TypeScript declaration (as found in a `.d.ts` file).

```js
module.exports = (dts, { classes, fileName, logger }) => {
  try {
    // ...generate your template here.
    return customTemplate;
  } catch (error) {
    logger.error(error.message);
  }
};
```

You can find an example custom template in our test fixtures ([`customTemplate.js`](https://github.com/mrmckeb/typescript-plugin-css-modules/blob/main/src/helpers/__tests__/fixtures/customTemplate.js)).

The [internal `logger`](https://github.com/mrmckeb/typescript-plugin-css-modules/blob/main/src/helpers/logger.ts) is provided for [debugging](#troubleshooting).

The `classes` object represents all the classnames extracted from the CSS Module. They are available if you want to add a custom representation of the CSS classes.

#### `goToDefinition`

This allows an editor like Visual Studio Code to go to a classname's definition (file and line).

This is experimental, and may not always work as expected. It currently supports CSS/PostCSS, Less, and Sass. Please raise an issue if you find something isn't working.

#### `postcssOptions`

| Option           | Default value | Description                                                                                                               |
| ---------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `useConfig`      | `false`       | Set to `true` to load plugins from your [PostCSS config](https://github.com/michael-ciniawsky/postcss-load-config#usage). |
| `excludePlugins` | `false`       | Only sync plugins are supported. Use this to set an array of async plugins to exclude (i.e. `['postcss-mixins']`)         |

#### `rendererOptions`

| Option   | Default value | Description                                                                          |
| -------- | ------------- | ------------------------------------------------------------------------------------ |
| `less`   | `{}`          | Set [renderer options for Less](http://lesscss.org/usage/#less-options).             |
| `sass`   | `{}`          | Set [renderer options for Sass](https://sass-lang.com/documentation/js-api#options). |
| `stylus` | `{}`          | Set [renderer options for Stylus](https://stylus.bootcss.com/docs/js.html).          |

> For convenience, `loadPaths` for Sass are extended, not replaced. The defaults are the path of the current file, and `'node_modules'`.

### Visual Studio Code

#### Recommended usage

To use this plugin with Visual Studio Code, you should set your workspace's version of TypeScript, which will load plugins from your `tsconfig.json` file.

For instructions, see: [Using the workspace version of TypeScript](https://code.visualstudio.com/docs/typescript/typescript-compiling#_using-the-workspace-version-of-typescript).

#### Alternative usage

If you aren't using any [plugin options](#options), you can simple add this plugin to `"typescript.tsserver.pluginPaths"` in settings. You cannot provide plugin options with this approach.

```json
{
  "typescript.tsserver.pluginPaths": ["typescript-plugin-css-modules"]
}
```

### Custom definitions

_Note: Create React App users can skip this section if you're using `react-scripts@2.1.x` or higher._

If your project doesn't already have global declarations for CSS Modules, you will need to add these to help TypeScript understand the general shape of the imported CSS during build.

Where you store global declarations is up to you. An example might look like: `./src/custom.d.ts`.

The below is an example that you can copy or modify (you only declarations for exensions used in your project). If you use a `customMatcher`, you'll need to modify this.

```ts
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.sass' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.less' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.styl' {
  const classes: { [key: string]: string };
  export default classes;
}
```

## Troubleshooting

For troubleshooting and debugging, you can view the TypeScript Server Log in Visual Studio Code by entering `Typescript: Open TS Server log` in the [command palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette).

If you're not using Visual Studio Code or are having trouble with the above method, you can set the [`TSS_LOG` environment variable](https://github.com/Microsoft/TypeScript/wiki/Standalone-Server-%28tsserver%29#logging).

You can include these logs with any issues you open for this project.

### Disabling the plugin

If you need to temporarily disable this plugin, or disable it for a single user, you can do that by setting the `DISABLE_TS_PLUGIN_CSS_MODULES` environment variable to any value, and then restarting your IDE.

Note that this doesn't actually disable the plugin, but causes it to bail out early. See PR #244 for more information.

## About this project

This project was inspired by a Create React App [issue](https://github.com/facebook/create-react-app/issues/5677)
and built on prior work from [`css-module-types`](https://github.com/timothykang/css-module-types).
