/**
 * Logger Service
 * 
 * Abstraction layer for logging. Currently logs to console, but designed to
 * easily plug in Sentry, LogRocket, or other observability tools.
 */

const LOG_LEVELS = {
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
};

class LoggerService {
    constructor() {
        this.env = process.env.NODE_ENV || 'development';
    }

    log(level, message, context = {}) {
        const timestamp = new Date().toISOString();
        const logData = {
            timestamp,
            level,
            message,
            context,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // In production, this is where we would send data to Sentry
        // if (this.env === 'production') { Sentry.captureMessage(...) }

        // Console fallback (always active in dev, limited in prod)
        if (this.env === 'development' || level === LOG_LEVELS.ERROR) {
            console[level](`[${level.toUpperCase()}] ${message}`, context);
        }
    }

    info(message, context) {
        this.log(LOG_LEVELS.INFO, message, context);
    }

    warn(message, context) {
        this.log(LOG_LEVELS.WARN, message, context);
    }

    error(message, errorOrContext) {
        let context = {};
        if (errorOrContext instanceof Error) {
            context = {
                name: errorOrContext.name,
                message: errorOrContext.message,
                stack: errorOrContext.stack
            };
        } else {
            context = errorOrContext || {};
        }
        this.log(LOG_LEVELS.ERROR, message, context);
    }
}

export const Logger = new LoggerService();
