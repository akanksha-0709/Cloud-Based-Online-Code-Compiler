const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Create temp directory if it doesn't exist
const TEMP_DIR = path.join(__dirname, 'temp');

async function ensureTempDir() {
  try {
    await fs.access(TEMP_DIR);
  } catch {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  }
}

// Detect operating system
const isWindows = process.platform === 'win32';

// Function to check if a command is available
async function isCommandAvailable(command) {
  return new Promise((resolve) => {
    const testCommand = isWindows ? `where ${command}` : `which ${command}`;
    const { exec } = require('child_process');
    
    exec(testCommand, (error, stdout, stderr) => {
      resolve(!error && stdout.trim() !== '');
    });
  });
}

// Check available compilers on startup
async function checkCompilers() {
  const compilers = {
    python: await isCommandAvailable(isWindows ? 'python' : 'python3'),
    gcc: await isCommandAvailable('gcc'),
    javac: await isCommandAvailable('javac'),
    java: await isCommandAvailable('java'),
    node: await isCommandAvailable('node')
  };
  
  console.log('📊 Compiler availability:');
  console.log(`  Python: ${compilers.python ? '✅ Available' : '❌ Not found'}`);
  console.log(`  GCC (C/C++): ${compilers.gcc ? '✅ Available' : '❌ Not found'}`);
  console.log(`  Java: ${compilers.javac && compilers.java ? '✅ Available' : '❌ Not found'}`);
  console.log(`  Node.js: ${compilers.node ? '✅ Available' : '❌ Not found'}`);
  
  if (!compilers.gcc) {
    console.log('⚠️  To enable C/C++ support, install GCC:');
    console.log('   Windows: Install MinGW-w64 or MSYS2');
    console.log('   https://www.mingw-w64.org/downloads/');
  }
  
  return compilers;
}

// Language configurations
const LANGUAGE_CONFIGS = {
  python: {
    extension: 'py',
    command: isWindows ? 'python' : 'python3',
    args: [],
    timeout: 10000
  },
  cpp: {
    extension: 'cpp',
    compileCommand: 'g++',
    compileArgs: isWindows ? ['-o', 'program.exe'] : ['-o', 'program'],
    command: isWindows ? '.\\program.exe' : './program',
    args: [],
    timeout: 15000
  },
  java: {
    extension: 'java',
    compileCommand: 'javac',
    compileArgs: [],
    command: 'java',
    args: ['Main'],
    timeout: 15000
  },
  c: {
    extension: 'c',
    compileCommand: 'gcc',
    compileArgs: isWindows ? ['-o', 'program.exe'] : ['-o', 'program'],
    command: isWindows ? '.\\program.exe' : './program',
    args: [],
    timeout: 15000
  },
  javascript: {
    extension: 'js',
    command: 'node',
    args: [],
    timeout: 10000
  }
};

// Simulate AWS Lambda execution environment
class CodeExecutor {
  constructor() {
    this.executionLimit = 30000; // 30 seconds max
  }

  async executeCode({ language, code, input = '' }) {
    const startTime = Date.now();
    const executionId = uuidv4();
    const tempDir = path.join(TEMP_DIR, executionId);
    
    try {
      // Create execution directory
      await fs.mkdir(tempDir, { recursive: true });
      
      const config = LANGUAGE_CONFIGS[language];
      if (!config) {
        throw new Error(`Unsupported language: ${language}`);
      }

      // Check if required compiler/interpreter is available
      if (config.compileCommand) {
        const isAvailable = await isCommandAvailable(config.compileCommand);
        if (!isAvailable) {
          throw new Error(`${config.compileCommand} compiler not found. Please install ${language === 'cpp' || language === 'c' ? 'GCC' : config.compileCommand} to run ${language} code.`);
        }
      } else {
        const isAvailable = await isCommandAvailable(config.command);
        if (!isAvailable) {
          throw new Error(`${config.command} interpreter not found. Please install ${config.command} to run ${language} code.`);
        }
      }

      // Write source code to file
      const sourceFile = path.join(tempDir, `main.${config.extension}`);
      await fs.writeFile(sourceFile, code);

      let result;
      
      // Handle compiled languages
      if (config.compileCommand) {
        result = await this.compileAndRun(tempDir, sourceFile, config, input);
      } else {
        // Handle interpreted languages
        result = await this.runInterpreted(tempDir, sourceFile, config, input);
      }

      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        output: result.output,
        executionTime,
        memoryUsed: result.memoryUsed || Math.floor(Math.random() * 1000) + 100 // Mock memory usage
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        error: error.message,
        executionTime
      };
    } finally {
      // Cleanup
      try {
        await this.cleanupDirectory(tempDir);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
  }

  async compileAndRun(tempDir, sourceFile, config, input) {
    const isWindows = process.platform === 'win32';
    const executablePath = isWindows ? 
      path.join(tempDir, 'program.exe') : 
      path.join(tempDir, 'program');
    
    // Compile
    const compileResult = await this.runCommand(
      config.compileCommand,
      [...config.compileArgs, executablePath, sourceFile],
      tempDir,
      '',
      5000
    );

    if (compileResult.code !== 0) {
      throw new Error(`Compilation Error:\n${compileResult.stderr}`);
    }

    // Run
    return await this.runCommand(
      config.command,
      config.args,
      tempDir,
      input,
      config.timeout
    );
  }

  async runInterpreted(tempDir, sourceFile, config, input) {
    return await this.runCommand(
      config.command,
      [...config.args, sourceFile],
      tempDir,
      input,
      config.timeout
    );
  }

  runCommand(command, args, cwd, input, timeout) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Send input if provided
      if (input) {
        process.stdin.write(input);
      }
      process.stdin.end();

      // Set timeout
      const timer = setTimeout(() => {
        process.kill('SIGKILL');
        reject(new Error('Execution timeout exceeded'));
      }, timeout);

      process.on('close', (code) => {
        clearTimeout(timer);
        
        if (code === 0) {
          resolve({
            code,
            output: stdout,
            stderr,
            memoryUsed: Math.floor(Math.random() * 1000) + 100
          });
        } else {
          const errorMessage = stderr || `Process exited with code ${code}`;
          reject(new Error(errorMessage));
        }
      });

      process.on('error', (error) => {
        clearTimeout(timer);
        reject(new Error(`Failed to start process: ${error.message}`));
      });
    });
  }

  async cleanupDirectory(dirPath) {
    try {
      const files = await fs.readdir(dirPath);
      await Promise.all(
        files.map(file => fs.unlink(path.join(dirPath, file)))
      );
      await fs.rmdir(dirPath);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

// Initialize executor
const executor = new CodeExecutor();

// API Routes
app.post('/api/execute', async (req, res) => {
  try {
    const { language, code, input } = req.body;

    // Validation
    if (!language || !code) {
      return res.status(400).json({
        success: false,
        error: 'Language and code are required'
      });
    }

    if (!LANGUAGE_CONFIGS[language]) {
      return res.status(400).json({
        success: false,
        error: `Unsupported language: ${language}`
      });
    }

    // Security checks
    if (code.length > 50000) {
      return res.status(400).json({
        success: false,
        error: 'Code size exceeds maximum limit (50KB)'
      });
    }

    // Basic security: block dangerous operations
    const dangerousPatterns = [
      /import\s+os/gi,
      /import\s+subprocess/gi,
      /system\s*\(/gi,
      /exec\s*\(/gi,
      /eval\s*\(/gi,
      /#include\s*<unistd\.h>/gi,
      /fork\s*\(/gi,
      /Runtime\.getRuntime/gi
    ];

    const hasDangerousCode = dangerousPatterns.some(pattern => pattern.test(code));
    if (hasDangerousCode) {
      return res.status(400).json({
        success: false,
        error: 'Code contains potentially unsafe operations'
      });
    }

    // Execute code
    const result = await executor.executeCode({ language, code, input });
    res.json(result);

  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
async function startServer() {
  try {
    await ensureTempDir();
    await checkCompilers();
    app.listen(PORT, () => {
      console.log(`Code execution server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();