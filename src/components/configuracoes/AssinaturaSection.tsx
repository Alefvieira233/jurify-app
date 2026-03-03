import { SubscriptionManager } from '@/components/billing/SubscriptionManager';

/**
 * Wrapper que embute o SubscriptionManager na aba Assinatura das Configurações.
 * O usePageTitle interno não conflita pois o ConfiguracoesGerais sempre monta primeiro.
 */
const AssinaturaSection = () => <SubscriptionManager />;

export default AssinaturaSection;
