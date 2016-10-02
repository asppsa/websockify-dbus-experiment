var gulp = require('gulp'),
    jspm = require('gulp-jspm');

gulp.task('jspm', function () {
  return gulp.src('public/lib/main.js')
    .pipe(jspm().on('error', (e) => { console.log(e); }))
    .pipe(gulp.dest('public/built/'));
});

gulp.task('watch', function () {
  gulp.watch('public/lib/**/*.js', ['jspm']);
});

gulp.task('build', ['jspm']);

gulp.task('default', ['build', 'watch']);

