'use strict';

var AWS = require('aws-sdk');

console.log('Loading function');

exports.handler = (event, context, callback) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));
    const message = event.Records[0].Sns.Message;
    console.log('From SNS:', message);
    var cloudformation = new AWS.CloudFormation();

    //Inspect the Git event to see if InfraConfig.json was committed
    var commitsadded = message.commits[0].added;
    var commitsmodified = message.commits[0].modified;

    console.log('Commits added:', commitsadded);
    console.log('Commits modified:', commitsmodified);

    var infraconfigupdated = false;
    var filenme = "";
    for (var i = 0; i < commitsadded.length; i++) {
        if (commitsadded[i].indexOf("InfraConfig.json") > -1) {
            infraconfigupdated = true;
            filenme = commitsadded[i]
        }
    }
    for (var i = 0; i < commitsmodified.length; i++) {
        if (commitsmodified[i].indexOf("InfraConfig.json") > -1) {
            infraconfigupdated = true;
            filenme = commitsmodified[i]
        }
    }
    console.log('infraconfigupdated: ', infraconfigupdated);
    console.log('filename: ', filenme);

    //If InfraConfig.json was committed, retrieve its contents from Git
    
    //Firstly, obtain the branch and file name
    var brnch = message.repository.master_branch;
    var ownr = message.repository.full_name;
    var buildEnv = "";
    var stackName = "";
    var templateS3URL = "";
    var paramsFile = "";
    
    //Then read the file and examine its contents
    if (infraconfigupdated) {
        var fs = require('fs');
        var https = require('https');
        var gitPath = "/" + ownr + "/" + brnch;
        var fullFileName = gitPath + "/" + filenme;

        var options = {
            host: "raw.githubusercontent.com",
            port: 443,
            path: fullFileName,
            method: 'GET',
            rejectUnauthorized: false,
            requestCert: true,
            agent: false
        };

        var request = https.get(options, function(response) {
	        var contents = "";
			
			response.on('data', (d) => {
  				contents += d;
  			});
  			response.on('end', () => {
	    		try {
    	  			let parsedData = JSON.parse(contents);
      				console.log("file contents: ", parsedData);
      				buildEnv = parsedData.InfraConfig.BuildProjectEnvironment;
      				stackName = parsedData.InfraConfig.StackName;
      				templateS3URL = parsedData.InfraConfig.ProjectInfraCFTemplateS3URL;
      				paramsFile = parsedData.InfraConfig.CFParameterFileName;
      				console.log("buildEnv: ", buildEnv);
      				console.log("stackName: ", stackName);
      				console.log("templateS3URL: ", templateS3URL);
      				console.log("paramsFile: ", paramsFile);

                    if (buildEnv == 'true') {
                        //Call CloudFormation to build the stack
                        return buildCFStack (gitPath, stackName, templateS3URL, paramsFile);
                    }
	    		} catch (e) {
      				console.log(e.message);
    			}  
    		});
        });

        request.end();

        request.on('error', function(err) {
            throw (err);
        });
    }
    
    /*
    Build the CloudFormation stack
    */
    function buildCFStack(gitPath, stackName, templateS3URL, paramsFile) {

        //Since the AWS SDK does not support passing a CloudFormation parameters file by name
        //we have to read the parameters file here and pass it to CloudFormation
        //
        //Note that we expect the parameter file to be in the same folder as the 
        //InfraConfig.json file
        if (paramsFile) {
            var fs = require('fs');
            var https = require('https');
    
            var options = {
                host: "raw.githubusercontent.com",
                port: 443,
                path: gitPath + "/" + paramsFile,
                method: 'GET',
                rejectUnauthorized: false,
                requestCert: true,
                agent: false
            };
    
            var request = https.get(options, function(response) {
    	        var contents = "";
    			
    			response.on('data', (d) => {
      				contents += d;
      			});
      			response.on('end', () => {
    	    		try {
        	  			let parsedData = JSON.parse(contents);
          				console.log("param file contents: ", parsedData);
    
                        var params = {
                            StackName: stackName,
                            Capabilities: ['CAPABILITY_IAM'],
                            OnFailure: 'ROLLBACK',
                            Parameters: contents,
                            RoleARN: "arn:aws:iam::295744685835:role/infra-role",
                            TemplateURL: templateS3URL,
                            TimeoutInMinutes: 60
                        };
                      	console.log("CF create stack params: ", params);
                    
                        //cloudformation.createStack(params, function(err, data) {
                        //  if (err) console.log(err, err.stack); // an error occurred
                        //  else     console.log(data);           // successful response
                        //});
        
    	    		} catch (e) {
          				console.log(e.message);
        			}  
        		});
            });
    
            request.end();
    
            request.on('error', function(err) {
                throw (err);
            });
        }
    }
    callback(null, message);
};

