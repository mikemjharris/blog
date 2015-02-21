
$( document ).ready(function() {


  $('.intro-animation ul li').click(function() {

    $('.intro-animation').removeClass('intro-animation');
    $('article').removeClass('show');

     _href = $(this).children('a').attr("href");
     console.log(_href)

      // change the url without a page refresh and add a history entry.
      history.pushState(null, null, _href);

    $('.active-menu').removeClass('active-menu');
    $(this).addClass('active-menu');
    $('.page').removeClass('showpage');
    var newPage = $(this).data('location');
    $('article').html('');
    var html = MyApp.templates[newPage]();
  

     setTimeout(function() {
      $('article').addClass('show')
      $('article').append(html)
      // $('.' + newPage).addClass('showpage');
    }, 0);
  })

});