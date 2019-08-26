import { readFileSync } from 'fs';
import { IICSSExports } from 'icss-utils';
import { join } from 'path';
import { DtsSnapshotCreator } from '../DtsSnapshotCreator';

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
    let dtsSnapshotCreator: DtsSnapshotCreator;
    const fullFileName = join(__dirname, 'fixtures', fileName);
    const testFile = readFileSync(fullFileName, 'utf8');

    beforeAll(() => {
      dtsSnapshotCreator = new DtsSnapshotCreator({
        log: jest.fn(),
        error: jest.fn(),
      });
      classes = dtsSnapshotCreator.getClasses(testFile, fullFileName);
    });

    describe(`with file '${fileName}'`, () => {
      describe('getClasses', () => {
        it('should return an object matching expected CSS', () => {
          expect(classes).toMatchSnapshot();
        });
      });

      describe('createExports', () => {
        it('should create an exports file', () => {
          const exports = dtsSnapshotCreator.createExports(classes, {});
          expect(exports).toMatchSnapshot();
        });
      });
    });
  });
});
