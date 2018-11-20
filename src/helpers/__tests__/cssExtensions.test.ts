import {
  isCSS,
  isRelativeCSS,
  setExtensionsPattern,
  DEFAULT_EXTENSIONS_PATTERN,
} from '../cssExtensions';

describe('utils / cssExtensions', () => {
  describe('isCSS', () => {
    it('should match CSS module extensions', () => {
      expect(isCSS('./myfile.module.scss')).toBe(true);
      expect(isCSS('./myfile.module.sass')).toBe(true);
      expect(isCSS('./myfile.module.css')).toBe(true);
    });

    it('should not match non-CSS module extensions', () => {
      expect(isCSS('./myfile.module.s')).toBe(false);
      expect(isCSS('./myfile.scss')).toBe(false);
      expect(isCSS('./myfile.sass')).toBe(false);
      expect(isCSS('./myfile.css')).toBe(false);
    });
  });

  describe('isRelativeCSS', () => {
    it('should match relative CSS modules', () => {
      expect(isRelativeCSS('./myfile.module.css')).toBe(true);
      expect(isRelativeCSS('../folder/myfile.module.css')).toBe(true);
    });

    it('should not match non-relative CSS modules', () => {
      expect(isRelativeCSS('myfile.module.css')).toBe(false);
    });
  });

  describe('setExtensionsPattern', () => {
    afterEach(() => setExtensionsPattern(DEFAULT_EXTENSIONS_PATTERN));

    it('should overwrite default extensions pattern', () => {
      const pattern = new RegExp('\\.css$');
      setExtensionsPattern(pattern);

      expect(isCSS('./myfile.css')).toBe(true);
      expect(isCSS('./myfile.scss')).toBe(false);
      expect(isRelativeCSS('../folder/myfile.css')).toBe(true);
      expect(isRelativeCSS('../folders/myfile.scss')).toBe(false);
    });
  });
});
