import { TrendingUp } from 'lucide-react';
import { Sankey, Tooltip, Layer, Rectangle, ResponsiveContainer } from 'recharts';

/* ── Pipeline stage config ── */
const STAGE_NODES = [
  { name: 'Nova Conversa', color: '#6b7280' },
  { name: 'Análise',       color: '#f59e0b' },
  { name: 'Qualificado',   color: '#10b981' },
  { name: 'Proposta',      color: '#6366f1' },
  { name: 'Negociação',    color: '#8b5cf6' },
  { name: 'Sucesso',       color: '#22c55e' },
  { name: 'Perdas',        color: '#ef4444' },
];

interface SankeyChartProps {
  leads: Array<{ status: string | null; created_at: string }>;
}

interface SankeyLinkItem {
  source: number;
  target: number;
  value: number;
}

function buildSankeyData(leads: SankeyChartProps['leads']) {
  let novo = 0, em_contato = 0, qualificado = 0, proposta = 0, negociacao = 0, ganho = 0, perdido = 0;

  for (const lead of leads) {
    switch (lead.status) {
      case 'novo':        novo++;        break;
      case 'em_contato':  em_contato++;  break;
      case 'qualificado': qualificado++; break;
      case 'proposta':    proposta++;    break;
      case 'negociacao':  negociacao++;  break;
      case 'ganho':       ganho++;       break;
      case 'perdido':     perdido++;     break;
      default: break;
    }
  }

  const nodes = STAGE_NODES.map(n => ({ name: n.name }));

  // Total leads that advanced past each stage (real funnel data)
  const passedAnalise = em_contato + qualificado + proposta + negociacao + ganho;
  const passedQualificado = qualificado + proposta + negociacao + ganho;
  const passedProposta = proposta + negociacao + ganho;
  const passedNegociacao = negociacao + ganho;

  // Real loss at each stage: leads that stopped at this stage and eventually became perdido
  // Since we can't track exact loss point without history, distribute proportionally
  // based on where leads currently sit (stalled = potential loss point)
  const stalled = [novo, em_contato, qualificado, proposta];
  const stalledTotal = stalled.reduce((a, b) => a + b, 0) || 1;
  const lossFromNovo = Math.floor(perdido * (novo / stalledTotal));
  const lossFromContato = Math.floor(perdido * (em_contato / stalledTotal));
  const lossFromQualificado = Math.floor(perdido * (qualificado / stalledTotal));
  // Last stage gets remainder to guarantee sum === perdido (no rounding drift)
  const lossFromProposta = perdido - lossFromNovo - lossFromContato - lossFromQualificado;

  // Nodes: 0=Nova Conversa, 1=Análise, 2=Qualificado, 3=Proposta, 4=Negociação, 5=Sucesso, 6=Perdas
  const rawLinks: SankeyLinkItem[] = [
    // Forward funnel
    { source: 0, target: 1, value: passedAnalise },
    { source: 1, target: 2, value: passedQualificado },
    { source: 2, target: 3, value: passedProposta },
    { source: 3, target: 4, value: passedNegociacao },
    { source: 4, target: 5, value: ganho },
    // Loss branches (proportional to stalled leads at each stage)
    { source: 0, target: 6, value: lossFromNovo },
    { source: 1, target: 6, value: lossFromContato },
    { source: 2, target: 6, value: lossFromQualificado },
    { source: 3, target: 6, value: lossFromProposta },
  ];

  const links = rawLinks.filter(l => l.value > 0);

  return { nodes, links };
}

/* ── Custom node renderer ── */
interface CustomNodeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  payload?: { name: string };
}

function CustomNode({ x = 0, y = 0, width = 0, height = 0, index = 0, payload }: CustomNodeProps) {
  const color = STAGE_NODES[index]?.color ?? '#6b7280';
  const isRightSide = index >= 5;
  const labelX = isRightSide ? x - 6 : x + width + 6;
  const textAnchor = isRightSide ? 'end' : 'start';

  return (
    <Layer>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        fillOpacity={0.9}
        radius={2}
      />
      <text
        x={labelX || 0}
        y={Number.isFinite(y + height / 2) ? y + height / 2 : 0}
        textAnchor={textAnchor}
        dominantBaseline="central"
        fontSize={11}
        fill="hsl(var(--foreground))"
      >
        {payload?.name}
      </text>
    </Layer>
  );
}

/* ── Custom link renderer ── */
interface CustomLinkProps {
  sourceX?: number;
  targetX?: number;
  sourceY?: number;
  targetY?: number;
  sourceControlX?: number;
  targetControlX?: number;
  linkWidth?: number;
  payload?: { source: { index: number }; target: { index: number } };
}

function CustomLink({
  sourceX = 0, targetX = 0, sourceY = 0, targetY = 0,
  sourceControlX = 0, targetControlX = 0,
  linkWidth = 0,
  payload,
}: CustomLinkProps) {
  const sourceIndex = payload?.source?.index ?? 0;
  const color = STAGE_NODES[sourceIndex]?.color ?? '#6b7280';

  return (
    <Layer>
      <path
        d={`
          M${sourceX},${sourceY - linkWidth / 2}
          C${sourceControlX},${sourceY - linkWidth / 2}
            ${targetControlX},${targetY - linkWidth / 2}
            ${targetX},${targetY - linkWidth / 2}
          L${targetX},${targetY + linkWidth / 2}
          C${targetControlX},${targetY + linkWidth / 2}
            ${sourceControlX},${sourceY + linkWidth / 2}
            ${sourceX},${sourceY + linkWidth / 2}
          Z
        `}
        fill={color}
        fillOpacity={0.3}
        stroke="none"
      />
    </Layer>
  );
}

/* ── SankeyChart ── */
const SankeyChart = ({ leads }: SankeyChartProps) => {
  const total = leads.length;
  const sankeyData = buildSankeyData(leads);

  return (
    <div className="border border-border rounded-lg p-5 bg-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Fluxo do Pipeline</h2>
        </div>
        <span className="text-xs text-muted-foreground">Distribuição por status</span>
      </div>

      {total === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
          Sem dados de leads para o período selecionado.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <Sankey
            data={sankeyData}
            nodeWidth={10}
            nodePadding={24}
            margin={{ top: 10, right: 40, bottom: 10, left: 40 }}
            node={<CustomNode />}
            link={<CustomLink />}
          >
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
          </Sankey>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default SankeyChart;
