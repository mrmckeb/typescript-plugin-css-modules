import sass from 'sass';
import { sassTildeImporter } from '../sassTildeImporter';

describe('importers / sassTildeImporter', () => {
  const source = 'src/importers/sassTildeImporter.ts';
  const done = (data: sass.ImporterReturnType) => void data;

  it('should return null when not a tilde import', () => {
    expect(sassTildeImporter('color.scss', source, done)).toBeNull();
  });

  it('should return null when node module does not exist', () => {
    expect(
      sassTildeImporter('~made_up_module/color.scss', source, done),
    ).toBeNull();
  });

  it('should resolve file from node_modules', () => {
    expect(
      sassTildeImporter('~bootstrap/scss/bootstrap', source, done),
    ).toMatchObject({ file: 'node_modules/bootstrap/scss/bootstrap.scss' });
  });

  it('should resolve sass partial from node_modules', () => {
    // explicit
    expect(
      sassTildeImporter('~bootstrap/scss/_grid.scss', source, done),
    ).toMatchObject({ file: 'node_modules/bootstrap/scss/_grid.scss' });
    expect(
      sassTildeImporter('~bootstrap/scss/_grid', source, done),
    ).toMatchObject({ file: 'node_modules/bootstrap/scss/_grid.scss' });
    // implicit
    expect(
      sassTildeImporter('~bootstrap/scss/grid.scss', source, done),
    ).toMatchObject({ file: 'node_modules/bootstrap/scss/_grid.scss' });
    expect(
      sassTildeImporter('~bootstrap/scss/grid', source, done),
    ).toMatchObject({ file: 'node_modules/bootstrap/scss/_grid.scss' });
  });

  it('should resolve index files', () => {
    expect(sassTildeImporter('~sass-svg', source, done)).toMatchObject({
      file: 'node_modules/sass-svg/_index.scss',
    });
  });

  it('should resolve .css files', () => {
    expect(
      sassTildeImporter('~bootstrap/dist/css/bootstrap-grid.css', source, done),
    ).toMatchObject({
      file: 'node_modules/bootstrap/dist/css/bootstrap-grid.css',
    });
    expect(
      sassTildeImporter('~bootstrap/dist/css/bootstrap-grid', source, done),
    ).toMatchObject({
      file: 'node_modules/bootstrap/dist/css/bootstrap-grid.css',
    });
  });
});
