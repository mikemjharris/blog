var gulp = require('gulp');
var sass = require('gulp-sass');
var concat = require('gulp-concat');
var handlebars = require('gulp-handlebars');
var wrap = require('gulp-wrap');
var declare = require('gulp-declare');

gulp.task('templates', function(){
  gulp.src('server/views/templates/*.hbs')
    .pipe(handlebars())
    .pipe(wrap('Handlebars.template(<%= contents %>)'))
    .pipe(declare({
      namespace: 'MyApp.templates',
      noRedeclare: true, // Avoid duplicate declarations 
    }))
    .pipe(concat('templates.js'))
    .pipe(gulp.dest('./public/dist/'));
});

gulp.task('sass', function () {
  gulp.src([
    './public/stylesheets/aa_reset.scss',
    './public/stylesheets/style.scss',
    './public/stylesheets/mobile.scss'
    ])
    .pipe(sass({ errLogToConsole: true }))
     .pipe(concat('style.css'))
    .pipe(gulp.dest('./public/dist/'));
});

gulp.task('js', function () {
  gulp.src([
    './public/javascripts/main.js',
  ])
  .pipe(concat('main.js'))
  .pipe(gulp.dest('./public/dist/'));
});

gulp.task('default', ['js', 'sass', 'templates'])

gulp.task('watch', ['sass', 'js', 'templates'], function () {
  gulp.watch('./public/stylesheets/*', ['sass']);
  gulp.watch('./public/javascripts/*', ['js']);
  gulp.watch('./server/views/templates/*', ['templates']);
});
