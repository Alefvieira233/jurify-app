import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const EXAMPLE_MESSAGES = [
  {
    label: 'Caso Trabalhista',
    text: 'Fui demitido sem justa causa ha 2 meses. A empresa nao pagou minhas verbas rescisorias, incluindo FGTS de R$ 12.000 e aviso previo de R$ 3.500. Trabalhei por 5 anos com carteira assinada. Preciso processar a empresa.'
  },
  {
    label: 'Direito do Consumidor',
    text: 'Comprei uma TV de 55 polegadas por R$ 2.800 ha 3 meses. Ela apresentou defeito na tela (linhas verticais). A loja se recusa a trocar alegando que foi mau uso, mas nunca caiu e sempre foi bem cuidada. Quero meu dinheiro de volta.'
  },
  {
    label: 'Direito de Familia',
    text: 'Preciso entrar com divorcio consensual. Somos casados ha 8 anos no regime de comunhao parcial de bens. Temos um apartamento de R$ 450.000 e dois filhos menores (7 e 4 anos). Ja conversamos e queremos fazer amigavelmente.'
  },
  {
    label: 'Previdenciario',
    text: 'Minha aposentadoria por tempo de contribuicao foi negada pelo INSS. Contribui por 33 anos e 4 meses. O INSS alegou que faltam 2 anos de contribuicao, mas tenho contratos de trabalho que comprovam o periodo. Preciso recorrer.'
  },
  {
    label: 'Acidente de Transito',
    text: 'Sofri acidente de carro ha 1 mes. O outro motorista avancou o sinal vermelho e bateu na lateral do meu veiculo. Tenho boletim de ocorrencia, testemunhas e laudos medicos. Tive fraturas no braco e fiquei 15 dias sem trabalhar. Quero ser indenizado.'
  }
];

export interface PlaygroundExamplesProps {
  onLoadExample: (text: string) => void;
  loading: boolean;
}

export default function PlaygroundExamples({ onLoadExample, loading }: PlaygroundExamplesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Exemplos Rapidos</CardTitle>
        <CardDescription>Clique em um exemplo para carregar</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_MESSAGES.map((example, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => onLoadExample(example.text)}
              disabled={loading}
            >
              {example.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
