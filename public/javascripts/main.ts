import { register } from './helpers.ts';

interface PostSummary {
  searchtitle: string;
  title?: string;
}

if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/service-worker.js');
}

// The templates are precompiled against the global Handlebars, so the helpers they
// call have to be registered on that same instance before anything renders.
register(Handlebars);

const toggleMenu = (): void => {
  $('.menu').toggleClass('cross');
  $('nav').toggleClass('expand');
};

$(() => {
  let posts: PostSummary[] | undefined;

  //initial call for posts
  $.ajax({
    url: '/api/posts',
    dataType: 'json',
    success: (data: PostSummary[]) => {
      posts = data;
    },
  });

  // browser history — pushState is assumed, not feature-detected: the guard that used
  // to be here could never be false in any browser jQuery 4 still supports.
  $(window).on('popstate', () => {
    const pathParams = window.location.pathname.match(/(?:\/(\w+))(?:\/([\w/-]+))?/);
    if (!pathParams || posts === undefined) return;

    const [, path, id] = pathParams;

    if (id !== undefined) {
      // Individual posts are rendered server side — client-side handlebars was
      // unreliable for them — so let the server do it rather than rendering a
      // copy here and immediately throwing it away.
      window.location.reload();
      return;
    }

    const template = path ? MyApp.templates[path] : undefined;
    if (!template) return;

    $('article').html('');
    $('article').append(template({ posts }));
    $('.active-menu').removeClass('active-menu');

    for (const nav of $('nav a').toArray()) {
      if ($(nav).attr('href') === window.location.pathname) {
        $(nav).closest('li').addClass('active-menu');
      }
    }
  });

  $('.menu').on('click', toggleMenu);

  // Post links are deliberately not intercepted. They used to be rendered client
  // side and then immediately reloaded, so the render was discarded every time —
  // letting the browser navigate reaches the same page without the flash.

  // `function` rather than an arrow: jQuery binds the clicked element to `this`.
  $('.intro-animation ul li a').on('click', function (event) {
    if ($(this).data('navigate')) return;

    event.preventDefault();
    toggleMenu();

    $('.intro-animation').removeClass('intro-animation');
    $('article').removeClass('show');

    const href = $(this).attr('href');
    if (!href) return;

    // change the url without a page refresh and add a history entry.
    window.history.pushState(null, '', href);

    $('.active-menu').removeClass('active-menu');
    $(this).closest('li').addClass('active-menu');

    const template = MyApp.templates[href.replace(/\//, '')];
    $('article').html('');

    // Fall back to a normal navigation if there is no client-side template for
    // this page, rather than leaving the article empty.
    if (!template) {
      window.location.href = href;
      return;
    }

    const html = template({ posts });

    setTimeout(() => {
      $('article').addClass('show');
      $('article').append(html);
      setTimeout(() => {
        $('.show').removeClass('show');
      }, 500);
    }, 10);
  });
});
