# typescript-plugin-css-modules

[![npm](https://img.shields.io/npm/v/typescript-plugin-css-modules)](https://www.npmjs.com/package/typescript-plugin-css-modules)
[![npm](https://img.shields.io/npm/dw/typescript-plugin-css-modules)](https://www.npmjs.com/package/typescript-plugin-css-modules)
[![license](https://img.shields.io/npm/l/typescript-plugin-css-modules)](https://github.com/mrmckeb/typescript-plugin-css-modules/blob/develop/LICENSE)

A [TypeScript language service plugin](https://github.com/Microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin)
for [CSS Modules](https://github.com/css-modules/css-modules).

<img src="https://raw.githubusercontent.com/mrmckeb/typescript-plugin-css-modules/master/.github/images/example.gif" alt="typescript-plugin-css-modules example" />

## Table of contents

- [Installation](#installation)
  - [Importing CSS](#importing-css)
  - [Options](#options)
  - [Visual Studio Code](#visual-studio-code)
  - [Custom definitions](#custom-definitions)
- [Troubleshooting](#troubleshooting)
- [About this project](#about-this-project)

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

| Option               | Default value                      | Description                                                                  |
| -------------------- | ---------------------------------- | ---------------------------------------------------------------------------- |
| `classnameTransform` | `asIs`                             | See [`classnameTransform`](#classnameTransform) below.                       |
| `customMatcher`      | `"\\.module\\.(c\|le\|sa\|sc)ss$"` | Changes the file extensions that this plugin processes.                      |
| `customRenderer`     | `false`                            | See [`customRenderer`](#customRenderer) below.                               |
| `dotenvOptions`      | `{}`                               | Provides options for [`dotenv`](https://github.com/motdotla/dotenv#options). |
| `postCssOptions`     | `{}`                               | See [`postCssOptions`](#postCssOptions) below.                               |
| `rendererOptions`    | `{}`                               | See [`rendererOptions`](#rendererOptions) below.                             |

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
          "postCssOptions": {},
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

The custom renderer itself should be a JavaScript file. The function will be called with two arguments: a `css` string, and an `options` object (see [`options.ts`](https://github.com/mrmckeb/typescript-plugin-css-modules/blob/master/src/options.ts#L36-L39)). It must be synchronous, and must return valid CSS.

```js
module.exports = (css, { fileName, logger }) => {
  try {
    // ...process css here
    return renderedCss;
  } catch (error) {
    logger.error(error.message);
  }
};
```

You can find an example custom renderer in our test fixtures ([`customRenderer.js`](https://github.com/mrmckeb/typescript-plugin-css-modules/blob/master/src/helpers/__tests__/fixtures/customRenderer.js)).

The [internal `logger`](https://github.com/mrmckeb/typescript-plugin-css-modules/blob/master/src/helpers/logger.ts) is provided for [debugging](#troubleshooting).

#### `postCssOptions`

| Option           | Default value | Description                                                                                                               |
| ---------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `useConfig`      | `false`       | Set to `true` to load plugins from your [PostCSS config](https://github.com/michael-ciniawsky/postcss-load-config#usage). |
| `excludePlugins` | `false`       | Only sync plugins are supported. Use this to set an array of async plugins to exclude (i.e. `['postcss-mixins']`)         |

#### `rendererOptions`

| Option | Default value | Description                                                                          |
| ------ | ------------- | ------------------------------------------------------------------------------------ |
| `less` | `{}`          | Set [renderer options for Less](http://lesscss.org/usage/#less-options).             |
| `sass` | `{}`          | Set [renderer options for Sass](https://sass-lang.com/documentation/js-api#options). |

> For convenience, `includePaths` for Sass are extended, not replaced. The defaults are the path of the current file, and `'node_modules'`.

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

The below is an example that you can copy or modify. If you use a [`customMatcher`], you'll need to modify this.

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
```

## Troubleshooting

For troubleshooting and debugging, you can view the TypeScript Server Log in Visual Studio Code by entering `Typescript: Open TS Server log` in the [command palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette).

If you're not using Visual Studio Code or are having trouble with the above method, you can set the [`TSS_LOG` environment variable](https://github.com/Microsoft/TypeScript/wiki/Standalone-Server-%28tsserver%29#logging).

You can include these logs with any issues you open for this project.

## About this project

This project was inspired by a Create React App [issue](https://github.com/facebook/create-react-app/issues/5677)
and built on prior work from [`css-module-types`](https://github.com/timothykang/css-module-types).
