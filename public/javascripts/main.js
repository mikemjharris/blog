if ('serviceWorker' in navigator) {
  navigator.serviceWorker
           .register('/service-worker.js')
           .then(function() { console.log('Service Worker Registered'); });
}

(function ( $ ) {

  $(function() {
    var posts;

    //initial call for posts
    $.ajax({
      url: '/api/posts',
      dataType: 'json',
      success: function(data) {
        posts = data;
      }
    });

    //browser history
    if ( window.history && window.history.pushState ) {

      $(window).on('popstate', function() {
        var _href = window.location.pathname;
        var pathParams = _href.match(/(?:\/(\w+))(?:\/([\w/-]+))?/);

        var path = pathParams[1];
        var id = pathParams[2];

        if ( posts !== undefined ) {
          if ( id !== undefined ) {
            var post = findPost(id, posts);
            console.log(post);
            var html = MyApp.templates.post({ post: post });
            $('article').html(html);
            window.location.href = window.location.href

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

    $('.menu').on('click' , toggleMenu);

    $('body').on('click', '.posts', function(e) {
      if( !$(this).data('navigate')) {
        e.preventDefault();
        var _href = $(this).attr('href');
        window.history.pushState(null, null, _href);
        $('.active-menu').removeClass('active-menu');

        _href = window.location.pathname;
        var pathParams = _href.match(/(?:\/(\w+))(?:\/([\w/-]+))?/);
        var id = pathParams[2];

        var post = findPost(id, posts);

        var html = MyApp.templates['post']({ post: post });
        $('article').html('');
        setTimeout(function() {
          $('article').append(html);
          // triggers code highlighting
          try {
            Prism.highlightAll();
            console.log('aaa') 
            window.location.href = window.location.href
          } catch (e) {
            console.error(e)
          }
         }, 0);
      }
    });

    $('.intro-animation ul li a').click(function(e) {
      if ( !$(this).data('navigate') ) {
        e.preventDefault();
        toggleMenu();

        $('.intro-animation').removeClass('intro-animation');
        $('article').removeClass('show');

        var _href = $(this).attr('href');

        // change the url without a page refresh and add a history entry.
        window.history.pushState(null, null, _href);

        $('.active-menu').removeClass('active-menu');
        $(this).closest('li').addClass('active-menu');

        var newPage = _href.replace(/\//, '');
        $('article').html('');
        try {
        // sometimew get errors with handlebars. Need to fix but for now just rely on server
        // side rendering
          var html = MyApp.templates[newPage]({ posts: posts });
        } catch (e) {
          window.location = _href;
        }
         setTimeout(function() {
          $('article').addClass('show');
          $('article').append(html);
          setTimeout(function () {
            $('.show').removeClass('show');
          }, 500);
        }, 10);
      }
    });
  });

  function findPost( id, posts) {
    var foundPost;
    posts.forEach(function ( post ) {
      if (post.searchtitle === id ) {
        foundPost = post;
      }
    });
    return foundPost;
  }

  function toggleMenu() {
    $('.menu').toggleClass('cross');
    $('nav').toggleClass('expand');
  }
})(jQuery);
