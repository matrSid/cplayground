#!/usr/bin/env bash

# Update and install dependencies
apt-get update && apt-get install -y g++

# Install Python dependencies
pip install -r requirements.txt
