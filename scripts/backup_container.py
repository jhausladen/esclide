#!/usr/bin/python
# -*- coding: utf-8 -*-

"""Backup script

This script is used to backup data of existing docker containers.

Author:    Jürgen Hausladen
Copyright: 2016, SAT, FH Technikum Wien
License:   AGPL <http://www.gnu.org/licenses/agpl.txt>

"""

import json, subprocess, shutil, errno, sys

if len(sys.argv) > 3 or len(sys.argv) < 2:
  print "backup_container.py <container> <destination folder>"
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
      # Backup container volume
      try:
        shutil.copytree(source['Source'], sys.argv[2])
      except OSError as exc: # python >2.5
        if exc.errno == errno.ENOTDIR:
          print "Not a directory!"
        else: raise
