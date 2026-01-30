import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

async function testTSExec() {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `code_${Date.now()}.ts`);
    const outputFile = path.join(tempDir, `output_${Date.now()}.txt`);

    const code = `
interface User {
    name: string;
    age: number;
}

const user: User = { name: "Alice", age: 30 };
console.log(\`User: \${user.name}, Age: \${user.age}\`);

const greet = (u: User): string => \`Hello, \${u.name}!\`;
console.log(greet(user));
    `;

    fs.writeFileSync(tempFile, code);
    
    console.log("Temp file:", tempFile);
    console.log("Output file:", outputFile);
    
    try {
        execSync(`npx ts-node "${tempFile}" > "${outputFile}" 2>&1`, {
            timeout: 15000,
            encoding: "utf-8",
            shell: 'cmd.exe'
        });
        
        console.log("Execution completed");
        console.log("Output file exists:", fs.existsSync(outputFile));
        
        if (fs.existsSync(outputFile)) {
            const output = fs.readFileSync(outputFile, 'utf-8');
            console.log("Output length:", output.length);
            console.log("Output content:");
            console.log(output);
            fs.unlinkSync(outputFile);
        }
        
        fs.unlinkSync(tempFile);
    } catch (error: any) {
        console.log("Error:", error.message);
        console.log("Output file exists after error:", fs.existsSync(outputFile));
        
        if (fs.existsSync(outputFile)) {
            const output = fs.readFileSync(outputFile, 'utf-8');
            console.log("Output from error case:");
            console.log(output);
        }
    }
}

testTSExec();
