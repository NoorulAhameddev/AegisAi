import { CodeCompilerTool } from "../src/tools/compiler";

async function runDetailedTest() {
    console.log("🔍 Detailed Compiler Testing\n");

    // Test JavaScript with math operations
    console.log("1️⃣ JavaScript - Math Operations");
    const jsResult = await CodeCompilerTool.execute({
        language: "javascript",
        code: `
            const nums = [1, 2, 3, 4, 5];
            const sum = nums.reduce((a, b) => a + b, 0);
            console.log("Array:", nums);
            console.log("Sum:", sum);
            return sum;
        `
    });
    console.log("Status:", jsResult.success ? "✅ SUCCESS" : "❌ FAILED");
    console.log("Output:", jsResult.output);
    console.log("Result:", jsResult.result);
    console.log();

    // Test Python with loops
    console.log("2️⃣ Python - Loop & Calculation");
    const pyResult = await CodeCompilerTool.execute({
        language: "python",
        code: `
for i in range(1, 6):
    print(f"Number: {i}, Square: {i**2}")
print("Done!")
        `
    });
    console.log("Status:", pyResult.success ? "✅ SUCCESS" : "❌ FAILED");
    console.log("Output:", pyResult.output);
    console.log();

    // Test TypeScript with types
    console.log("3️⃣ TypeScript - Type Safety");
    const tsResult = await CodeCompilerTool.execute({
        language: "typescript",
        code: `
interface User {
    name: string;
    age: number;
}

const user: User = { name: "Alice", age: 30 };
console.log(\`User: \${user.name}, Age: \${user.age}\`);

const greet = (u: User): string => \`Hello, \${u.name}!\`;
console.log(greet(user));
        `,
        timeout: 15000
    });
    console.log("Status:", tsResult.success ? "✅ SUCCESS" : "❌ FAILED");
    console.log("Output:", tsResult.output || "(no output captured)");
    if (tsResult.error) console.log("Error:", tsResult.error);
    console.log();

    // Test error handling
    console.log("4️⃣ Error Handling - Division by Zero");
    const errorResult = await CodeCompilerTool.execute({
        language: "javascript",
        code: `
            console.log("Testing error handling...");
            throw new Error("Intentional error!");
        `
    });
    console.log("Status:", errorResult.success ? "✅ SUCCESS" : "❌ FAILED (expected)");
    console.log("Error:", errorResult.error);
    console.log();

    // Summary
    console.log("📊 SUMMARY:");
    console.log("JavaScript:", jsResult.success ? "✅" : "❌");
    console.log("Python:", pyResult.success ? "✅" : "❌");
    console.log("TypeScript:", tsResult.success ? "✅" : "❌");
    console.log("Error Handling:", !errorResult.success ? "✅" : "❌");
}

runDetailedTest().catch(console.error);
