# typescript-plugin-css-modules

[![license](https://img.shields.io/npm/l/typescript-plugin-css-modules.svg)](https://github.com/mrmckeb/typescript-plugin-css-modules/blob/develop/LICENSE)
[![npm](https://img.shields.io/npm/v/typescript-plugin-css-modules.svg)](https://www.npmjs.com/package/typescript-plugin-css-modules)

A [TypeScript language service plugin](https://github.com/Microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin)
for [CSS Modules](https://github.com/css-modules/css-modules).

<img src="https://raw.githubusercontent.com/mrmckeb/typescript-plugin-css-modules/master/docs/images/example.gif" alt="typescript-plugin-css-modules example" />

This project was inspired by this [`create-react-app` issue](https://github.com/facebook/create-react-app/issues/5677)
and is based on [`css-module-types`](https://github.com/timothykang/css-module-types).

## Usage

To install with Yarn:

```sh
yarn add typescript-plugin-css-modules
```

To install with npm:

```sh
npm install --save typescript-plugin-css-modules
```

Once installed, add this plugin to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [{ "name": "typescript-plugin-css-modules" }]
  }
}
```

### Options

| Option          | Default value                  | Description                                                                                                                                           |
| --------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `customMatcher` | `"\\.module\\.(sa\|sc\|c)ss$"` | Change the file extensions that this plugin works with.                                                                                               |
| `camelCase`     | `false`                        | Implements the behaviour of the [`camelCase` CSS Loader option](https://github.com/webpack-contrib/css-loader#camelcase) (accepting the same values). |

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

1. Add this plugin to `"typescript.tsserver.pluginPaths"` in settings. Note that this method doesn't currently support
   plugin options.

```json
{
  "typescript.tsserver.pluginPaths": ["typescript-plugin-css-modules"]
}
```

2. Use your workspace's version of TypeScript, which will load the plugins from your `tsconfig.json` file.
   ([instructions](https://code.visualstudio.com/docs/languages/typescript#_using-the-workspace-version-of-typescript)).

### Custom definitions

_Note: Create React App users can skip this section if you're using `react-scripts@2.1.x` or higher._

If your project doesn't already have global declarations for CSS Modules, you will need to add these to help TypeScript understand the general shape of the imported CSS.

Where you store global declarations is up to you. An example might look like: `src/custom.d.ts`.

The below is an example that you can copy, or modify if you use a `customMatcher`.

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
```
