/**
 * useTimezone — Timezone Management for Agenda
 * 
 * - Detecta timezone do usuário
 * - Converte horários entre timezones
 * - Valida horários de negócio
 * - Formata display local
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createLogger } from '@/lib/logger';

const log = createLogger('Timezone');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimezoneInfo {
  timezone: string;
  offset: string;
  isDST: boolean;
  localTime: Date;
}

export interface BusinessHours {
  start: string; // "09:00"
  end: string; // "18:00"
  days: number[]; // [1,2,3,4,5] = Seg-Sex
  timezone: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTimezone() {
  const [userTimezone, setUserTimezone] = useState<string>('America/Sao_Paulo');
  const [isLoading, setIsLoading] = useState(true);

  // Detect user timezone on mount
  useEffect(() => {
    const detectTimezone = () => {
      try {
        // Try Intl API first
        const intlTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Validate timezone
        if (isValidTimezone(intlTimezone)) {
          setUserTimezone(intlTimezone);
        } else {
          // Fallback to geolocation-based detection
          const guessed = guessTimezone();
          setUserTimezone(guessed);
        }
      } catch (error) {
        log.warn('Error detecting timezone', error as Record<string, unknown>);
        setUserTimezone('America/Sao_Paulo');
      } finally {
        setIsLoading(false);
      }
    };

    detectTimezone();
  }, []);

  // Get timezone info
  const timezoneInfo = useMemo((): TimezoneInfo => {
    const now = new Date();
    const zoned = toZonedTime(now, userTimezone);
    
    // Get timezone offset
    const offset = format(zoned, 'XXX', { timeZone: userTimezone });
    
    // Check DST
    const isDST = isDaylightSaving(now, userTimezone);

    return {
      timezone: userTimezone,
      offset,
      isDST,
      localTime: zoned,
    };
  }, [userTimezone]);

  // Convert UTC date to user timezone
  const toLocalTime = useCallback((utcDate: Date | string): Date => {
    const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
    return toZonedTime(date, userTimezone);
  }, [userTimezone]);

  // Convert local date to UTC
  const toUTC = useCallback((localDate: Date | string): Date => {
    const date = typeof localDate === 'string' ? parseISO(localDate) : localDate;
    return fromZonedTime(date, userTimezone);
  }, [userTimezone]);

  // Format date in user timezone
  const formatDate = useCallback(
    (date: Date | string, formatStr: string): string => {
      const localDate = toLocalTime(date);
      return format(localDate, formatStr, {
        locale: ptBR,
        timeZone: userTimezone,
      });
    },
    [toLocalTime, userTimezone]
  );

  // Check if time is within business hours
  const isBusinessHours = useCallback(
    (date: Date | string, businessHours?: Partial<BusinessHours>): boolean => {
      const localDate = toLocalTime(date);
      const hours = localDate.getHours();
      const minutes = localDate.getMinutes();
      const day = localDate.getDay();
      
      const config: BusinessHours = {
        start: '09:00',
        end: '18:00',
        days: [1, 2, 3, 4, 5], // Seg-Sex
        timezone: userTimezone,
        ...businessHours,
      };

      // Check day of week
      if (!config.days.includes(day)) return false;

      // Parse hours
      const [startHour = 9, startMinute = 0] = config.start.split(':').map(Number);
      const [endHour = 18, endMinute = 0] = config.end.split(':').map(Number);
      
      const currentMinutes = hours * 60 + minutes;
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    },
    [toLocalTime, userTimezone]
  );

  // Get next available business slot
  const getNextBusinessSlot = useCallback(
    (startDate: Date | string, duration = 60, businessHours?: Partial<BusinessHours>): Date => {
      const config: BusinessHours = {
        start: '09:00',
        end: '18:00',
        days: [1, 2, 3, 4, 5],
        timezone: userTimezone,
        ...businessHours,
      };

      let current = toLocalTime(startDate);
      
      // Round to next 30 minutes
      const minutes = current.getMinutes();
      current.setMinutes(Math.ceil((minutes + 1) / 30) * 30, 0, 0);

      // Find next valid slot
      for (let i = 0; i < 30; i++) { // Max 30 days ahead
        if (isBusinessHours(current, config)) {
          const slotEnd = new Date(current.getTime() + duration * 60000);
          
          // Check if slot fits entirely within business hours
          if (isBusinessHours(slotEnd, config)) {
            return toUTC(current);
          }
        }
        
        // Move to next day
        current = new Date(current);
        current.setDate(current.getDate() + 1);
        current.setHours(9, 0, 0, 0); // Start of business day
      }

      // Fallback to start date
      return toUTC(startDate);
    },
    [toLocalTime, toUTC, isBusinessHours, userTimezone]
  );

  // Get common Brazil timezones
  const getBrazilTimezones = () => [
    { value: 'America/Sao_Paulo', label: 'São Paulo (BRT/BRST)' },
    { value: 'America/Rio_de_Janeiro', label: 'Rio de Janeiro (BRT/BRST)' },
    { value: 'America/Bahia', label: 'Bahia (BRT/BRST)' },
    { value: 'America/Fortaleza', label: 'Fortaleza (BRT)' },
    { value: 'America/Recife', label: 'Recife (BRT)' },
    { value: 'America/Belem', label: 'Belém (BRT/BRST)' },
    { value: 'America/Manaus', label: 'Manaus (AMT)' },
    { value: 'America/Porto_Velho', label: 'Porto Velho (AMT)' },
    { value: 'America/Boa_Vista', label: 'Boa Vista (AMT)' },
    { value: 'America/Cuiaba', label: 'Cuiabá (AMT)' },
    { value: 'America/Campo_Grande', label: 'Campo Grande (AMT)' },
    { value: 'America/Eirunepe', label: 'Eirunepé (ACT)' },
    { value: 'America/Rio_Branco', label: 'Rio Branco (ACT)' },
  ];

  return {
    timezone: userTimezone,
    timezoneInfo,
    isLoading,
    toLocalTime,
    toUTC,
    formatDate,
    isBusinessHours,
    getNextBusinessSlot,
    getBrazilTimezones,
    setUserTimezone,
  };
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function guessTimezone(): string {
  // Simple fallback based on UTC offset
  const offset = -new Date().getTimezoneOffset() / 60;
  
  // Brazil timezones by offset
  const timezoneMap: Record<number, string> = {
    '-5': 'America/Eirunepe', // ACT
    '-4': 'America/Manaus', // AMT
    '-3': 'America/Sao_Paulo', // BRT
  };

  return timezoneMap[offset] || 'America/Sao_Paulo';
}

function isDaylightSaving(date: Date, timezone: string): boolean {
  try {
    const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const utcDate = new Date(utc);
    
    const jan = new Date(utcDate.getFullYear(), 0, 1);
    const jul = new Date(utcDate.getFullYear(), 6, 1);
    
    const janOffset = getTimezoneOffset(jan, timezone);
    const julOffset = getTimezoneOffset(jul, timezone);
    
    const currentOffset = getTimezoneOffset(date, timezone);
    
    return currentOffset > Math.max(janOffset, julOffset);
  } catch {
    return false;
  }
}

function getTimezoneOffset(date: Date, timezone: string): number {
  try {
    const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const utcDate = new Date(utc);
    
    const zoned = toZonedTime(utcDate, timezone);
    return zoned.getTimezoneOffset();
  } catch {
    return 0;
  }
}
