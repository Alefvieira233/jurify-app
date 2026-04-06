/** Provides native share sheet (iOS/Android) via Capacitor Share plugin. */

import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { createLogger } from '@/lib/logger';

const log = createLogger('nativeShare');

interface ShareOptions {
  title: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

export async function nativeShare(options: ShareOptions): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if (navigator.share) {
      try {
        await navigator.share({ title: options.title, text: options.text, url: options.url });
        return true;
      } catch (err) {
        log.warn('navigator.share failed', { error: String(err) });
        return false;
      }
    }
    return false;
  }
  try {
    await Share.share({
      title: options.title,
      text: options.text,
      url: options.url,
      dialogTitle: options.dialogTitle ?? 'Compartilhar via',
    });
    return true;
  } catch (err) {
    log.warn('Share.share failed', { error: String(err) });
    return false;
  }
}
