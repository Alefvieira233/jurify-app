import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

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
      } catch {
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
  } catch {
    return false;
  }
}
