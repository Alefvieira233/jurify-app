/**
 * WhatsApp-related types shared by useWhatsAppConversations, useWhatsAppMessaging,
 * and external consumers (MessageView, ConversationList, WhatsAppIA, helpers).
 *
 * Extracted to a neutral module so sub-hooks (useWhatsAppMessaging) can import
 * them without forming a circular dependency with useWhatsAppConversations.
 */

export interface WhatsAppConversation {
  id: string;
  lead_id: string | null;
  tenant_id: string;
  user_id: string | null;
  responsavel_id: string | null;
  phone_number: string;
  contact_name: string | null;
  status: 'ativo' | 'aguardando' | 'qualificado' | 'finalizado';
  area_juridica: string | null;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
  ia_active: boolean;
  created_at: string;
  updated_at: string;
  agent_status?: 'idle' | 'processing' | 'failed' | 'waiting_human';
  last_agent_error?: string | null;
  agent_processed_at?: string | null;
}

export type MessageSendStatus = 'pending' | 'sent' | 'failed' | 'delivered' | 'read';

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  sender: 'lead' | 'ia' | 'agent';
  content: string;
  message_type: 'text' | 'image' | 'document' | 'audio';
  media_url: string | null;
  read: boolean;
  timestamp: string;
  created_at: string;
  send_status?: MessageSendStatus;
  send_error?: string | null;
  processed_by_agent?: boolean;
}
