# ------------------------------------------------------------------------------
# Cloud9 Dockerfile
# 
# Author:    Jürgen Hausladen
# Copyright: 2016, SAT, FH Technikum Wien
# License:   AGPL <http://www.gnu.org/licenses/agpl.txt>
# ------------------------------------------------------------------------------
FROM    ubuntu:16.04
MAINTAINER Juergen Hausladen <juergen.hausladen@technikum-wien.at>

# ------------------------------------------------------------------------------
# Set PATH environment variable for the GCC toolchain
ENV PATH /gcc_arm_embedded/bin:$PATH
ENV TERM xterm
ENV CONTAINER docker

# ------------------------------------------------------------------------------
# Install base
RUN apt-get update && apt-get install -y \
    software-properties-common \
    build-essential \
    g++ \
    gdb \
    curl \
    libssl-dev \
    git \
    graphviz \
    libxml2-dev \
    supervisor \
    nano \
    lib32ncurses5 \
    xdg-utils \
    libgtk2.0-0 \
    usbutils \
    unzip \
    p7zip-full \
    unar \
    python \
    libxslt1.1 \
    sudo \
    tzdata

# Set the timezone.
ENV TZ=Europe/Vienna
RUN echo $TZ > /etc/timezone
RUN dpkg-reconfigure -f noninteractive tzdata

# Previously ARM GCC was distributed through a PPA
#RUN add-apt-repository ppa:team-gcc-arm-embedded/ppa
#RUN apt-get update && apt-get install -y gcc-arm-embedded

# gcc-arm-none-eabi
#RUN apt-get -o Dpkg::Options::="--force-overwrite" install gdb-arm-none-eabi
RUN mkdir -p /var/log/supervisor /cloud9 /cloud9workspace /OCDS_Software /Binaries /analysis_tools /usr/share/desktop-directories /cloud9/.sessions /gcc_arm_embedded

# ------------------------------------------------------------------------------
# Install Node.js and npm
RUN     curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
RUN     apt-get install -y nodejs
RUN     npm install -g n
RUN     n v6.10.0

# ------------------------------------------------------------------------------
# Bundle app source
COPY compiler/gcc_arm_embedded /gcc_arm_embedded
COPY cloud9 /cloud9
COPY Binaries /Binaries
COPY configs/debugport.conf /cloud9/debugport.conf
COPY configs/wsport.conf /cloud9/wsport.conf
COPY configs/id.conf /cloud9/id.conf
COPY configs/noob.conf /cloud9/noob.conf
COPY cloud9workspace /cloud9workspace
COPY cloud9workspace/settings /cloud9workspace/.settings
COPY Documentation/Getting_Started/General/gs_cdev.html /cloud9workspace/.gs_cdev.html
COPY Documentation/Getting_Started/General/gs_embdev.html /cloud9workspace/.gs_embdev.html
COPY Documentation/Getting_Started/General/gs_embanalysis.html /cloud9workspace/.gs_embanalysis.html

RUN echo password | openssl enc -aes-256-cbc -a -salt -pass pass:phrase > /.secret && chmod 770 /.secret

# ------------------------------------------------------------------------------
# Add restricted user
RUN adduser --disabled-password --gecos '' cloud
RUN chmod -R 755 /gcc_arm_embedded
RUN chmod -R 770 /cloud9/bin/cloud9.sh
RUN chown -R cloud:cloud /cloud9workspace
RUN chown -R cloud:cloud /cloud9

# ------------------------------------------------------------------------------
# Setup Cloud9
RUN su - cloud -c "cd /cloud9; npm install"
# Tempfix for qs module dependency errors
# RUN cd cloud9/node_modules/connect; sed -i 's/\"qs\": \">= 0.4.0\"/\"qs\": \"5.2.0\"/' package.json; npm install

# ------------------------------------------------------------------------------
# Restrict permissions on whole cloud9 folder but transfer ownership of the
# .session folder to the restricted user running cloud9
RUN chown -R root:root /cloud9
RUN chown -R cloud:cloud /cloud9/.sessions

# ------------------------------------------------------------------------------
# Bundle tools
COPY OCDS_Software /OCDS_Software
COPY analysis_tools /analysis_tools

# ------------------------------------------------------------------------------
# Add supervisord config files
COPY configs/supervisor_config/cloud9.conf /etc/supervisor/conf.d/
COPY configs/supervisor_config/debugcontrolservice.conf /etc/supervisor/conf.d/

# ------------------------------------------------------------------------------
# Add volumes
VOLUME /cloud9workspace

# ------------------------------------------------------------------------------
# Install debug-control service
RUN sudo dpkg -E -G -i /Binaries/Linux/64-Bit/debugcontrolserviceheadless-1.0.deb
RUN sudo dpkg -E -G -i /OCDS_Software/jlink_4.98.1_x86_64.deb
RUN sudo dpkg -E -G -i /OCDS_Software/openocd_0.9.0rc1-1_amd64.deb
RUN sudo dpkg -E -G -i /analysis_tools/ARMv7t-WCET-Analysis/install/otawa-armv7_0.1ubuntu-1_amd64.deb
RUN sudo dpkg -E -G -i /analysis_tools/dot2json/release/dot2json-1.30.deb

# ------------------------------------------------------------------------------
# Clean up APT when done.
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# ------------------------------------------------------------------------------
# Expose ports (For container shared objects only, As we specify forwarded ports to the hosz
# this will be done aoutomatically).
# EXPOSE 22 80 3131

# ------------------------------------------------------------------------------
# Start supervisor, define default command.
CMD ["/usr/bin/supervisord","-n", "-c", "/etc/supervisor/supervisord.conf"]
#CMD ["/bin/bash", "-c", "/Cloud9/bin/cloud9.sh -l 0.0.0.0 --username sat --password embsys -w /Cloud9/cloud9workspace"]
