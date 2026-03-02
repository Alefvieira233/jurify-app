import { Link } from 'react-router-dom';
import { Scale, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PoliticaDePrivacidade = () => {
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
          <h1 className="text-4xl font-bold">Política de Privacidade</h1>
          <p className="text-muted-foreground">Última atualização: março de 2026 · Em conformidade com a LGPD (Lei nº 13.709/2018)</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Controlador dos Dados</h2>
            <p>
              A <strong>Jurify Tecnologia Ltda.</strong> ("Jurify", "nós") atua como controladora dos dados
              pessoais tratados através da plataforma Jurify. Para exercer seus direitos ou entrar em contato
              com nosso encarregado (DPO):
            </p>
            <div className="mt-3 p-4 rounded-xl bg-muted/40 border border-border space-y-1">
              <p><strong>E-mail:</strong> <a href="mailto:privacidade@jurify.com.br" className="text-primary underline">privacidade@jurify.com.br</a></p>
              <p><strong>Assunto:</strong> LGPD – Direitos do Titular</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Dados que Coletamos</h2>

            <h3 className="font-semibold mt-4 mb-2">2.1 Dados fornecidos por você:</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Nome completo, e-mail e senha (cadastro);</li>
              <li>Dados de clientes (leads) inseridos na plataforma;</li>
              <li>Documentos e contratos enviados para o sistema;</li>
              <li>Conteúdo de conversas via WhatsApp e agendamentos;</li>
              <li>Informações de pagamento (processadas pelo Stripe — não armazenamos dados de cartão).</li>
            </ul>

            <h3 className="font-semibold mt-4 mb-2">2.2 Dados coletados automaticamente:</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Endereço IP, tipo de navegador e sistema operacional;</li>
              <li>Logs de acesso, ações e erros no sistema (para fins de segurança e suporte);</li>
              <li>Cookies essenciais para autenticação e funcionamento do Serviço.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Finalidade e Base Legal do Tratamento</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-semibold">Finalidade</th>
                    <th className="text-left py-2 font-semibold">Base Legal (LGPD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-2 pr-4">Prestação do Serviço (CRM, IA, Agenda)</td>
                    <td className="py-2">Art. 7º, V – Execução de contrato</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Processamento de pagamentos</td>
                    <td className="py-2">Art. 7º, V – Execução de contrato</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Segurança e prevenção a fraudes</td>
                    <td className="py-2">Art. 7º, IX – Legítimo interesse</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Envio de e-mails transacionais</td>
                    <td className="py-2">Art. 7º, V – Execução de contrato</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Melhoria do produto e analytics</td>
                    <td className="py-2">Art. 7º, IX – Legítimo interesse</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Cumprimento de obrigações legais</td>
                    <td className="py-2">Art. 7º, II – Obrigação legal</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Marketing e comunicações promocionais</td>
                    <td className="py-2">Art. 7º, I – Consentimento</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Compartilhamento de Dados</h2>
            <p>Compartilhamos dados somente nas seguintes situações:</p>
            <ul className="list-disc list-inside space-y-2 mt-2 ml-4">
              <li>
                <strong>Prestadores de serviço (operadores):</strong> Supabase (banco de dados, autenticação),
                OpenAI (processamento de IA — dados são sanitizados antes do envio), Stripe (pagamentos),
                Postmark (e-mails transacionais). Todos operam sob acordos de processamento de dados (DPA).
              </li>
              <li>
                <strong>Requisição legal:</strong> Quando exigido por autoridade competente, ordem judicial
                ou obrigação regulatória.
              </li>
              <li>
                <strong>Proteção de direitos:</strong> Para investigar fraudes ou proteger direitos e
                segurança da Jurify, usuários ou terceiros.
              </li>
            </ul>
            <p className="mt-3">
              <strong>Não vendemos seus dados pessoais a terceiros.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Transferências Internacionais</h2>
            <p>
              Alguns dados podem ser processados fora do Brasil (ex.: servidores OpenAI e Stripe nos EUA).
              Essas transferências ocorrem com garantias adequadas, como cláusulas contratuais padrão e
              conformidade com o Art. 33 da LGPD.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Segurança dos Dados</h2>
            <p>Adotamos medidas técnicas e organizacionais para proteger seus dados:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
              <li>Criptografia AES-256-GCM para dados sensíveis em repouso;</li>
              <li>HTTPS/TLS para dados em trânsito;</li>
              <li>Row-Level Security (RLS) no banco de dados (isolamento por tenant);</li>
              <li>Logs de auditoria imutáveis para rastreabilidade;</li>
              <li>Sanitização de dados pessoais (PII) antes do envio a modelos de IA;</li>
              <li>Autenticação de dois fatores disponível para contas.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Retenção de Dados</h2>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
              <li>Dados de conta: mantidos enquanto a conta estiver ativa e por 5 anos após o encerramento;</li>
              <li>Logs de sistema: 12 meses;</li>
              <li>Dados de pagamento (registros): 10 anos (obrigação fiscal);</li>
              <li>Memória de agentes IA: 30 dias (limpeza automática agendada).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Seus Direitos (LGPD, Art. 18)</h2>
            <p>Como titular de dados, você tem direito a:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
              <li><strong>Acesso:</strong> saber quais dados temos sobre você;</li>
              <li><strong>Correção:</strong> solicitar atualização de dados incorretos;</li>
              <li><strong>Exclusão:</strong> solicitar exclusão dos dados (exceto quando há obrigação legal de retenção);</li>
              <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado;</li>
              <li><strong>Oposição:</strong> opor-se ao tratamento baseado em legítimo interesse;</li>
              <li><strong>Revogação do consentimento:</strong> revogar consentimentos concedidos;</li>
              <li><strong>Informação sobre compartilhamento:</strong> saber com quem seus dados são compartilhados.</li>
            </ul>
            <p className="mt-3">
              Para exercer seus direitos, envie solicitação para{' '}
              <a href="mailto:privacidade@jurify.com.br" className="text-primary underline">
                privacidade@jurify.com.br
              </a>{' '}
              com o assunto "LGPD – Direitos do Titular". Respondemos em até 15 dias úteis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Cookies</h2>
            <p>Utilizamos cookies para:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
              <li><strong>Essenciais:</strong> autenticação, segurança e funcionamento do Serviço (sem necessidade de consentimento);</li>
              <li><strong>Analíticos:</strong> compreensão de como o Serviço é utilizado (com consentimento);</li>
              <li><strong>Preferências:</strong> tema, idioma e configurações do usuário.</li>
            </ul>
            <p className="mt-2">
              Você pode gerenciar cookies nas configurações do seu navegador ou pelo nosso banner de cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Menores de Idade</h2>
            <p>
              O Serviço não é direcionado a menores de 18 anos. Não coletamos intencionalmente dados de
              crianças ou adolescentes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Alterações nesta Política</h2>
            <p>
              Esta Política pode ser atualizada periodicamente. Notificaremos por e-mail e/ou aviso na
              plataforma sobre mudanças relevantes, com antecedência de 30 dias.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Autoridade Nacional</h2>
            <p>
              Você tem o direito de registrar reclamação junto à Autoridade Nacional de Proteção de Dados
              (ANPD) pelo portal{' '}
              <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                www.gov.br/anpd
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
          <span>© 2026 Jurify Tecnologia Ltda.</span>
          <div className="flex gap-4">
            <Link to="/termos" className="hover:text-foreground transition-colors">
              Termos de Uso
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

export default PoliticaDePrivacidade;
