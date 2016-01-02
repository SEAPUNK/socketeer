const gulp = require('gulp')
const shell = require('gulp-shell')

gulp.task('default', ['docs'])

gulp.task('docs', shell.task([
  'jsdoc -d doc -u tutorials -c ./.jsdocrc -r -t ./node_modules/minami ./src ./src/README.md'
]))
