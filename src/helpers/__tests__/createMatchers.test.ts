import { createMatchers } from '../createMatchers';
import { Options } from '../../options';
import { Logger } from '../logger';

describe('utils / createMatchers', () => {
  const logger: Logger = { log: jest.fn(), error: jest.fn() };
  it('should match `customMatcher` regexp', () => {
    const options: Options = { customMatcher: '\\.css$' };
    const { isCSS, isRelativeCSS } = createMatchers(logger, options);

    expect(isCSS('./myfile.css')).toBe(true);
    expect(isCSS('./myfile.m.css')).toBe(true);
    expect(isCSS('./myfile.scss')).toBe(false);
    expect(isRelativeCSS('../folder/myfile.css')).toBe(true);
    expect(isRelativeCSS('../folder/myfile.m.css')).toBe(true);
    expect(isRelativeCSS('../folders/myfile.scss')).toBe(false);
  });

  it('should handle bad `customMatcher` regexp', () => {
    const options: Options = { customMatcher: '$([a' };
    const { isCSS, isRelativeCSS } = createMatchers(logger, options);

    expect(isCSS('./myfile.module.css')).toBe(true);
    expect(isRelativeCSS('../folders/myfile.module.scss')).toBe(true);
  });
});
