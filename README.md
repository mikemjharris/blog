Blog             
========================

Base for my online blog - view it here [blog.mikemjharis.com](http://blog.mikemjharris.com) To run pull this repository then run the following commands.

```
    npm install 
    entry
```

Posts are in the server/content folder.  All the data such as title and date of published is inside meta tags at the top of each post.  These are used to order the posts, put them in different cataegories etc.

This project runs mainly using js technologies.  It has a bunch of funky css and svg animations - probably a few too many for a normal blog but I was playing around.

Although using JS all through it also has server side rendering so can work without js in the browser.

If you like the structure of the project feel free to use - it's a side project and probably not that stable but feel free to use as you wish.  If you find it helpful would be great to hear from you.



Deployment
===========================

The project runs in a docker container.  All you need as a dependency is docker.

#### Build the docker file 

```
docker build -t mikemjharris/blog .
```

#### Running the project
The project exposes port 8000 so map that to whichevere port you need.
```
docker run -d -p 8000:8000 --name blog mikemjharris/blog
```


