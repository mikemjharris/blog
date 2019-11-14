const notFound = {
  title: '404',
  intro: 'the page you were looking for wasn\'t found'
};

const xml2js = require("xml2js");
const date = new Date();

module.exports = (app, posts) => {

  app.get('/', ( req, res ) => {
    res.render('templates/home' , { posts: posts, latestPost: posts[ 0 ]  });
  });

  app.get('/projects', ( req, res ) => {
    res.render('templates/projects' , { posts: posts });
  });

  app.get('/posts', ( req, res ) => {
    res.render('templates/posts' , { posts: posts });
  });

  app.get('/posts/top', ( req, res ) => {
    res.render('templates/posts' , { posts: posts });
  });

  app.get('/category', ( req, res ) => {
    res.render('templates/category' , { posts: posts });
  });

  app.get('/talks', ( req, res ) => {
    res.render('templates/talks' , { posts: posts });
  });

  app.get('/posts/:id', ( req, res ) => {
    const postId = req.params.id;
    let postToShow = notFound;

    posts.forEach(function ( post ) {
      if ( post.searchtitle === postId ) {
        postToShow = post;
      }
    });
    res.render('templates/post' , { post: postToShow });
  });

  app.get('/contact', ( req, res ) => {
    res.render('templates/contact');
  });

  app.get('/about', ( req, res ) => {
    res.render('templates/about');
  });

  // API
  app.get('/api/posts', ( req, res ) => {
    res.json(posts);
  });

  app.get('/rss.xml', ( req, res ) => {
    const rss = {
    rss: {
      $: {
         "xmlns:atom":"http://www.w3.org/2005/Atom",
         version:"2.0"
      },
      channel: {
          title: "MikeMJHarris' Blog",
          link: "https://blog.mikemjharris.com/",
          description: "Tech, some creative bits and other thoughts",
          generator: "MikeMJHarris' custom generator",
          language: "en-us",
          lastBuildDate: date.toUTCString(),
          "atom:link": {
            $: {
                  href:"https://blog.mikemjharris.com/rss.xml",
                  rel:"self",
                  type:"application/rss+xml"
               },
          },
          items: posts.map((post) => {
            return {
              title: post.title,
              link: "https://blog.mikemjharris.com/posts/" + post.searchtitle,
              pubDate: post.date,
              guid: post.searchtitle,
              description: post.body
            }
          })
        }
      }
    }

    const builder = new xml2js.Builder();
    const xml = builder.buildObject(rss);

    res.set('Content-Type', 'text/xml');
    res.send(xml);
  });

};
