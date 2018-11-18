import { readFileSync } from 'fs';
import { IICSSExports } from 'icss-utils';
import { join } from 'path';
import { createExports, getClasses } from '../cssSnapshots';

describe('utils / cssSnapshots', () => {
  let classesA: IICSSExports;
  let classesB: IICSSExports;

  beforeAll(() => {
    const testFileA = readFileSync(
      join(__dirname, 'fixtures/testA.module.css'),
      'utf8',
    );
    const testFileB = readFileSync(
      join(__dirname, 'fixtures/testB.module.scss'),
      'utf8',
    );
    classesA = getClasses(testFileA);
    classesB = getClasses(testFileB);
  });

  describe('getClasses', () => {
    it('should return an object matching expected CSS classes', () => {
      expect(classesA).toEqual({
        ClassB: 'file__ClassB---2bPVi',
        childA: 'file__childA---1hjQD',
        childB: 'file__childB---pq4Ks',
        'class-c': 'file__class-c---DZ1TD',
        classA: 'file__classA---2xcnJ',
        nestedChild: 'file__nestedChild---2d15b',
        parent: 'file__parent---1ATMj',
      });
      expect(classesB).toEqual({
        'local-class': 'file__local-class---3KegX',
        'local-class-2': 'file__local-class-2---2h6qz',
        'local-class-inside-global': 'file__local-class-inside-global---2xH_Y',
        'local-class-inside-local': 'file__local-class-inside-local---QdL6b',
      });
    });
  });

  describe('createExports', () => {
    it('should create an exports file', () => {
      const exportsA = createExports(classesA, {});
      const exportsB = createExports(classesB, {});
      expect(exportsA).toMatchSnapshot();
      expect(exportsB).toMatchSnapshot();
    });
  });
});
