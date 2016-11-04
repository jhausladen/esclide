# On-Chip Debug System Software

This part of the repository hosts the source code and binary distribution of the used On-Chip Debug System Software such as OpenOCD or JLink GDB Server. 

## Requirements (Building OOCD)

  * make
  * libtool
  * pkg-config >= 0.23 (or compatible)
  * autoconf >= 2.64
  * automake >= 1.9
  * texinfo

## Building OOCD

    ./bootstrap
    ./configure
    make
    sudo checkinstall (Builds native package)  

## Requirements Cross-Compiling OOCD

  * TODO

## Cross-compiling OOCD

  * TODO

## Select debug target by serial number (OOCD)

  * Infineon:

    -c "jlink serial <serial>"
  
  * TI:

    -c "hla_serial <serial>"

## Select debug target by serial number (JLink)

    -select usb=<serial>
