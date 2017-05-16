#!/usr/bin/python
# -*- coding: utf-8 -*-

"""Configuration generation script

This script generates cloud IDE instance configurations that are used to create Docker containers that host the cloud IDE provided
with this repository.

Author:    Jürgen Hausladen
Copyright: 2017, SAT, FH Technikum Wien
License:   AGPL <http://www.gnu.org/licenses/agpl.txt>

"""

# Imports
import sys, getopt, string, random, unidecode

# Define colors
class bcolors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# Print usage message
def usage():
    print '\npython generate_configuration.py -p <Portrange> -l <List of Users> {-b <XMC4500/TM4C1294XL> or -u (Universal Setup)} [-o <Outputfile> -w <Copy Path to Workspace>]'

# Main module
def main(argv):

    listOfTivaBoards = ["0F000BC9","0F000813","0F000AE4","0F000AE0","0F0009A6","0F0000C7","0F000076","0F00019E","0F000913","0F000B2C","0F000A89","0F00108D"]
    listOfXMCBoards = []
    portrange=""
    listofusers=""
    outputfile="config.conf"
    universal=False
    board=""
    pwdSize = 8
    workspace=""

    # Check for commandline parameters 
    try:
        opts, args = getopt.getopt(argv,"hp:l:uo:b:w:",["help","portrange=","listofusers=","universal","outputfile=","board=","workspace="])
    except getopt.GetoptError:
        usage()
        sys.exit(2)

    # Iterate over parameters and check their validity
    for opt, arg in opts:
        if opt in ("-h", "--help"):
            usage()
            sys.exit()
        
        elif opt in ("-p", "--portrange"):
            portrange=arg.split("-")
            if len(portrange) == 2:
                if not portrange[0].isdigit() or not portrange[1].isdigit(): 
                    usage()
                    sys.exit()
            else:
                usage()
                sys.exit()

        elif opt in ("-l", "--listofusers"):
            # Open/Read list of users
            try:
                fo = open(arg, "r")
            except IOError:
                print bcolors.FAIL + "The specified list of users does not exist!" + bcolors.ENDC
                sys.exit()
            listofusers = fo.read()
            fo.close()
            # Remove accents
            listofusers=unicode(listofusers, "utf-8")
            listofusers=unidecode.unidecode(listofusers)
            listofusers=listofusers.strip().split("\n")
            if len(listofusers)*2 > int(portrange[1])-int(portrange[0]):
                print bcolors.FAIL + "There are too few ports available! \nAvailable:"+str(int(portrange[1])-int(portrange[0]))+" Requested:"+str(len(listofusers)*2) + bcolors.ENDC
                sys.exit()
            elif len(listOfTivaBoards) < len(listofusers):
                print bcolors.FAIL + "There are too few boards available! \nAvailable:"+str(len(listOfTivaBoards))+" Requested:"+str(len(listofusers)) + bcolors.ENDC
                sys.exit()

        elif opt in ("-u", "--universal"):
            universal=True

        elif opt in ("-o", "--outputfile"):
            outputfile=arg

        elif opt in ("-b", "--board"):
            board=arg
            if board != "XMC4500" and board != "TM4C1294XL":
                print bcolors.FAIL + "The specified platform does not exist!" + bcolors.ENDC
                usage()
                sys.exit()
            elif (not listOfXMCBoards and board == "XMC4500") or (not listOfTivaBoards and board == "TM4C1294XL") :
                print bcolors.FAIL + "No serial numbers specified for the selected platform!" + bcolors.ENDC
                sys.exit()
        elif opt in ("-w", "--workspace"):
            workspace=arg
       
    # Check if every parameter is given, otherwise exit
    if portrange == '' or listofusers == '' or board == '':
        usage()
        sys.exit()
    
    tmpPort = int(portrange[0])
    config=""
    serialcount=0
    for user in listofusers:
        # Generate password
        # Alphanumeric + special characters
        #chars = string.letters + string.digits + string.punctuation
        # Just alphanumeric characters
        chars = string.letters + string.digits
        password = ''.join((random.choice(chars)) for x in range(pwdSize))
        
        # Generate cloud IDE configuration for a HaaS setup
        if universal == False:
            config+="[cloudinstance:"+str(user).lower()+"]\n"
            config+="name = "+str(user).lower()+"\n"
            config+="workstationname = "+str(user).lower()+"\n"
            config+="user = "+str(user).lower()+"\n"
            config+="password = "+password+"\n"
            config+="port = "+str(tmpPort)+"\n"
            tmpPort+=1
            config+="websocket = "+str(tmpPort)+"\n"
            tmpPort+=1
            if workspace != "":
                config+="projects = "+workspace+"\n"
            if board == "XMC4500":
                config+="serial = "+listOfXMCBoards[serialcount]+"\n"
                serialcount+=1
                config+="jlinkport = ON\n"
            elif board == "TM4C1294XL":
                config+="serial = "+listOfTivaBoards[serialcount]+"\n"
                serialcount+=1
                config+="oocdport = ON\n"
            config+="target = "+board+"\n\n"

        # Generate cloud IDE configuration for a universal setup
        elif universal == True:
            config+="[cloudinstance:"+str(user).lower()+"]\n"
            config+="name = "+str(user).lower()+"\n"
            config+="workstationname = "+str(user).lower()+"\n"
            config+="user = "+str(user).lower()+"\n"
            config+="password = "+password+"\n"
            config+="port = "+str(tmpPort)+"\n"
            tmpPort+=1
            config+="debugport = "+str(tmpPort)+"\n"
            tmpPort+=1
            if workspace != "":
                config+="projects = "+workspace+"\n"
            config+="\n"
    
    # Open output configuration file
    try:
        fo = open(outputfile, "w")
    except IOError:
        print bcolors.FAIL + "The specified output file/folder does not exist!" + bcolors.ENDC
        sys.exit()
    fo.write(config)

# Check and run main program
if __name__ == "__main__":
   main(sys.argv[1:])
