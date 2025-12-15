
export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    [key: string]: any;
}

const formatLog = (level: LogLevel, message: string, meta: Record<string, any> = {}): string => {
    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...meta,
    };
    return JSON.stringify(entry);
};

export const logger = {
    info: (message: string, meta?: Record<string, any>) => {
        console.log(formatLog('info', message, meta));
    },
    warn: (message: string, meta?: Record<string, any>) => {
        console.warn(formatLog('warn', message, meta));
    },
    error: (message: string, meta?: Record<string, any>) => {
        console.error(formatLog('error', message, meta));
    },
};
