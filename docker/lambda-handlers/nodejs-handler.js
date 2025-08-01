const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

exports.lambdaHandler = async (event, context) => {
    const startTime = Date.now();
    
    try {
        // Parse the request
        let body;
        if (typeof event.body === 'string') {
            body = JSON.parse(event.body);
        } else {
            body = event.body || {};
        }
        
        const code = body.code || '';
        const input = body.input || '';
        
        if (!code) {
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
                    error: 'No code provided'
                })
            };
        }
        
        // Security validation
        const dangerousPatterns = [
            /require\s*\(\s*['"]fs['"]|\s*\)/gi,
            /require\s*\(\s*['"]child_process['"]|\s*\)/gi,
            /require\s*\(\s*['"]os['"]|\s*\)/gi,
            /process\.exit/gi,
            /eval\s*\(/gi,
            /Function\s*\(/gi,
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(code)) {
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
                        error: 'Code contains potentially unsafe operations'
                    })
                };
            }
        }
        
        // Create temporary file
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nodejs-'));
        const tempFile = path.join(tempDir, 'main.js');
        
        try {
            // Write code to file
            await fs.writeFile(tempFile, code);
            
            // Execute the code
            const result = await executeCode(tempFile, input);
            
            const executionTime = Date.now() - startTime;
            
            if (result.success) {
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS'
                    },
                    body: JSON.stringify({
                        success: true,
                        output: result.output,
                        executionTime: executionTime,
                        memoryUsed: 0  // Will be filled by CloudWatch
                    })
                };
            } else {
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: result.error,
                        executionTime: executionTime
                    })
                };
            }
            
        } finally {
            // Cleanup
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
            } catch (e) {
                console.error('Cleanup error:', e);
            }
        }
        
    } catch (error) {
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
                error: `Internal error: ${error.message}`,
                executionTime: Date.now() - startTime
            })
        };
    }
};

function executeCode(filePath, input) {
    return new Promise((resolve) => {
        const process = spawn('node', [filePath], {
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
            resolve({
                success: false,
                error: 'Code execution timed out (25 seconds limit)'
            });
        }, 25000);
        
        process.on('close', (code) => {
            clearTimeout(timer);
            
            if (code === 0) {
                resolve({
                    success: true,
                    output: stdout
                });
            } else {
                resolve({
                    success: false,
                    error: stderr || `Process exited with code ${code}`
                });
            }
        });
        
        process.on('error', (error) => {
            clearTimeout(timer);
            resolve({
                success: false,
                error: `Failed to start process: ${error.message}`
            });
        });
    });
}
