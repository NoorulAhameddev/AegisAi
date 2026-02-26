/**
 * Serverless Function Framework
 *
 * ⚠️ DEPRECATED ⚠️
 * This module uses vm2 which has known security vulnerabilities (CVE-2023-37466).
 * The feature is DISABLED by default (ENABLE_SERVERLESS_FUNCTIONS=false).
 *
 * TODO: Migrate to a secure execution environment:
 * - Deno Deploy (deno.com/deploy)
 * - Cloudflare Workers
 * - AWS Lambda
 * - WebContainer API (StackBlitz)
 *
 * DO NOT ENABLE IN PRODUCTION
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { encrypt, decrypt } from "@/lib/encryption";
import { env } from "@/lib/env";
// vm2 is deprecated and has CVE-2023-37466 - DO NOT USE
// import { VM } from 'vm2';
import path from "path";
import fs from "fs/promises";

export type FunctionRuntime = "javascript" | "typescript";

/**
 * Check if serverless function execution is enabled
 * Returns error if disabled due to vm2 vulnerability (CVE-2023-37466)
 */
function checkServerlessFunctionsEnabled(): {
  enabled: boolean;
  error?: string;
} {
  if (!env.ENABLE_SERVERLESS_FUNCTIONS) {
    return {
      enabled: false,
      error:
        "Serverless function execution is currently disabled due to a critical security vulnerability (CVE-2023-37466). This feature is being migrated to a secure execution environment.",
    };
  }
  return { enabled: true };
}

export interface ServerlessFunction {
  id: string;
  userId: string;
  name: string;
  description?: string;
  code: string;
  runtime: FunctionRuntime;
  environmentVariables?: Record<string, string>;
  timeout: number; // milliseconds
  memory: number; // MB
  status: "draft" | "active" | "disabled";
  triggers?: FunctionTrigger[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FunctionTrigger {
  type: "http" | "webhook" | "schedule" | "event";
  config: Record<string, any>;
}

export interface FunctionExecution {
  id: string;
  functionId: string;
  status: "running" | "success" | "error" | "timeout";
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  duration: number; // milliseconds
  memoryUsed: number; // MB
  executedAt: Date;
}

/**
 * Create new serverless function
 */
export async function createServerlessFunction(
  userId: string,
  name: string,
  code: string,
  runtime: FunctionRuntime = "javascript",
  options?: {
    description?: string;
    timeout?: number;
    memory?: number;
    environmentVariables?: Record<string, string>;
  },
) {
  // CRITICAL SECURITY CHECK: Feature disabled due to vm2 vulnerability
  const securityCheck = checkServerlessFunctionsEnabled();
  if (!securityCheck.enabled) {
    throw new Error(securityCheck.error);
  }

  try {
    // Validate code syntax
    await validateFunctionCode(code, runtime);

    const encryptedCode = await encrypt(code);
    const encryptedEnv =
      options?.environmentVariables &&
      Object.keys(options.environmentVariables).length > 0
        ? await encrypt(JSON.stringify(options.environmentVariables))
        : undefined;

    const func = await prisma.serverlessFunction.create({
      data: {
        userId,
        name,
        code: encryptedCode,
        runtime,
        description: options?.description,
        timeout: options?.timeout || 30000,
        memory: options?.memory || 128,
        status: "draft",
        environmentVariables: encryptedEnv,
      },
    });

    logger.worker("serverless:create", "success", {
      userId,
      funcId: func.id,
      name,
    });

    return func;
  } catch (error) {
    logger.error("Failed to create serverless function", error as Error, {
      userId,
    });
    throw error;
  }
}

/**
 * Deploy function (make it active)
 */
export async function deployServerlessFunction(
  functionId: string,
  userId: string,
): Promise<ServerlessFunction> {
  // CRITICAL SECURITY CHECK: Feature disabled due to vm2 vulnerability
  const securityCheck = checkServerlessFunctionsEnabled();
  if (!securityCheck.enabled) {
    throw new Error(securityCheck.error);
  }

  try {
    // Verify ownership
    const func = await prisma.serverlessFunction.findUnique({
      where: { id: functionId },
    });

    if (!func || func.userId !== userId) {
      throw new Error("Function not found or access denied");
    }

    // Test execution before deploying
    await executeServerlessFunction(functionId, userId, {});

    // Deploy
    const updated = await prisma.serverlessFunction.update({
      where: { id: functionId },
      data: { status: "active" },
    });

    logger.worker("serverless:deploy", "success", {
      userId,
      funcId: functionId,
    });

    return updated as ServerlessFunction;
  } catch (error) {
    logger.error("Failed to deploy function", error as Error, {
      functionId,
      userId,
    });
    throw error;
  }
}

/**
 * Execute serverless function
 */
export async function executeServerlessFunction(
  functionId: string,
  userId: string,
  input?: Record<string, any>,
  executionTimeout?: number,
): Promise<FunctionExecution> {
  // CRITICAL SECURITY CHECK: Feature disabled due to vm2 vulnerability
  const securityCheck = checkServerlessFunctionsEnabled();
  if (!securityCheck.enabled) {
    throw new Error(securityCheck.error);
  }

  const startTime = Date.now();

  try {
    // Get function
    const func = await prisma.serverlessFunction.findUnique({
      where: { id: functionId },
    });

    if (!func || func.userId !== userId) {
      throw new Error("Function not found or access denied");
    }

    if (func.status === "disabled") {
      throw new Error("Function is disabled");
    }

    // Decrypt code and environment
    const decryptedCode = await decrypt(func.code);
    const decryptedEnv = func.environmentVariables
      ? JSON.parse(await decrypt(func.environmentVariables))
      : {};

    // Create execution context with sandbox environment
    const context = {
      console,
      JSON,
      Math,
      Date,
      // Add user input
      input: input || {},
      // Add environment variables
      env: decryptedEnv,
      // Add allowed built-in modules
      fetch: globalThis.fetch,
    };

    // Execute in sandbox
    const timeout = executionTimeout || func.timeout;
    let output: any;
    let error: string | undefined;

    try {
      // ⚠️ DEPRECATED: vm2 is disabled due to CVE-2023-37466
      // This code should NEVER be enabled in production
      throw new Error(
        "Serverless execution is disabled due to security vulnerabilities",
      );

      // const vm = new VM({
      //   timeout,
      //   sandbox: context,
      // });
      // output = vm.run(decryptedCode);
    } catch (err) {
      error = (err as Error).message;
      if (error.includes("Script execution timed out")) {
        error = `Function timed out after ${timeout}ms`;
      }
    }

    const duration = Date.now() - startTime;
    const memoryUsed = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

    // Record execution
    const execution = await prisma.functionExecution.create({
      data: {
        functionId,
        status: error ? "error" : "success",
        input,
        output,
        error,
        duration,
        memoryUsed,
      },
    });

    logger.worker("serverless:execute", "completed", {
      userId,
      funcId: functionId,
      status: execution.status,
      duration,
    });

    return execution as FunctionExecution;
  } catch (error) {
    const duration = Date.now() - startTime;

    const execution = await prisma.functionExecution.create({
      data: {
        functionId,
        status: "error",
        input,
        error: (error as Error).message,
        duration,
        memoryUsed: 0,
      },
    });

    logger.error("Function execution failed", error as Error, {
      functionId,
      userId,
    });
    return execution as FunctionExecution;
  }
}

/**
 * Validate function code syntax
 */
async function validateFunctionCode(code: string, runtime: FunctionRuntime) {
  try {
    if (runtime === "javascript" || runtime === "typescript") {
      // Basic syntax check
      new Function(code);
    }
  } catch (error) {
    throw new Error(`Code syntax error: ${(error as Error).message}`);
  }
}

/**
 * Get function details
 */
export async function getServerlessFunction(
  functionId: string,
  userId: string,
): Promise<ServerlessFunction> {
  try {
    const func = await prisma.serverlessFunction.findUnique({
      where: { id: functionId },
    });

    if (!func || func.userId !== userId) {
      throw new Error("Function not found or access denied");
    }

    // Decrypt code for display
    const decryptedCode = await decrypt(func.code);

    return {
      ...func,
      code: decryptedCode,
    } as ServerlessFunction;
  } catch (error) {
    logger.error("Failed to fetch function", error as Error, { functionId });
    throw error;
  }
}

/**
 * List user's functions
 */
export async function listServerlessFunctions(
  userId: string,
  limit: number = 50,
) {
  try {
    const functions = await prisma.serverlessFunction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        runtime: true,
        status: true,
        timeout: true,
        memory: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return functions;
  } catch (error) {
    logger.error("Failed to list functions", error as Error, { userId });
    return [];
  }
}

/**
 * Update function
 */
export async function updateServerlessFunction(
  functionId: string,
  userId: string,
  updates: {
    name?: string;
    description?: string;
    code?: string;
    timeout?: number;
    memory?: number;
    status?: "draft" | "active" | "disabled";
  },
) {
  try {
    // Verify ownership
    const func = await prisma.serverlessFunction.findUnique({
      where: { id: functionId },
    });

    if (!func || func.userId !== userId) {
      throw new Error("Function not found or access denied");
    }

    // Validate code if provided
    if (updates.code) {
      await validateFunctionCode(updates.code, func.runtime);
      updates.code = await encrypt(updates.code); // Encrypt before storing
    }

    const updated = await prisma.serverlessFunction.update({
      where: { id: functionId },
      data: updates,
    });

    logger.worker("serverless:update", "success", {
      userId,
      funcId: functionId,
    });

    return updated;
  } catch (error) {
    logger.error("Failed to update function", error as Error, { functionId });
    throw error;
  }
}

/**
 * Delete function
 */
export async function deleteServerlessFunction(
  functionId: string,
  userId: string,
) {
  try {
    const func = await prisma.serverlessFunction.findUnique({
      where: { id: functionId },
    });

    if (!func || func.userId !== userId) {
      throw new Error("Function not found or access denied");
    }

    // Delete related executions
    await prisma.functionExecution.deleteMany({
      where: { functionId },
    });

    // Delete function
    await prisma.serverlessFunction.delete({
      where: { id: functionId },
    });

    logger.worker("serverless:delete", "success", {
      userId,
      funcId: functionId,
    });
  } catch (error) {
    logger.error("Failed to delete function", error as Error, { functionId });
    throw error;
  }
}

/**
 * Get function execution history
 */
export async function getFunctionExecutionHistory(
  functionId: string,
  userId: string,
  limit: number = 100,
) {
  try {
    // Verify ownership
    const func = await prisma.serverlessFunction.findUnique({
      where: { id: functionId },
    });

    if (!func || func.userId !== userId) {
      throw new Error("Function not found or access denied");
    }

    const executions = await prisma.functionExecution.findMany({
      where: { functionId },
      orderBy: { executedAt: "desc" },
      take: limit,
    });

    return executions;
  } catch (error) {
    logger.error("Failed to fetch execution history", error as Error);
    return [];
  }
}

/**
 * Get function performance metrics
 */
export async function getFunctionMetrics(functionId: string, userId: string) {
  try {
    // Verify ownership
    const func = await prisma.serverlessFunction.findUnique({
      where: { id: functionId },
    });

    if (!func || func.userId !== userId) {
      throw new Error("Function not found or access denied");
    }

    const executions = await prisma.functionExecution.findMany({
      where: { functionId },
    });

    if (executions.length === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        avgDuration: 0,
        maxDuration: 0,
        avgMemory: 0,
        errors: [],
      };
    }

    const successful = executions.filter(
      (e: any) => e.status === "success",
    ).length;
    const durations = executions.map((e: any) => e.duration);
    const memories = executions.map((e: any) => e.memoryUsed);
    const errors = executions
      .filter((e: any) => e.error)
      .map((e: any) => e.error);

    return {
      totalExecutions: executions.length,
      successRate: (successful / executions.length) * 100,
      avgDuration:
        durations.reduce((a: number, b: number) => a + b, 0) / durations.length,
      maxDuration: Math.max(...durations),
      avgMemory:
        memories.reduce((a: number, b: number) => a + b, 0) / memories.length,
      errors: Array.from(new Set(errors)),
    };
  } catch (error) {
    logger.error("Failed to fetch metrics", error as Error);
    throw error;
  }
}
