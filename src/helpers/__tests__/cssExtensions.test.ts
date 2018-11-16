import { isCSS, isRelativeCSS } from '../cssExtensions';

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
});
