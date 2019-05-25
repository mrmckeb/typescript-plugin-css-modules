# typescript-plugin-css-modules

[![CircleCI branch](https://img.shields.io/circleci/project/github/mrmckeb/typescript-plugin-css-modules/master.svg)](https://circleci.com/gh/mrmckeb/typescript-plugin-css-modules)
[![npm](https://img.shields.io/npm/v/typescript-plugin-css-modules.svg)](https://www.npmjs.com/package/typescript-plugin-css-modules)
[![license](https://img.shields.io/npm/l/typescript-plugin-css-modules.svg)](https://github.com/mrmckeb/typescript-plugin-css-modules/blob/develop/LICENSE)

A [TypeScript language service plugin](https://github.com/Microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin)
for [CSS Modules](https://github.com/css-modules/css-modules).

<img src="https://raw.githubusercontent.com/mrmckeb/typescript-plugin-css-modules/master/.github/images/example.gif" alt="typescript-plugin-css-modules example" />

This project was inspired by this [`create-react-app` issue](https://github.com/facebook/create-react-app/issues/5677)
and was based on [`css-module-types`](https://github.com/timothykang/css-module-types).

## Installation

To install with Yarn:

```sh
yarn add typescript-plugin-css-modules
```

To install with npm:

```sh
npm install --save typescript-plugin-css-modules
```

## Adding the plugin

Once installed, add this plugin to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [{ "name": "typescript-plugin-css-modules" }]
  }
}
```

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

| Option          | Default value                      | Description                                                                                                                                           |
| --------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `customMatcher` | `"\\.module\\.(c\|le\|sa\|sc)ss$"` | Change the file extensions that this plugin works with.                                                                                               |
| `camelCase`     | `false`                            | Implements the behaviour of the [`camelCase` CSS Loader option](https://github.com/webpack-contrib/css-loader#camelcase) (accepting the same values). |

The below is an example that only matches "\*.m.css" files, and [camel-cases dashes](https://github.com/webpack-contrib/css-loader#camelcase).

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typescript-plugin-css-modules",
        "options": {
          "customMatcher": "\\.m\\.css$",
          "camelCase": "dashes"
        }
      }
    ]
  }
}
```

### Visual Studio Code

By default, VSCode will use it's own version of TypeScript. To make it work with this plugin, you have two options:

1. Use your workspace's version of TypeScript, which will load plugins from your `tsconfig.json` file. This is the recommended approach. For instructions, see: [Using the workspace version of TypeScript](https://code.visualstudio.com/docs/languages/typescript#_using-the-workspace-version-of-typescript).

2. Add this plugin to `"typescript.tsserver.pluginPaths"` in settings. Note that this method doesn't currently support plugin options.

```json
{
  "typescript.tsserver.pluginPaths": ["typescript-plugin-css-modules"]
}
```

### Custom definitions

_Note: Create React App users can skip this section if you're using `react-scripts@2.1.x` or higher._

If your project doesn't already have global declarations for CSS Modules, you will need to add these to help TypeScript understand the general shape of the imported CSS during build.

Where you store global declarations is up to you. An example might look like: `src/custom.d.ts`.

The below is an example that you can copy or modify. If you use a `customMatcher`, you'll need to modify it.

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
