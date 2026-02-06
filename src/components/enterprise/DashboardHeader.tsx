/**
 * 🎯 DASHBOARD HEADER - Enterprise Dashboard Subcomponent
 * 
 * Header com título, status do sistema e ações rápidas.
 */

import React from 'react';
import { Brain, RefreshCw } from 'lucide-react';

interface DashboardHeaderProps {
  systemHealth: {
    overall_status: string;
  } | null;
  systemStats: {
    total_agents: number;
  } | null;
  isProcessing: boolean;
  onRunSystemTest: () => void;
  onRefreshMetrics: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  systemHealth,
  systemStats,
  isProcessing,
  onRunSystemTest,
  onRefreshMetrics
}) => {
  return (
    <div className="bg-card border border-border p-10 shadow-2xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-black text-foreground flex items-center gap-4 tracking-tighter" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            <Brain className="h-10 w-10 text-primary" />
            Intelligence Dashboard
          </h1>
          <p className="text-foreground/50 mt-3 font-medium tracking-wide">
            Automação jurídica de alta performance com <span className="text-primary font-bold">[{systemStats?.total_agents || 0}] AGENTES</span> em operação.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6">
          {/* Status do Sistema */}
          <div className="flex items-center gap-4 px-6 py-3 bg-foreground/5 border border-border">
            <div className={`w-3 h-3 ${systemHealth?.overall_status === 'healthy' ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' :
              systemHealth?.overall_status === 'warning' ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
              }`} />
            <span className="text-[10px] font-black tracking-[0.2em]">
              {systemHealth?.overall_status?.toUpperCase() || 'SYSTEM OFFLINE'}
            </span>
          </div>

          <button
            onClick={onRunSystemTest}
            disabled={isProcessing}
            className="btn-sharp border border-foreground/10 hover:border-primary/50"
          >
            System Audit
          </button>

          <button
            onClick={onRefreshMetrics}
            disabled={isProcessing}
            className="btn-sharp bg-primary text-background hover:bg-white hover:text-black font-black"
          >
            <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
