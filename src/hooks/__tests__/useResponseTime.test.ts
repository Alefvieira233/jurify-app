import { describe, it, expect } from 'vitest';

// We're testing the pure groupByDay function which is not exported,
// so we replicate it here for unit testing. The actual implementation
// lives in useResponseTime.ts.

interface ResponseTimeData {
  time: string;
  avgTime: number;
  p95Time: number;
}

function groupByDay(
  logs: Array<{ tempo_execucao: number | null; created_at: string | null }>
): ResponseTimeData[] {
  const byDay: Record<string, number[]> = {};

  for (const log of logs) {
    if (!log.tempo_execucao || !log.created_at) continue;
    const day = log.created_at.slice(0, 10);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(log.tempo_execucao);
  }

  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, times]) => {
      const sorted = [...times].sort((a, b) => a - b);
      const avg = times.reduce((s, t) => s + t, 0) / times.length;
      const p95Index = Math.floor(sorted.length * 0.95);
      const p95 = sorted[p95Index] ?? sorted[sorted.length - 1] ?? 0;

      const [, month, dayNum] = day.split('-');
      return {
        time: `${dayNum}/${month}`,
        avgTime: Math.round(avg * 100) / 100,
        p95Time: Math.round(p95 * 100) / 100,
      };
    });
}

describe('groupByDay', () => {
  it('returns empty array for empty logs', () => {
    expect(groupByDay([])).toEqual([]);
  });

  it('skips entries with null tempo_execucao', () => {
    const result = groupByDay([
      { tempo_execucao: null, created_at: '2025-01-01T00:00:00Z' },
    ]);
    expect(result).toEqual([]);
  });

  it('skips entries with null created_at', () => {
    const result = groupByDay([
      { tempo_execucao: 1.5, created_at: null },
    ]);
    expect(result).toEqual([]);
  });

  it('groups logs by day and computes avg/p95', () => {
    const logs = [
      { tempo_execucao: 1.0, created_at: '2025-03-01T10:00:00Z' },
      { tempo_execucao: 3.0, created_at: '2025-03-01T11:00:00Z' },
      { tempo_execucao: 2.0, created_at: '2025-03-01T12:00:00Z' },
      { tempo_execucao: 5.0, created_at: '2025-03-02T10:00:00Z' },
    ];
    const result = groupByDay(logs);
    expect(result).toHaveLength(2);

    // Day 1: avg = 2.0, sorted = [1,2,3], p95 index = floor(3*0.95) = 2 => 3.0
    expect(result[0].time).toBe('01/03');
    expect(result[0].avgTime).toBe(2);
    expect(result[0].p95Time).toBe(3);

    // Day 2: single entry = 5.0
    expect(result[1].time).toBe('02/03');
    expect(result[1].avgTime).toBe(5);
    expect(result[1].p95Time).toBe(5);
  });

  it('sorts results by date ascending', () => {
    const logs = [
      { tempo_execucao: 2.0, created_at: '2025-03-05T10:00:00Z' },
      { tempo_execucao: 1.0, created_at: '2025-03-01T10:00:00Z' },
      { tempo_execucao: 3.0, created_at: '2025-03-03T10:00:00Z' },
    ];
    const result = groupByDay(logs);
    expect(result.map((r) => r.time)).toEqual(['01/03', '03/03', '05/03']);
  });

  it('rounds avg and p95 to 2 decimal places', () => {
    const logs = [
      { tempo_execucao: 1.111, created_at: '2025-01-01T00:00:00Z' },
      { tempo_execucao: 2.222, created_at: '2025-01-01T01:00:00Z' },
      { tempo_execucao: 3.333, created_at: '2025-01-01T02:00:00Z' },
    ];
    const result = groupByDay(logs);
    // avg = (1.111+2.222+3.333)/3 = 2.222
    expect(result[0].avgTime).toBe(2.22);
  });
});
