declare module 'icss-utils' {
  import { Root } from 'postcss';
  interface IICSSExports {
    [exportName: string]: string;
  }
  export const extractICSS: (
    css: Root,
    removeRules?: boolean,
  ) => {
    icssExports: IICSSExports;
  };
}
