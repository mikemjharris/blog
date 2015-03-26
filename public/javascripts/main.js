$( document ).ready(function() {
  var posts;

  if (window.history && window.history.pushState) {

    $(window).on('popstate', function() {

      var _href = window.location.pathname;
      var pathParams = _href.match(/(?:\/(\w+))(?:\/([\w/-]+))?/);

      var path = pathParams[1];
      var id = pathParams[2];

      console.log(id);
      if ( posts !== undefined ) {
        if ( id !== undefined ) {
          var post = findPost(id, posts);
          console.log(post)
          var html = MyApp.templates.post({ post: post });
          $('article').html('');
          $('article').append(html);
        } else {
          $('article').html('');

          var html = MyApp.templates[path]({ posts: posts });
          $('article').append(html);
          $('.active-menu').removeClass('active-menu');

          var menuNavs = $('nav a');
          for ( var i = 0 ; i < menuNavs.length; i++){
            if ($(menuNavs[i]).attr('href') === window.location.pathname) {
              $(menuNavs[i]).closest('li').addClass('active-menu');
            }
          }
        }
      }
    });
  }

  $.ajax({
    url: '/api/posts',
    dataType: 'json',
    success: function(data) {
      posts = data;
    }
  });

  $('.menu').on('click' , toggleMenu);

  $('body').on('click', '.posts', function(e) {
    e.preventDefault();

    var _href = $(this).attr('href');
    history.pushState(null, null, _href);
    $('.active-menu').removeClass('active-menu');

    _href = window.location.pathname;
    var pathParams = _href.match(/(?:\/(\w+))(?:\/([\w/-]+))?/);
    var id = pathParams[2];
    console.log(id);
    var post = findPost(id, posts);
    console.log(post);
    var html = MyApp.templates['post']({ post: post });
    $('article').html('');
    $('article').append(html);
  })

  $('.intro-animation ul li a').click(function(e) {
    e.preventDefault();
    toggleMenu();
    
    $('.intro-animation').removeClass('intro-animation');
    $('article').removeClass('show');

    _href = $(this).attr("href");

    // change the url without a page refresh and add a history entry.
    history.pushState(null, null, _href);

    $('.active-menu').removeClass('active-menu');
    $(this).closest('li').addClass('active-menu');
    $('.page').removeClass('showpage');
    var newPage = _href.replace(/\//, '');
    $('article').html('');
    console.log('np', newPage);
    var html = MyApp.templates[newPage]({ posts: posts});

     setTimeout(function() {
      $('article').addClass('show');
      $('article').append(html);
      // $('.' + newPage).addClass('showpage');
    }, 0);
  })
});

function findPost( id, posts) {
  var foundPost;
  console.log( id )
  console.log( posts)
  posts.forEach(function(post){
    if (post.searchtitle === id ) {
      foundPost = post;
    }
  });
  return foundPost;
}

function toggleMenu () {
  $('.menu').toggleClass('cross');
  $('nav').toggleClass('expand');
}
