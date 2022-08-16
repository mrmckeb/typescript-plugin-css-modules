import { pathToFileURL } from 'url';
import { sassTildeImporter } from '../sassTildeImporter';

describe('importers / sassTildeImporter', () => {
  const options = { fromImport: false };

  it('should return null when not a tilde import', () => {
    expect(sassTildeImporter.findFileUrl('color.scss', options)).toBeNull();
  });

  it('should return null when node module does not exist', () => {
    expect(
      sassTildeImporter.findFileUrl('~made_up_module/color.scss', options),
    ).toBeNull();
  });

  it('should resolve file from node_modules', () => {
    expect(
      sassTildeImporter.findFileUrl('~bootstrap/scss/bootstrap', options),
    ).toMatchObject(
      pathToFileURL('node_modules/bootstrap/scss/bootstrap.scss'),
    );
  });

  it('should resolve sass partial from node_modules', () => {
    // explicit
    expect(
      sassTildeImporter.findFileUrl('~bootstrap/scss/_grid.scss', options),
    ).toMatchObject(pathToFileURL('node_modules/bootstrap/scss/_grid.scss'));
    expect(
      sassTildeImporter.findFileUrl('~bootstrap/scss/_grid', options),
    ).toMatchObject(pathToFileURL('node_modules/bootstrap/scss/_grid.scss'));
    // implicit
    expect(
      sassTildeImporter.findFileUrl('~bootstrap/scss/grid.scss', options),
    ).toMatchObject(pathToFileURL('node_modules/bootstrap/scss/_grid.scss'));
    expect(
      sassTildeImporter.findFileUrl('~bootstrap/scss/grid', options),
    ).toMatchObject(pathToFileURL('node_modules/bootstrap/scss/_grid.scss'));
  });

  it('should resolve index files', () => {
    expect(sassTildeImporter.findFileUrl('~sass-svg', options)).toMatchObject(
      pathToFileURL('node_modules/sass-svg/_index.scss'),
    );
  });

  it('should resolve .css files', () => {
    expect(
      sassTildeImporter.findFileUrl(
        '~bootstrap/dist/css/bootstrap-grid.css',
        options,
      ),
    ).toMatchObject(
      pathToFileURL('node_modules/bootstrap/dist/css/bootstrap-grid.css'),
    );
    expect(
      sassTildeImporter.findFileUrl(
        '~bootstrap/dist/css/bootstrap-grid',
        options,
      ),
    ).toMatchObject(
      pathToFileURL('node_modules/bootstrap/dist/css/bootstrap-grid.css'),
    );
  });
});
