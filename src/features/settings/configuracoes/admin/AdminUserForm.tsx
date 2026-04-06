

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, AlertCircle } from 'lucide-react';
import { AdminData } from './types';

interface AdminUserFormProps {
  adminData: AdminData;
  setAdminData: (data: AdminData | ((prev: AdminData) => AdminData)) => void;
  onCreateAdmin: () => void;
  isCreating: boolean;
}

const AdminUserForm = ({ adminData, setAdminData, onCreateAdmin, isCreating }: AdminUserFormProps) => {
  return (
    <>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">E-mail</label>
          <Input
            type="email"
            value={adminData.email}
            onChange={(e) => setAdminData(prev => ({ ...prev, email: e.target.value }))}
            disabled={isCreating}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Senha Temporária</label>
          <Input
            type="text"
            value={adminData.password}
            onChange={(e) => setAdminData(prev => ({ ...prev, password: e.target.value }))}
            disabled={isCreating}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Nome Completo</label>
          <Input
            type="text"
            value={adminData.name}
            onChange={(e) => setAdminData(prev => ({ ...prev, name: e.target.value }))}
            disabled={isCreating}
          />
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">🔧 O que será feito:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Criar usuário no Supabase Auth</li>
          <li>• Confirmar email automaticamente</li>
          <li>• Criar perfil na tabela profiles</li>
          <li>• Definir role como 'administrador'</li>
          <li>• Configurar permissões de acesso total</li>
          <li>• Realizar login automático</li>
          <li>• Redirecionar para o dashboard</li>
        </ul>
      </div>

      <Button 
        onClick={onCreateAdmin} 
        disabled={isCreating || !adminData.email || !adminData.password}
        className="w-full"
      >
        {isCreating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Criando e Fazendo Login...
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4 mr-2" />
            Criar e Logar como Administrador
          </>
        )}
      </Button>

      {isCreating && (
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Aguarde... Criando usuário, configurando permissões e fazendo login automático.</span>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminUserForm;
