type LogListener = (logs: string[]) => void;

class DevLoggerService {
  private logs: string[] = [];
  private listeners: LogListener[] = [];

  log(message: string, data?: any) {
    const timestamp = new Date().toLocaleTimeString();
    let logMessage = `[${timestamp}] ${message}`;
    if (data) {
      try {
        logMessage += `\n${JSON.stringify(data, null, 2)}`;
      } catch (e) {
        logMessage += `\n[Data object could not be stringified]`;
      }
    }
    this.logs = [logMessage, ...this.logs]; // Newest first
    this.notifyListeners();
    console.log(logMessage); // Also log to console
  }

  getLogs() {
    return this.logs;
  }

  clear() {
    this.logs = [];
    this.notifyListeners();
  }

  subscribe(listener: LogListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.logs));
  }
}

export const DevLogger = new DevLoggerService();
