import { transformClasses } from '../classTransforms';

describe('utils / classTransforms', () => {
  const classNames = [
    'class-name-a',
    'classNameB',
    'class-Name-C',
    '__class_nAmeD--',
  ];
  const tests: CamelCaseOptions[] = [true, 'dashes', 'dashesOnly', 'only'];

  it(`should not transform classes when no option is set`, () => {
    const transformer = transformClasses();
    const transformedClasses = classNames.map(transformer);
    expect(transformedClasses).toMatchSnapshot();
  });

  tests.forEach((option) => {
    it(`should transform classes correctly when \`camelCase\` set to \`${option}\``, () => {
      const transformer = transformClasses(option);
      const transformedClasses = classNames.map(transformer);
      expect(transformedClasses).toMatchSnapshot();
    });
  });
});
