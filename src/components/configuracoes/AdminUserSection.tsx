

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import CreateAdminUser from '../CreateAdminUser';

const AdminUserSection = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gerenciamento de Usuário Administrador
          </CardTitle>
          <CardDescription>
            Criação e configuração do usuário administrador principal do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateAdminUser />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUserSection;
