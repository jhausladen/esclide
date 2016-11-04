OUTNAME := firmware
OUTSUFFIX := .bin
SOURCE_ROOT := src
BUILDENV := ../build_environment

SOURCES = $(wildcard $(SOURCE_ROOT)/*.c) $(wildcard $(BUILDENV)/gcc/*.c)
VPATH = $(SOURCE_ROOT):$(BUILDENV)/gcc

include $(BUILDENV)/common.mk
