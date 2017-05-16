# Manage Docker Containers

List all running containers
    
    docker ps
    
List all containers
    
    docker ps -a

List all container IDs
    
    docker ps -a -q 
    
List images & exclude intermediate ones 
    
    docker images
    
List all images
    
    docker images -a

List all image IDs
    
    docker images -a -q

Start a container

    sudo docker start <container-name>

Start all containers
    
    sudo docker start $(sudo docker ps -a -q)

Stop a container

    sudo docker stop <container-name>

Stop all containers
    
    sudo docker stop $(sudo docker ps -a -q)

Restart a container

    sudo docker restart <container-name>

Restart all containers
    
    sudo docker restart $(sudo docker ps -a -q)

Remove a container

    sudo docker rm <container-name>

Remove a container and associated volume

    sudo docker rm -v <container-name>

Remove all containers and their respective volumes
    
    sudo docker rm -v $(sudo docker ps -a -q)

Remove all images
    
    sudo docker rmi $(sudo docker images -q)
***
**Only container/images that are not in use, e.g., are stopped will be removed!**
***
Open bash in specified container

    sudo docker exec -it <id> /bin/bash

Copy files/folders to a container

    sudo docker cp <file/folder> <container-name>:<path-in-container>

Copy files/folders from a container

    sudo docker cp <container-name>:<path-to-file/folder-in-container> <path-on-file-system>

