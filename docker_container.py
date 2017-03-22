#!/usr/bin/python
# -*- coding: utf-8 -*-

"""Docker container script

This script is used to create a Docker container that hosts the cloud IDE provided
with this repository.

Author:    Jürgen Hausladen
Copyright: 2016, SAT, FH Technikum Wien
License:   AGPL <http://www.gnu.org/licenses/agpl.txt>

"""

# Imports
import sys, getopt, os, subprocess, shutil, glob, re, wget, tarfile

# Main module
def main(argv):
   
   ant = True
   compiler = True
   compilerfolder = ''

   # Check for commandline parameters 
   try:
      opts, args = getopt.getopt(argv,"hn:w:u:k:p:c:d:e:m:s:r:j:o:b",["help","name=","workstationname=","user=","password=","port=","config=","debugport=","websocket=","target=","serial=","projects=","jlinkport=","oocdport=","noob"])
   except getopt.GetoptError:
      print 'python docker_container.py -n <Name> -w <Workstationname> -u <Username> -k <Password> -p <IDE Port> [Optional: -c <Setup Configuration> -d <Debug Port> -e <Websocket Port> -m <Target> -s <Serial> -r <Projects> -j <ON/JLink Port> -o <ON/OOCD Port> -b <Enable NOOB Mode>]'
      sys.exit(2)
   instances = []
   instances.append(opts)

   # check for presence of config file
   for opt, arg in opts:
      if opt in ("-c", "--config"):
        
        try:
            fo = open(arg, "r")
        except IOError:
            print "The file does not exist!"
        instances = []
        cmd = []
        for line in fo:
            
            line = line.replace(" ","")
            line = line.replace("\n","")
            
            param = line.split("=")
            param[0] = "--"+param[0];
            param = tuple(param)
            if param and line and not "cloudinstance:" in line:
             cmd.append(param)
            elif cmd:
             instances.append(cmd)
             cmd = []
        instances.append(cmd)
        fo.close();

   for instance in instances:

       # Initialize build properties
       port = ''
       debugport = ''
       name = ''
       workstationname = ''
       username =''
       password =''
       passwordlen = ''
       sn =''
       wsport = ''
       jlinkport = ''
       oocdport = ''
       startjlink = ''
       startoocd = ''
       projectpath = ''
       noob = False
       target = ''
         
       # Loop through parameters and check their validity
       for opt, arg in instance:
          if opt in ("-h", "--help"):
             print 'python docker_container.py -n <Name> -w <Workstationname> -u <Username> -k <Password> -p <IDE Port> [Optional: -c <Setup Configuration> -d <Debug Port> -e <Websocket Port> -m <Target> -s <Serial> -r <Projects> -j <ON/JLink Port> -o <ON/OOCD Port> -b <Enable NOOB Mode>]'
             sys.exit()
          elif opt in ("-p", "--port"):
             port = arg
             if port.isdigit() == False or int(port) > 65535 or int(port) < 1:
              print 'Port (-p) has to be a number in range of 1-65535'
              sys.exit()
          elif opt in ("-d", "--debugport"):
             debugport = arg
             if debugport.isdigit() == False or int(debugport) > 65535 or int(debugport) < 1:
              print 'Port (-d) has to be a number in range of 1-65535'
              sys.exit()
             if debugport == port:
              print 'IDE Port and Debug Port have to be different'
              sys.exit()
          elif opt in ("-e", "--websocket"):
              wsport = arg
              if wsport.isdigit() == False or int(wsport) > 65535 or int(wsport) < 1:
               print 'Port (-e) has to be a number in range of 1-65535'
               sys.exit()
              if wsport == port or wsport == debugport:
               print 'Websocket port has to be different than IDE Port or Debug Port'
               sys.exit()
          elif opt in ("-j", "--jlinkport"):
              jlinkport = arg
              if jlinkport != 'ON' and (jlinkport.isdigit() == False or int(jlinkport) > 65535 or int(jlinkport) < 1):
               print 'Port (-j) has to be a number in range of 1-65535 or ON'
               sys.exit()
              if jlinkport == port or jlinkport == debugport or jlinkport == wsport:
               print 'JLink Port has to be different from IDE Port, Debug Port and Websocket Port'
               sys.exit()
          elif opt in ("-o", "--oocdport"):
              oocdport = arg
              if oocdport != 'ON' and (oocdport.isdigit() == False or int(oocdport) > 65535 or int(oocdport) < 1):
               print 'Port (-o) has to be a number in range of 1-65535 or ON'
               sys.exit()
              if oocdport != 'ON' and jlinkport != 'ON':
               if oocdport == port or oocdport == debugport or oocdport == wsport or oocdport == jlinkport:
                print 'OOCD Port has to be different from IDE Port, Debug Port, Websocket Port and JLink Port'
                sys.exit()
          elif opt in ("-n", "--name"):
             name = arg
             if not re.match("^[a-zA-Z0-9_]*$", name):
              print 'Invalid name! No special characters are allowed'
              sys.exit()
          elif opt in ("-w", "--workstationname"):
             workstationname = arg
             if len(workstationname) < 4 or len(workstationname) > 30:
              print 'Workstation name has to be greater than 3 or fewer than 31 characters (4-30)'
              sys.exit()
          elif opt in ("-u", "--user"):
              username = arg
          elif opt in ("-m", "--target"):
              target = arg
          elif opt in ("-s", "--serial"):
              sn = arg
          elif opt in ("-r", "--projects"):
              projectpath = arg
          elif opt in ("-b", "--noob"):
              noob = True;
          elif opt in ("-k", "--password"):
              password = arg
              if password.isdigit() == True:
               print 'Insecure password! The password has to contain at least one letter'
               sys.exit()
              if len(password) < 4:
               print 'Insecure password! The password length has to be greater than 4'
               sys.exit()
              for i in range(0,len(password)):
               passwordlen += "*" 
       
       # Check if every parameter is given, otherwise exit
       if port == '' or name == '' or workstationname == '' or username == '' or password == '':
          print 'python docker_container.py -n <Name> -w <Workstationname> -u <Username> -k <Password> -p <IDE Port> [Optional: -c <Setup Configuration> -d <Debug Port> -e <Websocket Port> -m <Target> -s <Serial> -r <Projects> -j <ON/JLink Port> -o <ON/OOCD Port> -b <Enable NOOB Mode>]'
          sys.exit()
       
       # Check if letsencrypt folder exists
       if not os.path.isdir('/etc/letsencrypt'):
          print 'The folder /etc/letsencrypt does not exist! Please create valid Let’s Encrypt certificates first https://certbot.eff.org/'
          sys.exit()

       # Set default values for unspecified options
       if sn == '':
          if target != '':
            print "Please specify the serial number (-s/--serial) of your target!"
            sys.exit()
          sn = "universal"
       else:
          if target == '':
            print 'Please specify a target platform!'
            sys.exit()
          # Enable NOOB mode as default for HaaS setups
          # noob = True

       if wsport == '':
          wsport = "8080"

       if debugport == '':
          debugport = "8081"

       if jlinkport == '':
          startjlink = "0"
          jlinkport = "default"
       elif jlinkport == 'ON':
          startjlink = "1"
       else:
          startjlink = "0"

       if oocdport == '':
          startoocd = "0"
          oocdport = "default"
       elif oocdport == 'ON':
          startoocd = "1"
       else: 
          startoocd = "0"

       # Print results
       print 'Name:', name
       print 'Workstationname:', workstationname
       print 'Username:', username
       print 'Password:', passwordlen
       print 'Port:', port
       print 'Debugport:', debugport
       print 'Websocketport:', wsport
       print 'JLinkport:', jlinkport
       print 'OOCDport:', oocdport
       print 'Target:', target
       print 'Serial:', sn
       print 'Projects:', projectpath
       if noob == True: 
          print 'NOOB Mode ON'
       else:
          print 'NOOB Mode OFF'
       if compiler == True:
        # Download ARM GCC (GCC ARM Embedded) as its not distributed through the PPA anymore
        # Clean up compiler folder
        if os.path.isdir('compiler'):
            print 'Clean up compiler directory!'
            shutil.rmtree('compiler')

        # Check if compiler folder exists & create it
        if not os.path.isdir('compiler'):
            print 'Create folder for compiler!'
            os.makedirs("compiler")

        # Download compiler from ARM website 
        print 'Download compiler...'
        url = 'https://developer.arm.com/-/media/Files/downloads/gnu-rm/6-2016q4/gcc-arm-none-eabi-6_2-2016q4-20161216-linux.tar.bz2?product=GNU%20ARM%20Embedded%20Toolchain,64-bit,,Linux,6-2016-q4-major'
        filename = wget.download(url,"compiler/")

        # Untar archive
        tar = tarfile.open(filename, "r:bz2")
        compilerfolder = "compiler/"+os.path.commonprefix(tar.getnames())  
        tar.extractall("compiler/")
        tar.close()
        
        compiler = False

       # Add OpenJFX Monocle to JDK
       path = os.environ.get('JAVA_HOME')
       print path
       if path == "None":
        print "There is no JDK in JAVA_HOME path!"
       else:
        if glob.glob('software/OpenJFX_Monocle/openjfx-monocle-*.jar') == []:
               print "ERROR: No OpenJFX Monocle jar found!"
               sys.exit()
       
        newestMonocle = max(glob.iglob('software/OpenJFX_Monocle/openjfx-monocle-*.jar'), key=os.path.getctime)
        monocleName = os.path.basename(newestMonocle)
        shutil.copyfile(newestMonocle, path+"/jre/lib/ext/"+monocleName)
       
       # Build dependencies fir HaaS setup
       if ant == True and sn != "universal":
           # Build Debug-Control Service in headles mode
           buildservice = "ant -buildfile software/DebugControlService/Java/efxclipse/DebugControlService/build/build_headless.xml";
           pServiceBuild = subprocess.Popen(buildservice.split(), stdout=subprocess.PIPE)
           # Grab stdout line by line as it becomes available.  This will loop until 
           # p terminates.
           while pServiceBuild.poll() is None:
            l = pServiceBuild.stdout.readline() # This blocks until it receives a newline.
            print l
           # When the subprocess terminates there might be unconsumed output 
           # that still needs to be processed.
           print pServiceBuild.stdout.read()
           ant = False

           # Check for required software
           if glob.glob('software/DebugControlService/Java/efxclipse/DebugControlService/build/deploy/bundles/debugcontrolserviceheadless*.deb') == []:
               print "ERROR: No debug-control service found!"
               sys.exit()
           
           newestService = max(glob.iglob('software/DebugControlService/Java/efxclipse/DebugControlService/build/deploy/bundles/debugcontrolserviceheadless*.deb'), key=os.path.getctime)
           binaryName = os.path.basename(newestService)

           if glob.glob('OCDS_Software/jlink_*.deb') == []:
               print "ERROR: No JLink tools found!"
               sys.exit()
       
           newestJLink = max(glob.iglob('OCDS_Software/jlink_*.deb'), key=os.path.getctime)
           jBinaryName = os.path.basename(newestJLink)

           if glob.glob('OCDS_Software/openocd_*.deb') == []:
               print "ERROR: No JLink tools found!"
               sys.exit()
       
           newestOOCD = max(glob.iglob('OCDS_Software/openocd_*.deb'), key=os.path.getctime)
           oBinaryName = os.path.basename(newestOOCD)

       if glob.glob('analysis_tools/dot2json/release/*.deb') == []:
           print "ERROR: No dot2json found!"
           sys.exit()
       
       newestDot2Json = max(glob.iglob('analysis_tools/dot2json/release/*.deb'), key=os.path.getctime)
       dot2jsonBinaryName = os.path.basename(newestDot2Json)

       if glob.glob('analysis_tools/ARMv7t-WCET-Analysis/install/*.deb') == []:
           print "ERROR: No WCET analysis tools found!"
           sys.exit()
       
       newestWCET = max(glob.iglob('analysis_tools/ARMv7t-WCET-Analysis/install/*.deb'), key=os.path.getctime)
       wcetToolsBinaryName = os.path.basename(newestWCET)

       # Open/Create/Update the Noob configuration file
       try:
        fo = open("configs/noob.conf", "wb")
       except IOError:
           print "The file does not exist!"
       
       if noob == True: 
          fo.write("1");
          # Close open file
          fo.close()   
       else:
          fo.write("0");
          # Close open file
          fo.close()

       # Open/Modify Dockerfile
       try:
        fo = open("configs/docker_config/Dockerfile", "r")
       except IOError:
           print "The file does not exist!"
       tmpCfg = fo.read();
       fo.close();
       tmpCfg = tmpCfg.replace("/cloud9workspace",name);
       tmpCfg = tmpCfg.replace("otawa-armv7_0.1ubuntu-1_amd64.deb",wcetToolsBinaryName);
       tmpCfg = tmpCfg.replace("dot2json-1.30.deb",dot2jsonBinaryName);
       if projectpath != '':
        tmpCfg = tmpCfg.replace("COPY cloud9workspace "+name,"COPY "+projectpath+" "+name);
       else:
        tmpCfg = tmpCfg.replace("COPY cloud9workspace "+name,"");
       tmpCfg = tmpCfg.replace("/cloud9workspace/.settings",projectpath+"/.settings");
       if sn != "universal":
        tmpCfg = tmpCfg.replace("COPY Binaries /Binaries","COPY "+newestService+" /Binaries/"+binaryName);
        tmpCfg = tmpCfg.replace("/Binaries/Linux/64-Bit/debugcontrolserviceheadless-1.0.deb","/Binaries/"+binaryName);
        tmpCfg = tmpCfg.replace("RUN sudo dpkg -E -G -i /OCDS_Software/jlink_4.98.1_x86_64.deb","RUN sudo dpkg -E -G -i /OCDS_Software/"+jBinaryName);
        tmpCfg = tmpCfg.replace("RUN sudo dpkg -E -G -i /OCDS_Software/openocd_0.9.0rc1-1_amd64.deb","RUN sudo dpkg -E -G -i /OCDS_Software/"+oBinaryName);
        tmpCfg = tmpCfg.replace("COPY Documentation/Getting_Started/General/gs_embdev.html","COPY Documentation/Getting_Started/General/gs_embdevserver.html");
       else:
        tmpCfg = tmpCfg.replace("COPY Binaries /Binaries","");
        tmpCfg = tmpCfg.replace("RUN sudo dpkg -E -G -i /Binaries/Linux/64-Bit/debugcontrolserviceheadless-1.0.deb","");
        tmpCfg = tmpCfg.replace("COPY OCDS_Software /OCDS_Software","");
        tmpCfg = tmpCfg.replace("RUN sudo dpkg -E -G -i /OCDS_Software/jlink_4.98.1_x86_64.deb","");
        tmpCfg = tmpCfg.replace("RUN sudo dpkg -E -G -i /OCDS_Software/openocd_0.9.0rc1-1_amd64.deb","");
        tmpCfg = tmpCfg.replace("COPY configs/supervisor_config/debugcontrolservice.conf /etc/supervisor/conf.d/","");

       tmpCfg = tmpCfg.replace("RUN adduser --disabled-password --gecos '' cloud","RUN adduser --disabled-password --gecos '' "+name);
       tmpCfg = tmpCfg.replace("RUN chown -R cloud:cloud "+name,"RUN chown -R "+name+":"+name+" /"+name);
       tmpCfg = tmpCfg.replace("RUN chown -R cloud:cloud /cloud9","RUN chown -R "+name+":"+name+" /cloud9");
       tmpCfg = tmpCfg.replace("RUN chown -R cloud:cloud /cloud9/.sessions","RUN chown -R "+name+":"+name+" /cloud9/.sessions");
       tmpCfg = tmpCfg.replace("RUN su - cloud -c \"cd /cloud9; npm install\"","RUN su - "+name+" -c \"cd /cloud9; npm install\"");
       tmpCfg = tmpCfg.replace("COPY compiler/gcc_arm_embedded /gcc_arm_embedded","COPY "+compilerfolder+" /gcc_arm_embedded");
       tmpCfg = tmpCfg.replace("RUN echo password | openssl enc -aes-256-cbc -a -salt -pass pass:phrase > /.secret && chmod 770 /.secret","RUN echo "+password+" | openssl enc -aes-256-cbc -a -salt -pass pass:"+username+" > /.secret && chmod 770 /.secret");
       
       # Create Dockerfile
       try:
        fod = open("Dockerfile", "wb")
       except IOError:
           print "The file does not exist!"
        
       fod.write(tmpCfg);
       fod.close();

       # Open/Modify Dockerignore
       try:
        fo = open("configs/docker_config/dockerignore", "r")
       except IOError:
           print "The file does not exist!"
       tmpCfg = fo.read();
       fo.close();
       # Adding folders with excludes is currently not working
       # tmpCfg = tmpCfg+"\n"+ "!"+projectpath

       # Create Dockerignore
       try:
        fod = open(".dockerignore", "wb")
       except IOError:
           print "The file does not exist!"
        
       fod.write(tmpCfg);
       fod.close();

       # Open/Create/Update the TCP/Port configuration file
       try:
        fo = open("configs/debugport.conf", "wb")
       except IOError:
           print "The file does not exist!"
       fo.write(debugport);
       # Close open file
       fo.close()

       # Open/Create/Update the Websocket/Port configuration file
       try:
        fo = open("configs/wsport.conf", "wb")
       except IOError:
           print "The file does not exist!"
       fo.write(wsport);
       # Close open file
       fo.close()

       # Open/Create/Update the UID/GID configuration file
       try:
        fo = open("configs/id.conf", "wb")
       except IOError:
           print "The file does not exist!"
       fo.write(name+":"+name);
       # Close open file
       fo.close()
       
       # Open/Create/Update the supervisor configuration file for cloud9
       try:
          fo = open("configs/supervisor_config/cloud9.conf", "wb")
       except IOError:
           print "The file does not exist!"
       fo.write("[program:cloud9]\n"+ "command = /cloud9/bin/cloud9.sh -l 0.0.0.0 -p "+ port +" --username "+ username +" -w /"+name+"\n"+
                 "directory = /cloud9\n"+ "user = root\n" + "autostart = true\n" + "autorestart = true\n"+ 
                 "stdout_logfile = /var/log/supervisor/cloud9.log\n"+ "stderr_logfile = /var/log/supervisor/cloud9_errors.log\n"+
                 "environment = NODE_ENV=\"production\", HOME=\"/home/"+name+"\"");
       # Close open file
       fo.close()
       if sn != "universal":
         # Open/Create/Update the supervisor configuration file for debugcontrolservice
         try:
            fo = open("configs/supervisor_config/debugcontrolservice.conf", "wb")
         except IOError:
             print "The file does not exist!"
         if startjlink == "1" or startoocd == "1":
             fo.write("[program:debugcontrolservice"+sn+"]\n"+ "command = /opt/DebugControlServiceHeadless/DebugControlServiceHeadless -s "+sn+" -e "+wsport+" -j "+jlinkport+" -o "+oocdport+" -sj "+startjlink+" -so "+startoocd+" -m "+target+" -wsscert /etc/letsencrypt/keystore.jks"+"\n"+
                   "user = root\n" + "autostart = true\n" + "autorestart = true\n"+ 
                   "stdout_logfile = /var/log/supervisor/debugcontrolservice"+sn+".log\n"+ "stderr_logfile = /var/log/supervisor/debugcontrolservice"+sn+"_errors.log\n"+
                   "environment = NODE_ENV=\"production\"");
         else:
             fo.write("[program:debugcontrolservice"+sn+"]\n"+ "command = /opt/DebugControlServiceHeadless/DebugControlServiceHeadless -s "+sn+" -e "+wsport+" -j "+jlinkport+" -o "+oocdport+" -sj "+startjlink+" -so "+startoocd+" -m "+target+" -wsscert /etc/letsencrypt/keystore.jks"+"\n"+
                   "user = root\n" + "autostart = false\n" + "autorestart = false\n"+ 
                   "stdout_logfile = /var/log/supervisor/debugcontrolservice"+sn+".log\n"+ "stderr_logfile = /var/log/supervisor/debugcontrolservice"+sn+"_errors.log\n"+
                   "environment = NODE_ENV=\"production\"");
         # Close open file
         fo.close()

       # Run docker 'build' command specifying machine name and workinggroup
       buildcmd = "docker build -t "+workstationname+"/ubuntu-cloud9-"+name+" .";
       pDockerBuild = subprocess.Popen(buildcmd.split(), stdout=subprocess.PIPE)
       # Grab stdout line by line as it becomes available.  This will loop until 
       # p terminates.
       while pDockerBuild.poll() is None:
        l = pDockerBuild.stdout.readline() # This blocks until it receives a newline.
        print l
       # When the subprocess terminates there might be unconsumed output 
       # that still needs to be processed.
       print pDockerBuild.stdout.read()
       
       # Run docker 'run' command specifying forwarded ports, machine name and workinggroup
       if sn == 'universal':
        runcmd = "docker run --name "+name+" --restart=always -p "+port+":"+port+" -p "+debugport+":"+debugport+" --privileged --cap-drop=ALL -v /dev/bus/usb:/dev/bus/usb -v /etc/letsencrypt:/etc/letsencrypt:ro -d "+workstationname+"/ubuntu-cloud9-"+name
        pDockerRun = subprocess.Popen(runcmd.split(), stdout=subprocess.PIPE)
       else: 
        runcmd = "docker run --name "+name+" --restart=always -p "+port+":"+port+" -p "+wsport+":"+wsport+" --privileged --cap-drop=ALL -v /dev/bus/usb:/dev/bus/usb -v /etc/letsencrypt:/etc/letsencrypt:ro -d "+workstationname+"/ubuntu-cloud9-"+name
        pDockerRun = subprocess.Popen(runcmd.split(), stdout=subprocess.PIPE)
       # Grab stdout line by line as it becomes available.  This will loop until 
       # p terminates.
       while pDockerRun.poll() is None:
        l = pDockerRun.stdout.readline() # This blocks until it receives a newline.
        print l
       # When the subprocess terminates there might be unconsumed output 
       # that still needs to be processed.
       print pDockerRun.stdout.read()

# Check and run main program
if __name__ == "__main__":
   main(sys.argv[1:])
