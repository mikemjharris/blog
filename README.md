Blog             
========================

Base for my online blog - view it here [blog.mikemjharis.com](http://blog.mikemjharris.com) To run pull this repository then run the following commands.

```
    npm install 
    entry
```




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
docker run -d -p 7000:8000 --name blog mikemjharris/blog
```


#### THIS ISN'T CURRENTLY NEEDED BUT MAY BE IMPLEMENTED SOON
1 Run the mongodb container.  We want to mount an external volume so that the data is save outside the container - this data can be copied as a back up - also the data is not lost if we restart the container. 
```
docker run -d -p 27017:27017 -v /data/db:/data/db --name mongodb dockerfile/mongodb
```
the `-d` tag means it doesn't display the log when you run it (you can alway run `docker logs mongodb` to access the log). `-p` maps the port 27017 on the container to the same port externally

2 Run the blog container and link it to the mongodb container. The --link give you a number of environment vaiables inside the blog container with details on where it can reach the mongodb container.  These are used in `server.js`
```
docker run -d -p 7000:8000 --link mongodb:mongodb --name blog mikemjharris/blog
```

You are good to go!


