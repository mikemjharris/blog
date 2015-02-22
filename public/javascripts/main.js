



$( document ).ready(function() {
  var posts;

    if (window.history && window.history.pushState) {

    // window.history.pushState('forward', null, './#forward');

    $(window).on('popstate', function() {
      
      var _href = window.location.pathname;
      pathParams = _href.match(/(?:\/(\w+))(?:\/([\w/-]+))?/)

      path = pathParams[1];
      id = pathParams[2];
      
      console.log(id)

      if ( id !== undefined ) {
        post = findPost(id, posts)
        var html = MyApp.templates.post( {post: post});
        $('article').html('');
        $('article').append(html)
      } else {

        $('article').html('');
        var html = MyApp.templates[path]({ posts: posts});
        $('article').append(html)
        $('.active-menu').removeClass('active-menu');
        menuNavs = $('nav a')
        for ( var i = 0 ; i < menuNavs.length; i++){
          if ($(menuNavs[i]).attr('href') === window.location.pathname) {
            $(menuNavs[i]).closest('li').addClass('active-menu');
          }
        }
      }


    });

  }

  $.ajax({
    url: "/api/posts",
    dataType: "json",
    success: function(data) {
      posts = data;
    }
  })

  // $('header').on('click' , function() {
  //     $('nav').toggleClass('expand');
  // })
  $('.menu').on('click' , function() {
      $('nav').toggleClass('expand');
  })

  $('body').on('click', '.posts', function(e) {
    e.preventDefault();

    _href = $(this).attr("href");
    history.pushState(null, null, _href);
    $('.active-menu').removeClass('active-menu');

    var _href = window.location.pathname;
    pathParams = _href.match(/(?:\/(\w+))(?:\/([\w/-]+))?/)
    var id = pathParams[2]
    console.log(id)
    post = findPost(id, posts)
    var html = MyApp.templates.post( {post: post});
     $('article').html('');
      $('article').append(html)

  })
 
  $('.intro-animation ul li a').click(function(e) {
    e.preventDefault();
     $('nav').toggleClass('expand');
    $('.intro-animation').removeClass('intro-animation');
    $('article').removeClass('show');

    _href = $(this).attr("href");
    
    // change the url without a page refresh and add a history entry.
    history.pushState(null, null, _href);

    $('.active-menu').removeClass('active-menu');
    $(this).closest('li').addClass('active-menu');
    $('.page').removeClass('showpage');
    var newPage = _href.replace(/\//, "");
    $('article').html('');
    var html = MyApp.templates[newPage]({ posts: posts});
  
     setTimeout(function() {
      $('article').addClass('show');
      $('article').append(html);
      // $('.' + newPage).addClass('showpage');
    }, 0);
  })
});

function findPost( id, posts) {
    var foundPost 
    posts.forEach(function(post){
      if (post.searchtitle === id ) {
        foundPost = post
      }
    })
    return foundPost;
}