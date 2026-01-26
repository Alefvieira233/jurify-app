
import { useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
}

export const usePerformanceMonitor = (componentName: string) => {
  const logPerformance = useCallback((metrics: PerformanceMetrics) => {
    console.log(`🚀 [Performance] ${componentName}:`, {
      loadTime: `${metrics.loadTime}ms`,
      renderTime: `${metrics.renderTime}ms`,
      memoryUsage: metrics.memoryUsage ? `${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB` : 'N/A'
    });

    // Em produção, enviar para analytics
    if (process.env.NODE_ENV === 'production') {
      // Implementar envio para serviço de analytics
    }
  }, [componentName]);

  const measureRender = useCallback((startTime: number) => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    const metrics: PerformanceMetrics = {
      loadTime: endTime,
      renderTime,
      memoryUsage: (performance as any).memory?.usedJSHeapSize
    };

    logPerformance(metrics);
  }, [logPerformance]);

  useEffect(() => {
    const startTime = performance.now();
    
    // Medir após render completo
    const timeoutId = setTimeout(() => {
      measureRender(startTime);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [measureRender]);

  return { logPerformance, measureRender };
};
