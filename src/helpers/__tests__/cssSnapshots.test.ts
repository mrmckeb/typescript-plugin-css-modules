import { readFileSync } from 'fs';
import { IICSSExports } from 'icss-utils';
import { join } from 'path';
import { createExports, getClasses } from '../cssSnapshots';

const testFileNames = [
  'test.module.css',
  'test.module.scss',
  'empty.module.scss',
];

describe('utils / cssSnapshots', () => {
  testFileNames.map((filename) => {
    let classes: IICSSExports;
    const testFile = readFileSync(
      join(__dirname, 'fixtures', filename),
      'utf8',
    );

    beforeAll(() => {
      classes = getClasses(testFile);
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
