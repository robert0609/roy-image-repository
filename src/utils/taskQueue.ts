export type AsyncTask<R = void> = () => Promise<R>;

interface QueueTask<R> {
  id: number;
  task: AsyncTask<R>;
  resolve: (value: R) => void;
  reject: (reason?: unknown) => void;
}

export class SerialTaskQueue {
  private queue: QueueTask<unknown>[] = [];
  private running = false;
  private taskId = 0;
  private stopped = false;

  /**
   * 添加任务（泛型自动推导）
   */
  enqueue<R>(task: AsyncTask<R>): Promise<R> {
    if (this.stopped) {
      return Promise.reject(new Error("Queue has been stopped"));
    }

    return new Promise<R>((resolve, reject) => {
      const queueTask: QueueTask<R> = {
        id: ++this.taskId,
        task,
        resolve,
        reject,
      };

      // 用 unknown 存储，运行时不影响
      this.queue.push(queueTask as QueueTask<unknown>);
      this.process();
    });
  }

  /**
   * 串行执行核心逻辑
   */
  private async process() {
    if (this.running) return;
    if (this.queue.length === 0) return;

    this.running = true;

    while (this.queue.length > 0) {
      const current = this.queue.shift();
      if (!current) break;

      try {
        const result = await current.task();
        current.resolve(result);
      } catch (err) {
        current.reject(err);
      }
    }

    this.running = false;
  }

  /**
   * 清空未执行任务
   */
  clear(reason = "Task cleared") {
    for (const task of this.queue) {
      task.reject(new Error(reason));
    }
    this.queue = [];
  }

  /**
   * 停止队列（不可恢复）
   */
  stop() {
    this.stopped = true;
    this.clear("Queue stopped");
  }

  /**
   * 当前是否正在执行
   */
  isRunning() {
    return this.running;
  }

  /**
   * 当前等待数量
   */
  size() {
    return this.queue.length;
  }
}
