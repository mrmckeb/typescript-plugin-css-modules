import { createMatchers } from '../createMatchers';
import { Options } from '../../options';

describe('utils / createMatchers', () => {
  it('should match `customMatcher` regexp', () => {
    const options: Options = { customMatcher: '\\.css$' };
    const { isCSS, isRelativeCSS } = createMatchers(options);

    expect(isCSS('./myfile.css')).toBe(true);
    expect(isCSS('./myfile.m.css')).toBe(true);
    expect(isCSS('./myfile.scss')).toBe(false);
    expect(isRelativeCSS('../folder/myfile.css')).toBe(true);
    expect(isRelativeCSS('../folder/myfile.m.css')).toBe(true);
    expect(isRelativeCSS('../folders/myfile.scss')).toBe(false);
  });

  it('should handle bad `customMatcher` regexp', () => {
    const options: Options = { customMatcher: '$([a' };
    const { isCSS, isRelativeCSS } = createMatchers(options);

    expect(isCSS('./myfile.module.css')).toBe(true);
    expect(isRelativeCSS('../folders/myfile.module.scss')).toBe(true);
  });
});
