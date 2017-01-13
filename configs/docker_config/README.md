# Manage Docker Containers

List all running containers
    
    docker ps
    
List all containers
    
    docker ps -a
    
List images & exclude intermediate ones 
    
    docker images
    
List all images
    
    docker images -a

Start all containers
    
    sudo docker start $(sudo docker ps -a -q)

Stop all containers
    
    sudo docker stop $(sudo docker ps -a -q)
  
Restart all containers
    
    sudo docker restart $(sudo docker ps -a -q)

Remove all containers and their respective volumes
    
    sudo docker rm -v $(sudo docker ps -a -q)

Remove all images
    
    sudo docker rmi $(sudo docker images -q)

Open bash in specified container

    sudo docker exec -it <id> /bin/bash

