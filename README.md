# typescript-plugin-css-modules

A [TypeScript language service plugin](https://github.com/Microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin)
for [CSS Modules](https://github.com/css-modules/css-modules).

This project was inspired by this [`create-react-app` issue](https://github.com/facebook/create-react-app/issues/5677)
and is heavily based on [`css-module-types`](https://github.com/timothykang/css-module-types).

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

You can also pass in your own file extension matcher (the default matcher is shown as an example):

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typescript-plugin-css-modules",
        "options": {
          "customMatcher": "\\.module\\.(sa|sc|c)ss$"
        }
      }
    ]
  }
}
```

### Custom definitions

Depending on your project configuration, you may also need to declare modules. Where you store this is up to you. An
example might look like: `src/@types/custom.d.ts`.

The below is an example that you can modify if you use a `customMatcher`.

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
