import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Play, Loader2, FileJson } from 'lucide-react';

export interface PlaygroundInputProps {
  message: string;
  onMessageChange: (value: string) => void;
  loading: boolean;
  onProcess: () => void;
  hasResult: boolean;
  showRawJson: boolean;
  onToggleJson: () => void;
}

export default function PlaygroundInput({
  message, onMessageChange, loading, onProcess, hasResult, showRawJson, onToggleJson,
}: PlaygroundInputProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mensagem do Lead</CardTitle>
        <CardDescription>
          Digite ou cole uma mensagem para testar o sistema multiagentes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Ex: Fui demitido sem justa causa e a empresa nao pagou minhas verbas rescisorias..."
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          rows={6}
          disabled={loading}
          className="font-mono text-sm"
        />
        <div className="flex gap-3">
          <Button
            onClick={onProcess}
            disabled={loading || !message.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Processar com Agentes
              </>
            )}
          </Button>
          {hasResult && (
            <Button
              variant="outline"
              onClick={onToggleJson}
            >
              <FileJson className="h-4 w-4 mr-2" />
              {showRawJson ? 'Ocultar' : 'Ver'} JSON
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
