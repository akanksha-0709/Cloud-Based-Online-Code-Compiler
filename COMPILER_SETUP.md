# Setting up Compilers for Windows

## Current Status
Based on your system check:
- ✅ **Python**: Available and working
- ✅ **Java**: Available and working  
- ✅ **Node.js**: Available and working
- ❌ **GCC (C/C++)**: Not installed

## Install GCC for C/C++ Support

### Option 1: MinGW-w64 (Recommended)

1. **Download MinGW-w64**:
   - Go to: https://www.mingw-w64.org/downloads/
   - Choose "MingW-W64-builds"
   - Download the installer

2. **Install MinGW-w64**:
   - Run the installer
   - Choose these settings:
     - Version: Latest
     - Architecture: x86_64 (for 64-bit)
     - Threads: posix
     - Exception: seh
     - Build revision: Latest

3. **Add to PATH**:
   - Add `C:\mingw64\bin` to your Windows PATH environment variable
   - Open Command Prompt and type: `gcc --version` to verify

### Option 2: MSYS2 (Alternative)

1. **Download MSYS2**:
   - Go to: https://www.msys2.org/
   - Download and install

2. **Install GCC**:
   ```bash
   pacman -S mingw-w64-x86_64-gcc
   ```

3. **Add to PATH**:
   - Add `C:\msys64\mingw64\bin` to your PATH

### Option 3: Visual Studio Build Tools

1. **Download Visual Studio Build Tools**:
   - Go to: https://visualstudio.microsoft.com/downloads/
   - Download "Build Tools for Visual Studio"

2. **Install C++ tools**:
   - Select "C++ build tools" workload
   - This provides `cl.exe` compiler

## Testing Your Installation

After installing GCC, restart your command prompt and test:

```powershell
# Test GCC
gcc --version

# Test your compiler project
cd "project"
npm run dev
```

You should now see:
```
📊 Compiler availability:
  Python: ✅ Available
  GCC (C/C++): ✅ Available
  Java: ✅ Available
  Node.js: ✅ Available
```

## Quick Test

Once GCC is installed, you can test C++ code:

```cpp
#include <iostream>
using namespace std;

int main() {
    cout << "Hello from C++!" << endl;
    return 0;
}
```

And C code:
```c
#include <stdio.h>

int main() {
    printf("Hello from C!\n");
    return 0;
}
```

## Currently Working Languages

Right now you can test these languages in your compiler:

1. **Python** ✅ - Fully working
2. **JavaScript (Node.js)** ✅ - Fully working  
3. **Java** ✅ - Fully working
4. **C/C++** ❌ - Needs GCC installation

## Testing Your Compiler

1. Open: http://localhost:5173
2. Select "Python" or "JavaScript (Node.js)" or "Java"
3. Write some code and click "Run Code"
4. You should see the output!

The server will now give you clear error messages if you try to use C/C++ without GCC installed.
