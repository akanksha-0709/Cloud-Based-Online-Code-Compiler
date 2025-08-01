import { Language } from '../types';

export const SUPPORTED_LANGUAGES: Language[] = [
  {
    id: 'python',
    name: 'Python',
    extension: 'py',
    template: `# Welcome to the Online Code Compiler
# Write your Python code here

def main():
    print("Hello, World!")
    
    # Example: Read input
    # name = input("Enter your name: ")
    # print(f"Hello, {name}!")

if __name__ == "__main__":
    main()
`
  },
  {
    id: 'javascript',
    name: 'JavaScript (Node.js)',
    extension: 'js',
    template: `// Welcome to the Online Code Compiler
// Write your JavaScript code here

function main() {
    console.log("Hello, World!");
    
    // Example: Read input (uncomment the lines below)
    // const readline = require('readline');
    // const rl = readline.createInterface({
    //     input: process.stdin,
    //     output: process.stdout
    // });
    // 
    // rl.question('Enter your name: ', (name) => {
    //     console.log(\`Hello, \${name}!\`);
    //     rl.close();
    // });
}

main();
`
  },
  {
    id: 'java',
    name: 'Java',
    extension: 'java',
    template: `// Welcome to the Online Code Compiler
// Write your Java code here

import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        
        // Example: Read input
        // Scanner scanner = new Scanner(System.in);
        // System.out.print("Enter your name: ");
        // String name = scanner.nextLine();
        // System.out.println("Hello, " + name + "!");
        // scanner.close();
    }
}
`
  },
  {
    id: 'cpp',
    name: 'C++ (requires GCC)',
    extension: 'cpp',
    template: `// Welcome to the Online Code Compiler
// Write your C++ code here
// Note: GCC compiler required - see README for installation

#include <iostream>
#include <string>

using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    
    // Example: Read input
    // string name;
    // cout << "Enter your name: ";
    // getline(cin, name);
    // cout << "Hello, " << name << "!" << endl;
    
    return 0;
}
`
  },
  {
    id: 'c',
    name: 'C (requires GCC)',
    extension: 'c',
    template: `// Welcome to the Online Code Compiler
// Write your C code here
// Note: GCC compiler required - see README for installation

#include <stdio.h>
#include <string.h>

int main() {
    printf("Hello, World!\\n");
    
    // Example: Read input
    // char name[100];
    // printf("Enter your name: ");
    // fgets(name, sizeof(name), stdin);
    // name[strcspn(name, "\\n")] = 0; // Remove newline
    // printf("Hello, %s!\\n", name);
    
    return 0;
}
`
  }
];

export const getLanguageById = (id: string): Language | undefined => {
  return SUPPORTED_LANGUAGES.find(lang => lang.id === id);
};