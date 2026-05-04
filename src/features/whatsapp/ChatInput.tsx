import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Paperclip,
  Mic,
  Square,
  Image,
  FileText,
  X,
  FileCheck2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createLogger } from '@/lib/logger';
import { useWhatsAppWindow } from '@/hooks/useWhatsAppWindow';
import { useWhatsAppQuickReplies, type QuickReply } from '@/hooks/useWhatsAppQuickReplies';
import WindowStatusBadge from './WindowStatusBadge';
import TemplateSelectorModal from './TemplateSelectorModal';
import QuickReplyPopover from './QuickReplyPopover';

const log = createLogger('ChatInput');

export interface ChatInputProps {
  newMessage: string;
  setNewMessage: (msg: string) => void;
  onSendMessage: () => void;
  onSendMedia: (file: File, mediaType: 'image' | 'audio' | 'document') => void;
  /** Conversation context — habilita 24h window check + template fallback */
  conversationId?: string;
  /** Phone number do destinatário (E.164 sem +) — necessário pro template */
  toPhoneNumber?: string;
  /** Callback após template enviado (refetch messages) */
  onTemplateSent?: () => void;
}

const ChatInput = ({
  newMessage,
  setNewMessage,
  onSendMessage,
  onSendMedia,
  conversationId,
  toPhoneNumber,
  onTemplateSent,
}: ChatInputProps) => {
  const { formattedRemaining, status, requiresTemplate } = useWhatsAppWindow(conversationId);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const { incrementUse } = useWhatsAppQuickReplies();

  // Quick replies: detecta /shortcut no início ou após espaço
  const quickReplyMatch = /(?:^|\s)(\/[a-z0-9_-]*)$/i.exec(newMessage);
  const quickReplyQuery: string = quickReplyMatch?.[1] ?? '';
  const showQuickReply = !!quickReplyMatch && !requiresTemplate;

  const applyQuickReply = (reply: QuickReply) => {
    // Substitui o /shortcut pelo conteúdo no final do textarea
    const before = newMessage.slice(0, newMessage.length - quickReplyQuery.length);
    setNewMessage(before + reply.content);
    void incrementUse(reply.id);
  };
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  // Close attach menu on click outside
  useEffect(() => {
    if (!showAttachMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showAttachMenu]);

  const handleFileSelect = (accept: string, mediaType: 'image' | 'document') => {
    setShowAttachMenu(false);
    const input = fileInputRef.current;
    if (!input) return;
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          alert('Arquivo muito grande. Máximo: 10MB');
          return;
        }
        onSendMedia(file, mediaType);
      }
      input.value = '';
    };
    input.click();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
        onSendMedia(file, 'audio');
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (err) {
      log.error('microphone access failed', err);
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      {/* 24h window status bar */}
      {conversationId && (
        <div className="px-4 pt-2 pb-1 flex items-center justify-between gap-2 max-w-3xl mx-auto">
          <WindowStatusBadge status={status} formattedRemaining={formattedRemaining} />
          {toPhoneNumber && (
            <Button
              variant={requiresTemplate ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTemplateModalOpen(true)}
              className="h-7 text-xs gap-1.5"
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              {requiresTemplate ? 'Enviar template' : 'Templates'}
            </Button>
          )}
        </div>
      )}

      {/* Window closed warning banner */}
      {conversationId && requiresTemplate && (
        <div className="mx-4 mt-1 mb-2 max-w-3xl lg:mx-auto p-2.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
          <span className="font-medium">Janela 24h fechada.</span>
          <span className="text-amber-600 dark:text-amber-400/80">
            Para reabrir conversa, envie um template aprovado pela Meta. Texto livre seria silenciosamente bloqueado.
          </span>
        </div>
      )}

      <div className="px-4 py-3 flex items-end gap-2 max-w-3xl mx-auto">
        <input type="file" ref={fileInputRef} className="hidden" aria-label="Selecionar arquivo" />
        {/* Attachment button */}
        <div className="relative" ref={attachMenuRef}>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            aria-label="Anexar arquivo"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          {showAttachMenu && (
            <div className="absolute bottom-12 left-0 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-lg py-1 min-w-[160px] z-50">
              <button
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                onClick={() => handleFileSelect('image/*', 'image')}
              >
                <Image className="h-4 w-4 text-blue-500" />
                Imagem
              </button>
              <button
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                onClick={() => handleFileSelect('.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv', 'document')}
              >
                <FileText className="h-4 w-4 text-purple-500" />
                Documento
              </button>
            </div>
          )}
        </div>

        {isRecording ? (
          /* Recording UI */
          <div className="flex-1 flex items-center gap-3 min-h-[40px] py-2.5 px-3 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              {formatRecordingTime(recordingTime)}
            </span>
            <span className="text-xs text-red-500/70">Gravando...</span>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[hsl(var(--muted-foreground))] hover:text-red-500"
              onClick={cancelRecording}
              aria-label="Cancelar gravação"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          /* Text input */
          <textarea
            value={newMessage}
            onChange={(e) => {
              if (e.target.value.length <= 4096) {
                setNewMessage(e.target.value);
              }
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!requiresTemplate) onSendMessage();
              }
            }}
            placeholder={requiresTemplate ? 'Janela fechada — clique em "Enviar template" acima' : 'Digite uma mensagem...'}
            maxLength={4096}
            disabled={requiresTemplate && !!conversationId}
            aria-label="Mensagem WhatsApp"
            className="flex-1 min-h-[40px] max-h-[120px] py-2.5 px-3 text-sm rounded-md border border-input bg-background resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            rows={1}
          />
        )}

        {/* Send or Mic button */}
        {isRecording ? (
          <Button
            onClick={stopRecording}
            size="icon"
            className="h-10 w-10 bg-red-500 hover:bg-red-600"
            aria-label="Parar e enviar áudio"
          >
            <Square className="h-4 w-4 fill-current" />
          </Button>
        ) : newMessage.trim() ? (
          <Button
            onClick={onSendMessage}
            disabled={requiresTemplate && !!conversationId}
            size="icon"
            className="h-10 w-10 bg-emerald-600 hover:bg-emerald-700"
            aria-label="Enviar mensagem"
          >
            <Send className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={() => void startRecording()}
            disabled={requiresTemplate && !!conversationId}
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-[hsl(var(--muted-foreground))] hover:text-emerald-600"
            aria-label="Gravar áudio"
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>

      {toPhoneNumber && (
        <TemplateSelectorModal
          open={templateModalOpen}
          onOpenChange={setTemplateModalOpen}
          to={toPhoneNumber}
          conversationId={conversationId}
          onSent={onTemplateSent}
        />
      )}

      <div className="relative">
        <QuickReplyPopover
          query={quickReplyQuery}
          visible={showQuickReply}
          onSelect={applyQuickReply}
          onClose={() => { /* clear by typing */ }}
        />
      </div>
    </div>
  );
};

ChatInput.displayName = 'ChatInput';

export default ChatInput;
