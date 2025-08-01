import json
import subprocess
import tempfile
import os
import time
import uuid
import re

def lambda_handler(event, context):
    """Lambda handler for Python code execution"""
    
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
            r'import\s+os',
            r'import\s+sys',
            r'import\s+subprocess',
            r'__import__',
            r'eval\s*\(',
            r'exec\s*\(',
            r'open\s*\(',
            r'file\s*\(',
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
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        try:
            # Execute the code
            result = subprocess.run(
                ['python3', temp_file],
                input=input_data,
                capture_output=True,
                text=True,
                timeout=25  # Leave 5 seconds for Lambda overhead
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
            if os.path.exists(temp_file):
                os.unlink(temp_file)
                
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
                'error': 'Code execution timed out (25 seconds limit)',
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
