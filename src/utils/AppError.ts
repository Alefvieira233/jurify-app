/**
 * 🛡️ JURIFY APP ERROR
 * 
 * Standardized error class for the entire application.
 * Ensures consistent error structure for logging and UI feedback.
 */

export enum ErrorSeverity {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    CRITICAL = 'critical',
}

export interface AppErrorOptions {
    code?: string;
    severity?: ErrorSeverity;
    metadata?: Record<string, unknown>;
    originalError?: unknown;
}

export class AppError extends Error {
    public readonly code: string;
    public readonly severity: ErrorSeverity;
    public readonly metadata: Record<string, unknown>;
    public readonly originalError: unknown;

    constructor(message: string, options: AppErrorOptions = {}) {
        super(message);
        this.name = 'AppError';
        this.code = options.code || 'UNKNOWN_ERROR';
        this.severity = options.severity || ErrorSeverity.ERROR;
        this.metadata = options.metadata || {};
        this.originalError = options.originalError;

        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }

    public toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            severity: this.severity,
            metadata: this.metadata,
            stack: this.stack,
        };
    }

    /**
     * Normalizes any error into an AppError
     */
    static from(error: unknown, defaultMessage = 'An unexpected error occurred'): AppError {
        if (error instanceof AppError) {
            return error;
        }

        if (error instanceof Error) {
            return new AppError(error.message, {
                originalError: error,
                code: 'INTERNAL_ERROR',
            });
        }

        if (typeof error === 'string') {
            return new AppError(error, {
                code: 'STRING_ERROR',
            });
        }

        return new AppError(defaultMessage, {
            originalError: error,
            code: 'UNKNOWN_ERROR',
        });
    }
}
