# Manage Docker Containers

Build the image
    
    sudo docker build -t $USER/ubuntu-cloud9-testuser1 .

Run a container (-it)

    sudo docker run -p 3131:3131 -p 4445:4445 -d $USER/ubuntu-cloud9-testuser1

Stop all containers
    
    sudo docker stop $(sudo docker ps -a -q)

Remove all containers and their respective volumes
    
    sudo docker rm -v $(sudo docker ps -a -q)

Remove all images
    
    sudo docker rmi $(sudo docker images -q)

Open bash in container

    sudo docker exec -it <id> /bin/bash

VOLUMES ar located in /var/lib/docker/vfs and /var/lib/docker/volumes (rm -rf ...)

