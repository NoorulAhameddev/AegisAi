import { CodeCompilerTool } from "../src/tools/compiler";

async function testCompiler() {
    console.log("🧪 Testing Code Compiler Tool\n");
    console.log("=" . repeat(50));

    // Test 1: JavaScript
    console.log("\n✅ Test 1: JavaScript Execution");
    const jsTest = await CodeCompilerTool.execute({
        language: "javascript",
        code: `
            console.log("Hello from JavaScript!");
            const sum = 5 + 3;
            console.log("Sum:", sum);
            return sum;
        `
    });
    console.log("Result:", JSON.stringify(jsTest, null, 2));

    // Test 2: Python
    console.log("\n✅ Test 2: Python Execution");
    const pyTest = await CodeCompilerTool.execute({
        language: "python",
        code: `
print("Hello from Python!")
x = 10
y = 20
print(f"Sum: {x + y}")
        `
    });
    console.log("Result:", JSON.stringify(pyTest, null, 2));

    // Test 3: TypeScript
    console.log("\n✅ Test 3: TypeScript Execution");
    const tsTest = await CodeCompilerTool.execute({
        language: "typescript",
        code: `
console.log("Hello from TypeScript!");
const multiply = (a: number, b: number): number => a * b;
console.log("Product: " + multiply(4, 5));
        `,
        timeout: 15000
    });
    console.log("Result:", JSON.stringify(tsTest, null, 2));

    // Test 4: Security Check
    console.log("\n🔒 Test 4: Security - Dangerous Code Detection");
    const dangerousTest = await CodeCompilerTool.execute({
        language: "javascript",
        code: `
            const fs = require('fs');
            fs.readFileSync('/etc/passwd');
        `
    });
    console.log("Result:", JSON.stringify(dangerousTest, null, 2));

    console.log("\n" + "=".repeat(50));
    console.log("✅ Compiler Tool Tests Complete!");
}

testCompiler().catch(console.error);
