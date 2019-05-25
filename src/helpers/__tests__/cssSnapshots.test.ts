import { readFileSync } from 'fs';
import { IICSSExports } from 'icss-utils';
import { join } from 'path';
import { createExports, getClasses, FileTypes } from '../cssSnapshots';

const testFileNames = [
  'test.module.css',
  'test.module.less',
  'test.module.scss',
  'empty.module.less',
  'empty.module.scss',
];

describe('utils / cssSnapshots', () => {
  testFileNames.forEach((filename) => {
    let classes: IICSSExports;
    const isLess = filename.includes('less');
    const fileType = isLess ? FileTypes.less : FileTypes.css;
    const testFile = readFileSync(
      join(__dirname, 'fixtures', filename),
      'utf8',
    );

    beforeAll(() => {
      classes = getClasses(testFile, fileType);
    });

    describe(`with file '${filename}'`, () => {
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
