import { Link } from 'react-router-dom';
import { Scale, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TermosDeUso = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-[hsl(43_96%_56%)] to-[hsl(43_74%_42%)] p-2 rounded-xl">
              <Scale className="h-5 w-5 text-[hsl(222_47%_11%)]" />
            </div>
            <span className="font-bold text-lg">Jurify</span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-2 mb-10">
          <h1 className="text-4xl font-bold">Termos de Uso</h1>
          <p className="text-muted-foreground">Última atualização: março de 2026</p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar ou usar a plataforma Jurify ("Serviço"), você concorda com estes Termos de Uso
              ("Termos"). Se não concordar com alguma parte destes Termos, não utilize o Serviço.
            </p>
            <p className="mt-2">
              Estes Termos constituem um contrato vinculante entre você (pessoa física ou jurídica, "Usuário")
              e a Jurify Tecnologia Ltda. ("Jurify", "nós").
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Descrição do Serviço</h2>
            <p>
              Jurify é uma plataforma SaaS (Software como Serviço) voltada à gestão de escritórios de
              advocacia, oferecendo funcionalidades de CRM jurídico, automação por Inteligência Artificial,
              gerenciamento de contratos, agendamentos, comunicação via WhatsApp e geração de relatórios.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Elegibilidade</h2>
            <p>Para utilizar o Serviço, você deve:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
              <li>Ter no mínimo 18 (dezoito) anos de idade;</li>
              <li>Ter capacidade legal para celebrar contratos;</li>
              <li>Ser profissional da área jurídica ou representante de escritório de advocacia;</li>
              <li>Fornecer informações verdadeiras e atualizadas no cadastro.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Conta de Usuário</h2>
            <p>
              Você é responsável por manter a confidencialidade das credenciais de acesso e por todas as
              atividades realizadas em sua conta. Notifique-nos imediatamente em caso de uso não autorizado.
            </p>
            <p className="mt-2">
              É vedado compartilhar credenciais de acesso, criar contas em nome de terceiros sem autorização
              ou utilizar o Serviço para fins ilícitos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Planos e Pagamentos</h2>
            <p>
              O Serviço é oferecido em diferentes planos (Gratuito, Profissional e Enterprise), com
              funcionalidades e limites distintos conforme descrito na página de Preços.
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
              <li>Planos pagos são cobrados mensalmente de forma recorrente via cartão de crédito (Stripe);</li>
              <li>O cancelamento pode ser realizado a qualquer momento, sem multa;</li>
              <li>Não há reembolso proporcional pelo período não utilizado após o cancelamento;</li>
              <li>Os preços podem ser alterados com aviso prévio de 30 dias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Uso Aceitável</h2>
            <p>É proibido usar o Serviço para:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
              <li>Violar leis brasileiras ou internacionais;</li>
              <li>Transmitir conteúdo ilegal, difamatório, discriminatório ou que viole direitos de terceiros;</li>
              <li>Realizar engenharia reversa, descompilar ou extrair código-fonte do Serviço;</li>
              <li>Sobrecarregar ou interferir na infraestrutura do Serviço (ataques, bots);</li>
              <li>Compartilhar acesso com usuários não autorizados pelo plano contratado.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Propriedade Intelectual</h2>
            <p>
              O Serviço, incluindo software, interfaces, algoritmos e conteúdo, é propriedade exclusiva da
              Jurify e protegido por leis de propriedade intelectual. Nenhuma parte destes Termos transfere
              ao Usuário qualquer direito de propriedade sobre o Serviço.
            </p>
            <p className="mt-2">
              Os dados inseridos pelo Usuário são de sua propriedade. A Jurify utiliza esses dados somente
              para prestação do Serviço, conforme a Política de Privacidade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Inteligência Artificial</h2>
            <p>
              O Serviço utiliza modelos de Inteligência Artificial para automatizar tarefas jurídicas. O
              Usuário reconhece que:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
              <li>As respostas da IA são de natureza informativa e não constituem parecer jurídico;</li>
              <li>A validação e responsabilidade final por qualquer ato jurídico cabe ao advogado responsável;</li>
              <li>A Jurify não se responsabiliza por decisões tomadas com base exclusiva em outputs da IA.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Disponibilidade e Manutenção</h2>
            <p>
              A Jurify empreende esforços razoáveis para manter o Serviço disponível 24/7, mas não garante
              disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência.
              Não há SLA de disponibilidade para o plano Gratuito.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Limitação de Responsabilidade</h2>
            <p>
              Na extensão máxima permitida pela lei brasileira, a Jurify não será responsável por danos
              indiretos, incidentais, especiais ou consequentes decorrentes do uso ou impossibilidade de
              uso do Serviço.
            </p>
            <p className="mt-2">
              A responsabilidade total da Jurify em qualquer circunstância estará limitada ao valor pago
              pelo Usuário nos 12 meses anteriores ao evento que originou a reclamação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Rescisão</h2>
            <p>
              A Jurify pode suspender ou encerrar o acesso ao Serviço em caso de violação destes Termos,
              com ou sem aviso prévio, dependendo da gravidade da violação. O Usuário pode encerrar sua
              conta a qualquer momento pelo painel de configurações.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Alterações nos Termos</h2>
            <p>
              Podemos modificar estes Termos a qualquer momento. As alterações entrarão em vigor 30 dias
              após a notificação por e-mail ou aviso no Serviço. O uso continuado após esse prazo
              implica aceitação dos novos Termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Lei Aplicável e Foro</h2>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Para solução de
              controvérsias, fica eleito o foro da Comarca de São Paulo – SP, com renúncia expressa
              a qualquer outro, por mais privilegiado que seja.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">14. Contato</h2>
            <p>
              Para dúvidas sobre estes Termos, entre em contato:{' '}
              <a href="mailto:juridico@jurify.com.br" className="text-primary underline">
                juridico@jurify.com.br
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
          <span>© 2026 Jurify Tecnologia Ltda.</span>
          <div className="flex gap-4">
            <Link to="/privacidade" className="hover:text-foreground transition-colors">
              Política de Privacidade
            </Link>
            <Link to="/auth" className="hover:text-foreground transition-colors">
              Voltar ao app
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TermosDeUso;
