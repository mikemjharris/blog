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

#### Build the docker file 
I use [boot2docker](https://github.com/boot2docker/boot2docker) on my mac to build the docker file.  If you are on linux just use docker itself.  I then push the image to my repositry and then pull it down on my server.  This means the only dependency I need on my server is docker itself. [Digital ocean](https://www.digitalocean.com/) provide a great service and you can get a droplet with docker installed running in no time at all.

To build the docker container I run the following from the root of the project (replace with your username).

```
docker build -t mikemjharris/blog .
```

I then push the image to my repositry (replace with your username)

```
docker push mikemjharris/blog
```


#### Deployment on the server
The blog was desigined to be deployed using docker - with the node app sitting in one container linked to a mongodb container with a shared volume in another container.  Here are the commands to get it running:

```
docker run -d -p 8000:8000 --name blog mikemjharris/blog
```


You are good to go!


