var gulp = require('gulp')
var babel = require('gulp-babel')
// var standard = require('gulp-standard')
var shell = require('gulp-shell')

gulp.task('default', ['build', 'docs'])

gulp.task('build', function () {
  return gulp.src('src/**/*.js')
    // .pipe(standard())
    // .pipe(standard.reporter('default', {breakOnError: true}))
    .pipe(babel())
    .pipe(gulp.dest('lib/'))
})

gulp.task('docs', shell.task([
  'jsdoc -d doc -u tutorials -c ./.jsdocrc -r -t ./node_modules/minami ./src ./src/README.md'
]))
