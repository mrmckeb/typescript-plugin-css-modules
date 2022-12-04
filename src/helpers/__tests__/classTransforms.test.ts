import { transformClasses } from '../classTransforms';
import { ClassnameTransformOptions } from '../../options';

describe('utils / classTransforms', () => {
  const classnames = [
    'class-name-a',
    'classNameB',
    'class-Name-C',
    '__class_nAmeD--',
  ];
  const tests: ClassnameTransformOptions[] = [
    'camelCase',
    'camelCaseOnly',
    'dashes',
    'dashesOnly',
    'asIs',
  ];

  it('should not transform classes when no option is set', () => {
    const transformer = transformClasses();
    const transformedClasses = classnames.map(transformer);
    expect(transformedClasses).toMatchSnapshot();
  });

  tests.forEach((option) => {
    it(`should transform classes correctly when \`classnameTransform\` set to \`${option}\``, () => {
      const transformer = transformClasses(option);
      const transformedClasses = classnames.map(transformer);
      expect(transformedClasses).toMatchSnapshot();
    });
  });
});
