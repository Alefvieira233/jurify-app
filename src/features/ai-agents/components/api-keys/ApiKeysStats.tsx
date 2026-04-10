import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApiKey } from './types';

interface ApiKeysStatsProps {
  apiKeys: ApiKey[] | undefined;
}

export const ApiKeysStats = ({ apiKeys }: ApiKeysStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Total de Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{apiKeys?.length || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Keys Ativas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-200">
            {apiKeys?.filter((key) => key.ativo).length || 0}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Keys Inativas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-300">
            {apiKeys?.filter((key) => !key.ativo).length || 0}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
