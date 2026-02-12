

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { AdminData } from './types';

interface AdminSuccessDisplayProps {
  adminData: AdminData;
}

const AdminSuccessDisplay = ({ adminData }: AdminSuccessDisplayProps) => {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          Usuário Administrador Criado com Sucesso!
        </CardTitle>
        <CardDescription>
          O usuário administrador foi criado, configurado e login realizado automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-green-50 p-4 rounded-lg space-y-2">
          <h3 className="font-semibold text-green-800">Dados de Acesso:</h3>
          <div className="space-y-1 text-sm">
            <p><strong>E-mail:</strong> {adminData.email}</p>
            <p><strong>Senha:</strong> {adminData.password}</p>
            <p><strong>Nome:</strong> {adminData.name}</p>
            {adminData.userId && (
              <p><strong>ID Supabase:</strong> {adminData.userId}</p>
            )}
            <p><strong>Role:</strong> Administrador</p>
          </div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">✅ Confirmações:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Usuário criado no Supabase Auth</li>
            <li>• Perfil criado na tabela profiles</li>
            <li>• Role definida como 'administrador'</li>
            <li>• Permissões de acesso total configuradas</li>
            <li>• Email confirmado automaticamente</li>
            <li>• Login automático realizado</li>
            <li>• Redirecionamento para dashboard em andamento</li>
          </ul>
        </div>

        <div className="bg-amber-50 p-4 rounded-lg">
          <h4 className="font-semibold text-amber-800 mb-2">📝 Observações:</h4>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• Login automático foi realizado</li>
            <li>• Você será redirecionado para o dashboard</li>
            <li>• A senha pode ser alterada após o primeiro login</li>
            <li>• O usuário é permanente até remoção manual</li>
            <li>• Todos os demais usuários foram preservados</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSuccessDisplay;
