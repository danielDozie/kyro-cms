import { useCallback, useRef } from "react";

type QueuedFunction = () => Promise<void>;

type QueueTaskOptions = {
  afterProcess?: () => void;
  beforeProcess?: () => boolean;
};

type QueueTask = (fn: QueuedFunction, options?: QueueTaskOptions) => void;

/**
 * A hook that queues async tasks for sequential execution.
 * Only the last task in the queue is ever processed; all prior pending tasks are discarded.
 * This prevents race conditions where multiple autosave fetches could run in parallel.
 *
 *
 * @returns {queueTask} A function used to queue a task for execution.
 */
export function useQueue(): { queueTask: QueueTask } {
  const queue = useRef<QueuedFunction[]>([]);
  const isProcessing = useRef(false);

  const queueTask = useCallback<QueueTask>((fn, options) => {
    queue.current.push(fn);

    async function processQueue() {
      if (isProcessing.current) return;

      if (typeof options?.beforeProcess === "function") {
        const shouldContinue = options.beforeProcess();
        if (shouldContinue === false) return;
      }

      while (queue.current.length > 0) {
        const latestTask = queue.current.pop();
        queue.current = [];

        isProcessing.current = true;

        try {
          if (latestTask) {
            await latestTask();
          }
        } catch (err) {
          console.error("Error in queued function:", err);
        } finally {
          isProcessing.current = false;

          if (typeof options?.afterProcess === "function") {
            options.afterProcess();
          }
        }
      }
    }

    processQueue();
  }, []);

  return { queueTask };
}
