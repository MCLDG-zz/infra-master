#!/bin/bash
#
# Uploads CloudFormation template and Lambda function to S3
# Either creates or updates CloudFormation stack. Uses a rudimentary check to determine
# whether the stack already exists: if 'describe-stacks' returns a StackId then
# the stack does exists
#
zip -r -X GitHubHookLambda.js.zip GitHubHookLambda.js

aws --region=ap-southeast-1 s3 cp GitHubHookCFTemplate.json s3://infra-master/src/ --grants read=uri=http://acs.amazonaws.com/groups/global/AuthenticatedUsers 
aws --region=ap-southeast-1 s3 cp GitHubHookLambda.js.zip s3://infra-master/src/ --grants read=uri=http://acs.amazonaws.com/groups/global/AuthenticatedUsers 

stcks="$(aws --region=ap-southeast-1 cloudformation describe-stacks --stack-name githubhookstack)"

if printf %s\\n "${stcks}" | grep -qF "StackId"; then
	echo 'updating stack githubhookstack'
	aws --region=ap-southeast-1 cloudformation update-stack --stack-name githubhookstack --template-url https://s3-ap-southeast-1.amazonaws.com/infra-master/src/GitHubHookCFTemplate.json --capabilities CAPABILITY_NAMED_IAM
else
	echo 'creating stack githubhookstack'
	aws --region=ap-southeast-1 cloudformation create-stack --stack-name githubhookstack --template-url https://s3-ap-southeast-1.amazonaws.com/infra-master/src/GitHubHookCFTemplate.json --capabilities CAPABILITY_NAMED_IAM
fi