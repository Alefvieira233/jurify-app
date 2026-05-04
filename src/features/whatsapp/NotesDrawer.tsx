import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import ConversationNotesPanel from './ConversationNotesPanel';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  contactName?: string;
}

const NotesDrawer = ({ open, onOpenChange, conversationId, contactName }: Props) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="text-base">
            Notas{contactName ? ` — ${contactName}` : ''}
          </SheetTitle>
        </SheetHeader>
        <ConversationNotesPanel conversationId={conversationId} className="flex-1 overflow-hidden" />
      </SheetContent>
    </Sheet>
  );
};

export default NotesDrawer;
