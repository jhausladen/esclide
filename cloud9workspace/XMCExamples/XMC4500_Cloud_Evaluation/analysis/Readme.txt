execute WCET: go to bin folder and execute:
owcet2 firmware.elf -s xmc4500.osx -f flowfacts.ffx -B <function-name>
owcet firmware.elf -s xmc4500.osx -f flowfacts.ffx main

generate flowfacts:
mkff firmware.elf main
