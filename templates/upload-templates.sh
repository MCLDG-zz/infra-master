#!/bin/bash
#
# Uploads CloudFormation templates used to create the various testing environments
#

aws --region=ap-southeast-1 s3 cp . s3://infra-master/ --recursive --exclude "*" --include "InfraCFTemplate*.json" --grants read=uri=http://acs.amazonaws.com/groups/global/AuthenticatedUsers 
