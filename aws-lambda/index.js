const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Initialize AWS services
const ecs = new AWS.ECS({ region: process.env.AWS_REGION || 'us-east-1' });
const logs = new AWS.CloudWatchLogs({ region: process.env.AWS_REGION || 'us-east-1' });

// Configuration
const CLUSTER_NAME = process.env.ECS_CLUSTER_NAME || 'code-compiler-cluster';
const TASK_DEFINITION = process.env.TASK_DEFINITION || 'code-compiler-task';
const SUBNET_ID = process.env.SUBNET_ID;
const SECURITY_GROUP_ID = process.env.SECURITY_GROUP_ID;

// Language configurations for Docker containers
const LANGUAGE_CONFIGS = {
  python: {
    image: 'python:3.9-alpine',
    command: ['python3', '-c'],
    fileExtension: 'py',
    timeout: 30000
  },
  cpp: {
    image: 'gcc:9',
    command: ['sh', '-c'],
    compileCommand: 'g++ -o /tmp/program /tmp/code.cpp && /tmp/program',
    fileExtension: 'cpp',
    timeout: 45000
  },
  java: {
    image: 'openjdk:11-alpine',
    command: ['sh', '-c'],
    compileCommand: 'cd /tmp && javac Main.java && java Main',
    fileExtension: 'java',
    timeout: 45000
  },
  c: {
    image: 'gcc:9',
    command: ['sh', '-c'],
    compileCommand: 'gcc -o /tmp/program /tmp/code.c && /tmp/program',
    fileExtension: 'c',
    timeout: 45000
  },
  javascript: {
    image: 'node:16-alpine',
    command: ['node', '-e'],
    fileExtension: 'js',
    timeout: 30000
  }
};

// Security validator
class SecurityValidator {
  static validate(code, language) {
    const errors = [];
    
    // Common dangerous patterns
    const dangerousPatterns = {
      filesystem: [
        /import\s+os/gi,
        /import\s+sys/gi,
        /import\s+subprocess/gi,
        /#include\s*<unistd\.h>/gi,
        /#include\s*<sys\/.*>/gi,
        /Runtime\.getRuntime/gi,
        /ProcessBuilder/gi,
        /require\s*\(\s*['"]fs['"]|\s*\)/gi,
        /require\s*\(\s*['"]child_process['"]|\s*\)/gi
      ],
      network: [
        /import\s+socket/gi,
        /import\s+urllib/gi,
        /import\s+requests/gi,
        /#include\s*<netinet\/.*>/gi,
        /require\s*\(\s*['"]http['"]|\s*\)/gi,
        /require\s*\(\s*['"]https['"]|\s*\)/gi,
        /require\s*\(\s*['"]net['"]|\s*\)/gi
      ],
      execution: [
        /system\s*\(/gi,
        /exec\s*\(/gi,
        /eval\s*\(/gi,
        /fork\s*\(/gi,
        /spawn\s*\(/gi
      ]
    };

    // Check for dangerous patterns
    Object.entries(dangerousPatterns).forEach(([category, patterns]) => {
      patterns.forEach(pattern => {
        if (pattern.test(code)) {
          errors.push(`Potentially unsafe ${category} operation detected`);
        }
      });
    });

    // Language-specific checks
    if (language === 'python') {
      if (code.includes('__import__')) {
        errors.push('Dynamic imports are not allowed');
      }
    }

    if (language === 'java') {
      if (code.includes('System.exit')) {
        errors.push('System.exit() is not allowed');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Docker executor using ECS Fargate
class DockerExecutor {
  async executeCode({ language, code, input = '' }) {
    const executionId = uuidv4();
    const startTime = Date.now();
    
    try {
      // Validate code security
      const validation = SecurityValidator.validate(code, language);
      if (!validation.isValid) {
        throw new Error(`Security validation failed: ${validation.errors.join(', ')}`);
      }

      const config = LANGUAGE_CONFIGS[language];
      if (!config) {
        throw new Error(`Unsupported language: ${language}`);
      }

      // Prepare the execution command
      let command;
      if (language === 'python') {
        command = [config.command[0], config.command[1], code];
      } else if (language === 'javascript') {
        command = [config.command[0], config.command[1], code];
      } else {
        // For compiled languages, we need to write files and compile
        command = ['sh', '-c', this.buildCompileCommand(language, code, config)];
      }

      // Run container using ECS Fargate
      const result = await this.runDockerContainer(config.image, command, input, config.timeout);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        output: result.output,
        executionTime,
        memoryUsed: result.memoryUsed
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        error: error.message,
        executionTime
      };
    }
  }

  buildCompileCommand(language, code, config) {
    const filename = `/tmp/code.${config.fileExtension}`;
    let command = `echo '${code.replace(/'/g, "'\\''")}' > ${filename} && `;
    
    if (language === 'java') {
      // Java needs special handling for class name
      const className = this.extractJavaClassName(code) || 'Main';
      const javaFile = `/tmp/${className}.java`;
      command = `echo '${code.replace(/'/g, "'\\''")}' > ${javaFile} && cd /tmp && javac ${className}.java && java ${className}`;
    } else {
      command += config.compileCommand;
    }
    
    return command;
  }

  extractJavaClassName(code) {
    const match = code.match(/public\s+class\s+(\w+)/);
    return match ? match[1] : null;
  }

  async runDockerContainer(image, command, input, timeout) {
    // Create ECS task definition for this execution
    const taskDefinition = {
      family: `code-exec-${Date.now()}`,
      networkMode: 'awsvpc',
      requiresCompatibilities: ['FARGATE'],
      cpu: '256',
      memory: '512',
      executionRoleArn: process.env.EXECUTION_ROLE_ARN,
      containerDefinitions: [{
        name: 'code-executor',
        image: image,
        command: command,
        memory: 512,
        essential: true,
        logConfiguration: {
          logDriver: 'awslogs',
          options: {
            'awslogs-group': '/aws/ecs/code-compiler',
            'awslogs-region': process.env.AWS_REGION || 'us-east-1',
            'awslogs-stream-prefix': 'execution'
          }
        },
        environment: [
          { name: 'INPUT_DATA', value: input }
        ]
      }]
    };

    try {
      // Register task definition
      const registerResult = await ecs.registerTaskDefinition(taskDefinition).promise();
      const taskDefArn = registerResult.taskDefinition.taskDefinitionArn;

      // Run task
      const runResult = await ecs.runTask({
        cluster: CLUSTER_NAME,
        taskDefinition: taskDefArn,
        launchType: 'FARGATE',
        networkConfiguration: {
          awsvpcConfiguration: {
            subnets: [SUBNET_ID],
            securityGroups: [SECURITY_GROUP_ID],
            assignPublicIp: 'ENABLED'
          }
        }
      }).promise();

      const taskArn = runResult.tasks[0].taskArn;

      // Wait for task completion with timeout
      await this.waitForTaskCompletion(taskArn, timeout);

      // Get logs
      const output = await this.getTaskLogs(taskArn);

      // Cleanup task definition
      await ecs.deregisterTaskDefinition({
        taskDefinition: taskDefArn
      }).promise();

      return {
        output,
        memoryUsed: Math.floor(Math.random() * 400) + 100 // Mock memory usage
      };

    } catch (error) {
      throw new Error(`Docker execution failed: ${error.message}`);
    }
  }

  async waitForTaskCompletion(taskArn, timeout) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const result = await ecs.describeTasks({
        cluster: CLUSTER_NAME,
        tasks: [taskArn]
      }).promise();

      const task = result.tasks[0];
      if (task.lastStatus === 'STOPPED') {
        if (task.stopCode === 'TaskFailedToStart' || task.containers[0].exitCode !== 0) {
          throw new Error('Task execution failed');
        }
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Stop task if timeout exceeded
    await ecs.stopTask({
      cluster: CLUSTER_NAME,
      task: taskArn,
      reason: 'Execution timeout exceeded'
    }).promise();

    throw new Error('Execution timeout exceeded');
  }

  async getTaskLogs(taskArn) {
    try {
      const logGroupName = '/aws/ecs/code-compiler';
      const logStreamName = `execution/${taskArn.split('/').pop()}`;

      const result = await logs.getLogEvents({
        logGroupName,
        logStreamName,
        startFromHead: true
      }).promise();

      return result.events.map(event => event.message).join('\n');
    } catch (error) {
      console.error('Failed to retrieve logs:', error);
      return 'Output retrieval failed';
    }
  }
}

// Lambda handler
exports.handler = async (event, context) => {
  const executor = new DockerExecutor();
  
  try {
    // Parse request
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { language, code, input } = body;

    // Validation
    if (!language || !code) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Language and code are required'
        })
      };
    }

    if (code.length > 50000) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Code size exceeds maximum limit (50KB)'
        })
      };
    }

    // Execute code
    const result = await executor.executeCode({ language, code, input });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Lambda execution error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
};

// Handle CORS preflight
exports.optionsHandler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: ''
  };
};
