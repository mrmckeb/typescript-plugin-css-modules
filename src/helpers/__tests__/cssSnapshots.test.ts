import { readFileSync } from 'fs';
import { IICSSExports } from 'icss-utils';
import { join } from 'path';
import * as postcss from 'postcss';
import * as postcssIcssSelectors from 'postcss-icss-selectors';
import { createExports, getClasses } from '../cssSnapshots';

const testFileNames = [
  'test.module.css',
  'test.module.less',
  'test.module.scss',
  'empty.module.less',
  'empty.module.scss',
];

const processor = postcss([postcssIcssSelectors({ mode: 'local' })]);

describe('utils / cssSnapshots', () => {
  testFileNames.forEach((fileName) => {
    let classes: IICSSExports;
    const fullFileName = join(__dirname, 'fixtures', fileName);
    const testFile = readFileSync(fullFileName, 'utf8');

    beforeAll(() => {
      classes = getClasses(processor, testFile, fullFileName);
    });

    describe(`with file '${fileName}'`, () => {
      describe('getClasses', () => {
        it('should return an object matching expected CSS', () => {
          expect(classes).toMatchSnapshot();
        });
      });

      describe('createExports', () => {
        it('should create an exports file', () => {
          const exports = createExports(classes, {});
          expect(exports).toMatchSnapshot();
        });
      });
    });
  });
});
