import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';
import { AdminData } from './admin/types';
import AdminUserForm from './admin/AdminUserForm';
import AdminSuccessDisplay from './admin/AdminSuccessDisplay';
import {
  createAdminUserInAuth,
  performAutoLogin,
  redirectToDashboard
} from './admin/adminUserService';
import { useAuth } from '@/contexts/AuthContext';

const CreateAdminUser = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id || null;
  const [isCreating, setIsCreating] = useState(false);
  const [adminCreated, setAdminCreated] = useState(false);
  const [adminData, setAdminData] = useState<AdminData>({
    email: 'admin@jurify.com',
    password: 'Jurify@Admin123',
    name: 'Administrador do Sistema'
  });

  const createAdminUser = async () => {
    if (!tenantId) {
      toast({
        title: 'Tenant nao encontrado',
        description: 'Refaca o login para continuar.',
        variant: 'destructive'
      });
      return;
    }

    setIsCreating(true);

    try {
      const user = await createAdminUserInAuth(adminData);

      setAdminCreated(true);
      setAdminData(prev => ({ ...prev, userId: user!.id }));

      await performAutoLogin(adminData);

      toast({
        title: 'Usuario administrador criado e logado!',
        description: 'Login automatico realizado. Redirecionando...'
      });

      redirectToDashboard();
    } catch (error: any) {
      console.error('[CreateAdminUser] erro completo:', error);
      toast({
        title: 'Erro ao criar administrador',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (adminCreated) {
    return <AdminSuccessDisplay adminData={adminData} />;
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Criar Usuario Administrador
        </CardTitle>
        <CardDescription>
          Criacao do usuario admin@jurify.com com acesso total ao sistema e login automatico
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AdminUserForm
          adminData={adminData}
          setAdminData={setAdminData}
          onCreateAdmin={createAdminUser}
          isCreating={isCreating}
        />
      </CardContent>
    </Card>
  );
};

export default CreateAdminUser;
