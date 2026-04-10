export interface ApiKey {
  id: string;
  nome: string;
  key_prefix: string;
  key_hash: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  criado_por?: string;
  tenant_id?: string;
}
