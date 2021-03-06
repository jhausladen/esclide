#!/usr/bin/python
# -*- coding: utf-8 -*-

"""Restore script

This script is used to transfer previously backuped data to the new container.

Author:    Jürgen Hausladen
Copyright: 2016, SAT, FH Technikum Wien
License:   AGPL <http://www.gnu.org/licenses/agpl.txt>

"""

import json, subprocess, shutil, errno, sys, os

if len(sys.argv) > 3 or len(sys.argv) < 2:
  print "restore_container.py <container> <source folder>"
  exit()
# Run docker 'inspect' command to get the volume id
buildinspect = "docker inspect "+sys.argv[1];
pDockerInspect = subprocess.Popen(buildinspect.split(), stdout=subprocess.PIPE)
# Grab stdout line by line as it becomes available.
line = ''
while pDockerInspect.poll() is None:
  line = line+pDockerInspect.stdout.readline() # This blocks until it receives a newline.
# When the subprocess terminates there might be unconsumed output 
# that still needs to be processed.
line=line+pDockerInspect.stdout.read()

# Parse JSON data    
data = json.loads(line)

# Iterate docker output and find workspace mount
for result in data:
  for source in result['Mounts']:
    if "/var/lib/docker" in source['Source']:
      # Print volume location
      print source['Source']
      # Restore container volume
      try:
        shutil.copytree(sys.argv[2],source['Source']+"/Backup")
      except OSError as exc: # python >2.5
        if exc.errno == errno.ENOTDIR:
          print "Not a directory!"
        else: raise

# Restore file permissions
builddockerchown = "docker exec "+sys.argv[1]+" chown -R "+sys.argv[1]+":"+sys.argv[1]+" "+sys.argv[1];
pDockerChown = subprocess.Popen(builddockerchown.split(), stdout=subprocess.PIPE)
# Grab stdout line by line as it becomes available.
line = ''
while pDockerInspect.poll() is None:
  line = line+pDockerInspect.stdout.readline() # This blocks until it receives a newline.
# When the subprocess terminates there might be unconsumed output 
# that still needs to be processed.
line=line+pDockerInspect.stdout.read()
