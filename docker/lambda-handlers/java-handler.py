import json
import subprocess
import tempfile
import os
import time
import re

def lambda_handler(event, context):
    """Lambda handler for Java code execution"""
    
    start_time = time.time()
    
    try:
        # Parse the request
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})
            
        code = body.get('code', '')
        input_data = body.get('input', '')
        
        if not code:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'success': False,
                    'error': 'No code provided'
                })
            }
        
        # Security validation
        dangerous_patterns = [
            r'Runtime\.getRuntime',
            r'ProcessBuilder',
            r'System\.exit',
            r'java\.lang\.reflect',
            r'java\.io\.File',
            r'java\.nio\.file',
        ]
        
        for pattern in dangerous_patterns:
            if re.search(pattern, code, re.IGNORECASE):
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS'
                    },
                    'body': json.dumps({
                        'success': False,
                        'error': 'Code contains potentially unsafe operations'
                    })
                }
        
        # Extract class name or use Main as default
        class_match = re.search(r'public\s+class\s+(\w+)', code)
        class_name = class_match.group(1) if class_match else 'Main'
        
        # Create temporary directory
        temp_dir = tempfile.mkdtemp()
        java_file = os.path.join(temp_dir, f'{class_name}.java')
        
        try:
            # Write Java code to file
            with open(java_file, 'w') as f:
                f.write(code)
            
            # Compile Java code
            compile_result = subprocess.run(
                ['javac', java_file],
                capture_output=True,
                text=True,
                timeout=10,
                cwd=temp_dir
            )
            
            if compile_result.returncode != 0:
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS'
                    },
                    'body': json.dumps({
                        'success': False,
                        'error': f'Compilation Error:\n{compile_result.stderr}',
                        'executionTime': int((time.time() - start_time) * 1000)
                    })
                }
            
            # Execute the compiled class
            result = subprocess.run(
                ['java', '-Xmx256m', '-cp', temp_dir, class_name],
                input=input_data,
                capture_output=True,
                text=True,
                timeout=20  # Leave time for compilation + Lambda overhead
            )
            
            execution_time = int((time.time() - start_time) * 1000)
            
            if result.returncode == 0:
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS'
                    },
                    'body': json.dumps({
                        'success': True,
                        'output': result.stdout,
                        'executionTime': execution_time,
                        'memoryUsed': 0  # Will be filled by CloudWatch
                    })
                }
            else:
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS'
                    },
                    'body': json.dumps({
                        'success': False,
                        'error': result.stderr or 'Execution failed',
                        'executionTime': execution_time
                    })
                }
                
        finally:
            # Cleanup
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
                
    except subprocess.TimeoutExpired:
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'success': False,
                'error': 'Code execution timed out',
                'executionTime': int((time.time() - start_time) * 1000)
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'success': False,
                'error': f'Internal error: {str(e)}',
                'executionTime': int((time.time() - start_time) * 1000)
            })
        }
