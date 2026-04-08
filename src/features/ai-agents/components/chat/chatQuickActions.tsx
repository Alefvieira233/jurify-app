import React from 'react';
import { Users, FileText, TrendingUp, BarChart3 } from 'lucide-react';
import { type QuickAction } from './chatTypes';

export const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Clientes recentes', icon: <Users className="h-3 w-3" />, prompt: 'Me mostre os leads mais recentes' },
  { label: 'Contratos', icon: <FileText className="h-3 w-3" />, prompt: 'Quais contratos foram assinados recentemente?' },
  { label: 'Métricas do mês', icon: <BarChart3 className="h-3 w-3" />, prompt: 'Me dê um resumo das métricas deste mês' },
  { label: 'Taxa de conversão', icon: <TrendingUp className="h-3 w-3" />, prompt: 'Qual a taxa de conversão atual de leads?' },
];
