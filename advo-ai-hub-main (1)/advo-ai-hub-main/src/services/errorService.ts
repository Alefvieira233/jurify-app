/**
 * 🛡️ JURIFY ERROR SERVICE
 * 
 * Centralized service for logging and handling errors.
 * Integrates with Sentry and Console.
 */

import * as Sentry from '@sentry/react';
import { AppError, ErrorSeverity } from '@/utils/AppError';
import { toast } from '@/hooks/use-toast';

class ErrorService {
    /**
     * Logs an error to Sentry and Console
     */
    public log(error: any, context?: string): void {
        const appError = AppError.from(error);

        // Console logging with styling
        this.logToConsole(appError, context);

        // Sentry logging
        this.logToSentry(appError, context);
    }

    /**
     * Handles an error by logging it and showing a user notification
     */
    public handle(error: any, userMessage?: string): void {
        const appError = AppError.from(error);

        this.log(appError);

        // Show toast notification
        const title = appError.severity === ErrorSeverity.CRITICAL ? 'Erro Crítico' : 'Erro';
        const description = userMessage || appError.message;

        toast({
            title,
            description,
            variant: 'destructive',
        });
    }

    private logToConsole(error: AppError, context?: string): void {
        const timestamp = new Date().toISOString();
        const contextPrefix = context ? `[${context}]` : '';

        const style = this.getConsoleStyle(error.severity);

        console.groupCollapsed(`%c${contextPrefix} ${error.name}: ${error.message}`, style);
        console.log('Code:', error.code);
        console.log('Severity:', error.severity);
        console.log('Metadata:', error.metadata);
        if (error.originalError) {
            console.log('Original Error:', error.originalError);
        }
        console.log('Stack:', error.stack);
        console.log('Time:', timestamp);
        console.groupEnd();
    }

    private logToSentry(error: AppError, context?: string): void {
        Sentry.withScope((scope) => {
            if (context) {
                scope.setTag('context', context);
            }

            scope.setLevel(this.mapSeverityToSentry(error.severity));
            scope.setExtras(error.metadata);

            if (error.code) {
                scope.setTag('error_code', error.code);
            }

            Sentry.captureException(error.originalError || error);
        });
    }

    private getConsoleStyle(severity: ErrorSeverity): string {
        switch (severity) {
            case ErrorSeverity.CRITICAL:
                return 'color: white; background: red; font-weight: bold; padding: 2px 4px; border-radius: 2px;';
            case ErrorSeverity.ERROR:
                return 'color: red; font-weight: bold;';
            case ErrorSeverity.WARNING:
                return 'color: orange; font-weight: bold;';
            case ErrorSeverity.INFO:
                return 'color: blue; font-weight: bold;';
            default:
                return 'color: black;';
        }
    }

    private mapSeverityToSentry(severity: ErrorSeverity): Sentry.SeverityLevel {
        switch (severity) {
            case ErrorSeverity.CRITICAL:
                return 'fatal';
            case ErrorSeverity.ERROR:
                return 'error';
            case ErrorSeverity.WARNING:
                return 'warning';
            case ErrorSeverity.INFO:
                return 'info';
            default:
                return 'error';
        }
    }
}

export const errorService = new ErrorService();
