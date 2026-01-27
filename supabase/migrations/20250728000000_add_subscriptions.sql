-- Tabela de Planos (SAAS)
CREATE TABLE IF NOT EXISTS plans (
  id text PRIMARY KEY, -- 'free', 'pro', 'enterprise'
  name text NOT NULL,
  price_monthly integer, -- em centavos
  price_yearly integer, -- em centavos
  features jsonb NOT NULL,
  limits jsonb NOT NULL, -- { "leads": 100, "agents": 2 }
  created_at timestamp with time zone DEFAULT now(),
  active boolean DEFAULT true
);

-- Inserir planos padrão
INSERT INTO plans (id, name, price_monthly, price_yearly, features, limits)
VALUES 
  ('free', 'Gratuito', 0, 0, '["Agentes Básicos", "50 Leads/mês", "CRM Básico"]', '{"leads": 50, "agents": 1, "storage_mb": 100}'),
  ('pro', 'Profissional', 9900, 99000, '["Agentes Avançados", "Leads Ilimitados", "Suporte Prioritário", "Integração WhatsApp"]', '{"leads": 10000, "agents": 10, "storage_mb": 5000}'),
  ('enterprise', 'Escritório Elite', 29900, 299000, '["Agentes Personalizados", "White Label", "API Access", "Gerente de Conta"]', '{"leads": 1000000, "agents": 100, "storage_mb": 50000}')
ON CONFLICT (id) DO NOTHING;

-- Tabela de Assinaturas
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  tenant_id uuid, -- Opcional: vincular ao tenant se o plano for compartilhado
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  status text NOT NULL, -- 'active', 'trialing', 'past_due', 'canceled', 'incomplete'
  plan_id text REFERENCES plans(id),
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Adicionar campos ao profile para acesso rápido
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active';

-- RLS Policies
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Plans are public readable
CREATE POLICY "Plans are public readable" ON plans
  FOR SELECT USING (true);

-- Usuários podem ver sua própria assinatura
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Apenas service role pode modificar assinaturas (via webhooks do Stripe)
-- Nota: Normalmente não criamos policy para service_role pois ele faz bypass do RLS, 
-- mas é boa prática definir policies restritivas para os outros.
