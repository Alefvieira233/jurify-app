import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Columns3, ShieldAlert, ShieldCheck } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { NovoUsuarioForm, EditarUsuarioForm, GerenciarPermissoesForm } from '@/features/users';
import { UsersList } from './UsersList';
import { PermissionsMatrix } from './PermissionsMatrix';
import { useUsuariosPermissoes } from './useUsuariosPermissoes';

const UsuariosPermissoesSection = () => {
  const {
    profile,
    isAdmin,
    canDeleteUsers,
    canCreate,
    search,
    setSearch,
    selected,
    isNovoOpen,
    setIsNovoOpen,
    isEditOpen,
    setIsEditOpen,
    isPermOpen,
    setIsPermOpen,
    isMatrizOpen,
    setIsMatrizOpen,
    selectedMember,
    setSelectedMember,
    confirmDeactivate,
    setConfirmDeactivate,
    filtered,
    isLoading,
    deactivateMutation,
    toggleAll,
    toggleOne,
  } = useUsuariosPermissoes();

  if (!isAdmin) {
    return (
      <div className="border border-dashed rounded-lg p-8 text-center">
        <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Acesso restrito</p>
        <p className="text-xs text-muted-foreground mt-1">
          Voce nao tem permissao para gerenciar membros.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-end mb-4 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMatrizOpen(true)}
          className="text-xs h-8 gap-1"
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Matriz de Permissoes
        </Button>
        {canCreate && (
          <Button size="sm" onClick={() => setIsNovoOpen(true)} className="h-8 gap-1">
            <Plus className="h-4 w-4" /> Novo Membro
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Pesquisar membros..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm pl-8"
          />
        </div>
        <Button variant="outline" size="sm" className="text-xs h-8 gap-1">
          <Columns3 className="h-3 w-3" /> Colunas
        </Button>
      </div>

      {/* Table */}
      <UsersList
        filtered={filtered}
        isLoading={isLoading}
        search={search}
        selected={selected}
        profileId={profile?.id}
        canDeleteUsers={canDeleteUsers}
        onToggleAll={toggleAll}
        onToggleOne={toggleOne}
        onEdit={(m) => { setSelectedMember(m); setIsEditOpen(true); }}
        onPermissions={(m) => { setSelectedMember(m); setIsPermOpen(true); }}
        onDeactivate={(id, nome) => setConfirmDeactivate({ open: true, id, nome })}
      />

      {/* Dialog: Novo Membro */}
      <Dialog open={isNovoOpen} onOpenChange={setIsNovoOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl">
          <DialogHeader><DialogTitle>Convidar novo membro</DialogTitle></DialogHeader>
          <NovoUsuarioForm onClose={() => setIsNovoOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Perfil */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl">
          <DialogHeader><DialogTitle>Editar perfil</DialogTitle></DialogHeader>
          {selectedMember && (
            <EditarUsuarioForm
              usuario={{
                id: selectedMember.id,
                nome_completo: selectedMember.nome_completo,
                email: selectedMember.email,
                telefone: selectedMember.telefone ?? undefined,
                cargo: selectedMember.cargo ?? undefined,
                departamento: selectedMember.departamento ?? undefined,
                ativo: selectedMember.ativo,
              }}
              onClose={() => setIsEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Permissoes individuais */}
      <Dialog open={isPermOpen} onOpenChange={setIsPermOpen}>
        <DialogContent className="w-[95vw] sm:max-w-4xl">
          <DialogHeader><DialogTitle>Permissoes de {selectedMember?.nome_completo}</DialogTitle></DialogHeader>
          {selectedMember && (
            <GerenciarPermissoesForm
              usuario={{
                id: selectedMember.id,
                nome_completo: selectedMember.nome_completo,
                email: selectedMember.email,
              }}
              onClose={() => setIsPermOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Matriz de Permissoes */}
      <Dialog open={isMatrizOpen} onOpenChange={setIsMatrizOpen}>
        <DialogContent className="w-[95vw] sm:max-w-5xl">
          <DialogHeader><DialogTitle>Matriz de Permissoes</DialogTitle></DialogHeader>
          <PermissionsMatrix />
        </DialogContent>
      </Dialog>

      {/* Confirmacao de desativacao */}
      <ConfirmDialog
        open={confirmDeactivate.open}
        onOpenChange={(v) => setConfirmDeactivate((p) => ({ ...p, open: v }))}
        title="Revogar acesso do membro"
        description={`"${confirmDeactivate.nome}" perdera o acesso a plataforma. Os dados permanecem salvos.`}
        onConfirm={() => {
          deactivateMutation.mutate(confirmDeactivate.id);
          setConfirmDeactivate({ open: false, id: '', nome: '' });
        }}
        destructive
      />
    </div>
  );
};

export default UsuariosPermissoesSection;
