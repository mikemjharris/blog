var gulp = require('gulp');
var sass = require('gulp-sass')(require('node-sass'));
var concat = require('gulp-concat');
var handlebars = require('gulp-handlebars');
var wrap = require('gulp-wrap');
var declare = require('gulp-declare');
var merge = require('merge-stream');
var path = require('path');

gulp.task('templates', function() {
  // Assume all partials start with an underscore
  // You could also put them in a folder such as source/templates/partials/*.hbs
  var partials = gulp.src(['server/views/templates/partials/*.hbs'])
    .pipe(handlebars({
      handlebars: require('handlebars')
    }))
    .pipe(wrap('Handlebars.registerPartial(<%= processPartialName(file.relative) %>, Handlebars.template(<%= contents %>));', {}, {
      imports: {
        processPartialName: function(fileName) {
          // Escape the output with JSON.stringify
          return JSON.stringify(path.basename(fileName, '.js'));
        }
      }
    }));

  var templates = gulp.src('server/views/templates/*.hbs')
    .pipe(handlebars())
    .pipe(wrap('Handlebars.template(<%= contents %>)'))
    .pipe(declare({
      namespace: 'MyApp.templates',
      noRedeclare: true // Avoid duplicate declarations
    }));

  return merge(partials, templates)
    .pipe(concat('templates.js'))
    .pipe(gulp.dest('./public/dist/'));
});

gulp.task('sass', function () {
  return gulp.src([
    './public/stylesheets/reset.scss',
    './public/stylesheets/style.scss',
    './public/stylesheets/mobile.scss'
    ])
    .pipe(sass({ errLogToConsole: true }))
    .pipe(concat('style.css'))
    .pipe(gulp.dest('./public/dist/'));
});

gulp.task('js', function () {
  return gulp.src([
    './public/javascripts/helpers.js',
    './public/javascripts/main.js',
  ])
  .pipe(concat('main.js'))
  .pipe(gulp.dest('./public/dist/'));
});

gulp.task('default', gulp.series('js', 'sass', 'templates'));

gulp.task('watch', gulp.series('sass', 'js', 'templates'), function () {
  gulp.watch('./public/stylesheets/*', ['sass']);
  gulp.watch('./public/javascripts/*', ['js']);
  gulp.watch('./server/views/templates/*', ['templates']);
});
