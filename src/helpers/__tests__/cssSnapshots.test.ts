import { readFileSync } from 'fs';
import { IICSSExports } from 'icss-utils';
import { join } from 'path';
import { createExports, getClasses, getFileType } from '../cssSnapshots';

const testFileNames = [
  'test.module.css',
  'test.module.less',
  'test.module.scss',
  'empty.module.less',
  'empty.module.scss',
];

describe('utils / cssSnapshots', () => {
  testFileNames.forEach((fileName) => {
    let classes: IICSSExports;
    const fullFileName = join(__dirname, 'fixtures', fileName);
    const testFile = readFileSync(fullFileName, 'utf8');

    beforeAll(() => {
      classes = getClasses(testFile, fullFileName);
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
