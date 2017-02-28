#!/usr/bin/env bash
#
# invoke using: 
#    ./do.sh &> /dev/null
# or
#    ./do.sh
SRC=$2

if [ "$1" == "html" ]
then
  asciidoctor -a imgext=png -a source-highlighter=pygments *.asciidoc
elif [ "$1" == "pdf" ]
then
  asciidoctor-pdf -a imgext=png -a source-highlighter=pygments *.asciidoc
else
  echo "Cleaining up ..."
  rm -rfv *~ *.aux *.bak *.log *.idx *.out *.toc $SRC.ilg $SRC.ind $SRC.tex $SRC.pdf $SRC.html
fi
