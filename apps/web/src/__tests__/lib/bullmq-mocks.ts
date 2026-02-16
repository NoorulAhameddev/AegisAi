/**
 * BullMQ Test Helpers
 * Utilities for mocking BullMQ jobs and queues in tests
 */

export interface MockJobData {
  id: string;
  state: 'active' | 'completed' | 'failed' | 'delayed' | 'waiting';
  data: any;
  progress?: number;
  returnvalue?: any;
  failedReason?: string;
  stacktrace?: string[];
}

/**
 * Create a mock BullMQ job with full state management
 */
export function createMockJob(options: Partial<MockJobData> = {}): any {
  const jobData: MockJobData = {
    id: 'job-' + Math.random().toString(36).substr(2, 9),
    state: 'waiting',
    data: { chatId: 'chat-1', message: 'test' },
    progress: 0,
    ...options,
  };

  return {
    id: jobData.id,
    data: jobData.data,
    state: jobData.state,
    progress: jest.fn().mockResolvedValue(jobData.progress),
    getState: jest.fn().mockResolvedValue(jobData.state),
    getProgress: jest.fn().mockResolvedValue(jobData.progress),
    log: jest.fn().mockResolvedValue(undefined),
    updateProgress: jest.fn().mockResolvedValue(undefined),
    waitUntilFinished: jest.fn().mockResolvedValue({
      returnvalue: jobData.returnvalue,
      failedReason: jobData.failedReason,
    }),
    remove: jest.fn().mockResolvedValue(undefined),
    retry: jest.fn().mockResolvedValue(undefined),
    returnvalue: jobData.returnvalue,
    failedReason: jobData.failedReason,
    stacktrace: jobData.stacktrace || [],
  };
}

/**
 * Create a mock BullMQ queue with common operations
 */
export function createMockQueue(name: string = 'test-queue'): any {
  const jobs = new Map<string, any>();

  return {
    name,
    add: jest.fn(async (type: string, data: any, options?: any) => {
      const job = createMockJob({ 
        id: options?.jobId || 'job-' + Math.random().toString(36).substr(2, 9),
        data,
        state: 'waiting',
      });
      jobs.set(job.id, job);
      return job;
    }),
    process: jest.fn(),
    getJob: jest.fn(async (jobId: string) => {
      return jobs.get(jobId) || null;
    }),
    getJobs: jest.fn(async (states?: string[]) => {
      if (!states) return Array.from(jobs.values());
      return Array.from(jobs.values()).filter(j => states.includes(j.state));
    }),
    getJobCounts: jest.fn(async () => ({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    })),
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    close: jest.fn(),
  };
}

/**
 * Mock BullMQ Worker for background job processing tests
 */
export function createMockWorker(queue: any): any {
  return {
    on: jest.fn(),
    process: jest.fn(),
    close: jest.fn(),
    isRunning: jest.fn().mockReturnValue(true),
  };
}
