import { join } from 'path';
import { sassTildeImporter, resolveUrls } from '../sassTildeImporter';

const getAbsoluteFileUrl = (expected: string) =>
  `file://${join(process.cwd(), expected)}`;

describe('importers / sassTildeImporter', () => {
  it('should return null when not a tilde import', () => {
    expect(
      sassTildeImporter.findFileUrl('color.scss', {
        fromImport: true,
        containingUrl: null,
      }),
    ).toBeNull();
  });

  it('should return null when node module does not exist', () => {
    expect(
      sassTildeImporter.findFileUrl('~made_up_module/color.scss', {
        fromImport: true,
        containingUrl: null,
      }),
    ).toBeNull();
  });

  it('should resolve file from node_modules', () => {
    expect(
      sassTildeImporter
        .findFileUrl('~bootstrap/scss/bootstrap', {
          fromImport: true,
          containingUrl: null,
        })
        ?.toString(),
    ).toBe(getAbsoluteFileUrl('node_modules/bootstrap/scss/bootstrap.scss'));
  });

  it('should resolve sass partial from node_modules', () => {
    expect(
      sassTildeImporter
        .findFileUrl('~bootstrap/scss/_grid.scss', {
          fromImport: true,
          containingUrl: null,
        })
        ?.toString(),
    ).toBe(getAbsoluteFileUrl('node_modules/bootstrap/scss/_grid.scss'));
    expect(
      sassTildeImporter
        .findFileUrl('~bootstrap/scss/_grid', {
          fromImport: true,
          containingUrl: null,
        })
        ?.toString(),
    ).toBe(getAbsoluteFileUrl('node_modules/bootstrap/scss/_grid.scss'));
    // implicit
    expect(
      sassTildeImporter
        .findFileUrl('~bootstrap/scss/grid.scss', {
          fromImport: true,
          containingUrl: null,
        })
        ?.toString(),
    ).toBe(getAbsoluteFileUrl('node_modules/bootstrap/scss/_grid.scss'));
    expect(
      sassTildeImporter
        .findFileUrl('~bootstrap/scss/grid', {
          fromImport: true,
          containingUrl: null,
        })
        ?.toString(),
    ).toBe(getAbsoluteFileUrl('node_modules/bootstrap/scss/_grid.scss'));
    expect(resolveUrls('~sass-mq/mq.scss')).toContain(
      'node_modules/sass-mq/_mq.scss',
    );
    expect(resolveUrls('~sass-mq/mq')).toContain(
      'node_modules/sass-mq/_mq.scss',
    );
  });

  it('should resolve index files', () => {
    expect(
      sassTildeImporter
        .findFileUrl('~sass-svg', { fromImport: true, containingUrl: null })
        ?.toString(),
    ).toBe(getAbsoluteFileUrl('node_modules/sass-svg/_index.scss'));
  });

  it('should resolve .css files', () => {
    expect(
      sassTildeImporter
        .findFileUrl('~bootstrap/dist/css/bootstrap-grid.css', {
          fromImport: true,
          containingUrl: null,
        })
        ?.toString(),
    ).toBe(
      getAbsoluteFileUrl('node_modules/bootstrap/dist/css/bootstrap-grid.css'),
    );
    expect(
      sassTildeImporter
        .findFileUrl('~bootstrap/dist/css/bootstrap-grid', {
          fromImport: true,
          containingUrl: null,
        })
        ?.toString(),
    ).toBe(
      getAbsoluteFileUrl('node_modules/bootstrap/dist/css/bootstrap-grid.css'),
    );
  });
});
