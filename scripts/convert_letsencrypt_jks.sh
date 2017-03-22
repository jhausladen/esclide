#!/bin/bash

# This script is used to convert Let's Encrypt certificates to a valid Java keystore file for the use with Jetty
# author:    Jürgen Hausladen
# copyright: 2017, SAT, UAS Technikum Wien
# License:   AGPL <http://www.gnu.org/licenses/agpl.txt>

# Configuration options
JDK=/home/juergen/JDK/jdk1.8.0_111/
keytool=$JDK"bin/keytool"
certdir=/etc/letsencrypt/
domain=cloud-emb.technikum-wien.at
password=cloud-emb
keystoredir=$certdir
keystorename="keystore.jks"

# Backup the current Java keystore file
sudo mv /etc/letsencrypt/keystore.jks /etc/letsencrypt/keystoreold.jks

# Convert certificate chain & private key to the PKCS#12 file format
sudo openssl pkcs12 -export -out keystore.pkcs12 -in $certdir/live/$domain/fullchain.pem -inkey $certdir/live/$domain/privkey.pem -password pass:$password

# Convert PKCS#12 file to the Java keystore format
sudo $keytool -importkeystore -srckeystore keystore.pkcs12 -srcstoretype PKCS12 -destkeystore $keystoredir$keystorename -srcstorepass $password -deststorepass $password -destkeypass $password

# Remove the PKCS#12 file
rm -f keystore.pkcs12