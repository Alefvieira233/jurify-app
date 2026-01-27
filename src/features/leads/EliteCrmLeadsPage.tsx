import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";

/**
 * Elite Legal CRM - Lead Interface (TypeScript + React + Tailwind)
 *
 * ? Como usar no Jurify:
 * - Cole este arquivo como: `EliteCrmLeadsPage.tsx`
 * - Garanta que o Tailwind esteja ativo no projeto
 * - Garanta que as fontes/�cones estejam carregados no seu `index.html` (Vite/React) ou `layout.tsx` (Next):
 *
 *   <link rel="preconnect" href="https://fonts.googleapis.com">
 *   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
 *   <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
 *
 * - Se voc� usa tema escuro por classe, mantenha `class="dark"` no html/body ou no wrapper do app.
 */

type NavItem = {
  label: string;
  to: string;
  end?: boolean;
};

type StatCard = {
  label: string;
  value: string;
  subValue?: string;
  icon: string; // Material Symbols name
  tone: "blue" | "amber" | "emerald";
};

type TimelineDot = {
  color: "emerald" | "amber" | "slate";
  title?: string;
};

type LeadStatus =
  | "Proposta Enviada"
  | "Qualificado"
  | "Reuni�o Agendada"
  | "Aguardando Resposta";

type Lead = {
  id: string;
  name: string;
  initials: string;
  initialsColor: "gold" | "blue" | "emerald";
  status: LeadStatus;
  createdAtLabel: string;
  updatedAtLabel: string;
  phone: string;
  email: string;
  segmentTitle: string;
  segmentSubtitle: string;
  estimatedValue: string;
  score: number;
  scoreTone: "emerald" | "amber";
  timeline: TimelineDot[];
  nextStep: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function statusPillClasses(status: LeadStatus) {
  switch (status) {
    case "Proposta Enviada":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "Qualificado":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "Reuni�o Agendada":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "Aguardando Resposta":
    default:
      return "bg-slate-500/10 text-slate-300 border-slate-500/20";
  }
}

function initialsToneClasses(tone: Lead["initialsColor"]) {
  switch (tone) {
    case "blue":
      return "text-blue-400";
    case "emerald":
      return "text-emerald-400";
    case "gold":
    default:
      return "text-[#D4AF37]";
  }
}

function scoreClasses(tone: Lead["scoreTone"]) {
  return tone === "emerald" ? "text-emerald-400" : "text-amber-400";
}

function timelineDotClasses(color: TimelineDot["color"]) {
  switch (color) {
    case "emerald":
      return "bg-emerald-400";
    case "amber":
      return "bg-amber-400";
    case "slate":
    default:
      return "bg-slate-600";
  }
}

export default function EliteCrmLeadsPage(): JSX.Element {
  const nav: NavItem[] = [
    { label: "Dashboard", to: "/", end: true },
    { label: "Leads", to: "/leads" },
    { label: "Pipeline", to: "/pipeline" },
    { label: "Relatorios", to: "/relatorios" },
  ];

  const stats: StatCard[] = [
    {
      label: "Conversion Rate",
      value: "24.8%",
      subValue: "+2.1%",
      icon: "trending_up",
      tone: "blue",
    },
    {
      label: "Active Leads",
      value: "1,284",
      subValue: "total",
      icon: "group",
      tone: "amber",
    },
    {
      label: "Revenue Pipeline",
      value: "R$ 2.4M",
      icon: "payments",
      tone: "emerald",
    },
  ];

  const leadsSeed: Lead[] = [
    {
      id: "lead-1",
      name: "Patricia Santos",
      initials: "PS",
      initialsColor: "gold",
      status: "Proposta Enviada",
      createdAtLabel: "15 Out 2023",
      updatedAtLabel: "Atualizado h� 2h",
      phone: "(11) 98765-4321",
      email: "patricia.s@corp.com",
      segmentTitle: "Direito Empresarial",
      segmentSubtitle: "Contrato de Presta��o de Servi�o",
      estimatedValue: "R$ 45.000,00",
      score: 92,
      scoreTone: "emerald",
      timeline: [
        { color: "emerald", title: "Contato Realizado" },
        { color: "amber", title: "Proposta Enviada" },
        { color: "slate", title: "Aguardando Resposta" },
      ],
      nextStep: "Follow-up Agendado (24/10)",
    },
    {
      id: "lead-2",
      name: "Marcos Castro",
      initials: "MC",
      initialsColor: "blue",
      status: "Qualificado",
      createdAtLabel: "18 Out 2023",
      updatedAtLabel: "Atualizado h� 1d",
      phone: "(21) 99822-1133",
      email: "marcos@castro.adv",
      segmentTitle: "Direito Imobili�rio",
      segmentSubtitle: "Regulariza��o de Posse",
      estimatedValue: "R$ 12.500,00",
      score: 64,
      scoreTone: "amber",
      timeline: [{ color: "emerald" }, { color: "slate" }],
      nextStep: "Solicitar Matr�cula",
    },
    {
      id: "lead-3",
      name: "Fernanda Alves",
      initials: "FA",
      initialsColor: "emerald",
      status: "Reuni�o Agendada",
      createdAtLabel: "20 Out 2023",
      updatedAtLabel: "Atualizado h� 15min",
      phone: "(31) 98877-0099",
      email: "fer.alves@me.com",
      segmentTitle: "Direito Tribut�rio",
      segmentSubtitle: "Recupera��o de Cr�ditos",
      estimatedValue: "R$ 180.000,00",
      score: 98,
      scoreTone: "emerald",
      timeline: [{ color: "emerald" }, { color: "emerald" }, { color: "emerald" }],
      nextStep: "Reuni�o Hoje (15:00)",
    },
  ];

  const [query, setQuery] = useState<string>("");
  const [view, setView] = useState<"list" | "kanban">("list");

  const leads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leadsSeed;
    return leadsSeed.filter((l) => {
      const hay = [
        l.name,
        l.email,
        l.phone,
        l.segmentTitle,
        l.segmentSubtitle,
        l.status,
        l.nextStep,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  return (
    <div className="min-h-screen text-slate-200 bg-[radial-gradient(circle_at_top_left,_#0f172a_0%,_#020617_100%)] font-[Inter]">
      {/* Global styles that were in <style> */}
      <style>{`
        :root {
          --glass-bg: rgba(15, 23, 42, 0.6);
          --glass-border: rgba(255, 255, 255, 0.08);
          --luminous-border: rgba(212, 175, 55, 0.3);
          --gold-glow: 0 0 20px rgba(212, 175, 55, 0.4);
        }
        .glass-nav {
          background: rgba(2, 6, 23, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--glass-border);
        }
        .glass-card {
          background: var(--glass-bg);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid var(--glass-border);
        }
        .lead-card {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid var(--glass-border);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .lead-card:hover {
          border-color: var(--luminous-border);
          transform: translateY(-2px);
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
          background: rgba(30, 41, 59, 0.6);
        }
        .gold-button {
          background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%);
          box-shadow: var(--gold-glow);
        }
        .active-nav-link {
          color: #D4AF37;
          text-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
        }
        .timeline-dot {
          position: relative;
        }
        .timeline-dot::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 100%;
          width: 1px;
          height: 12px;
          background: var(--glass-border);
          transform: translateX(-50%);
        }
        .timeline-dot:last-child::after { display: none; }
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
      `}</style>

      {/* NAV */}
      <nav className="glass-nav fixed top-0 w-full z-50">
        <div className="max-w-[1600px] mx-auto px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-700 rounded-lg flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-slate-900 font-bold">
                  balance
                </span>
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">
                ELITE<span className="text-[#D4AF37]">CRM</span>
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-8">
              {nav.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cx(
                      "text-sm uppercase tracking-widest transition-all",
                      isActive
                        ? "font-bold active-nav-link border-b-2 border-[#D4AF37] pb-1"
                        : "font-semibold opacity-60 hover:opacity-100"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group">
              <span className="material-symbols-outlined opacity-60 group-hover:opacity-100 cursor-pointer transition-all">
                notifications
              </span>
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#D4AF37] rounded-full" />
            </div>

            <div className="h-6 w-px bg-slate-700" />

            <div className="flex items-center gap-3 pl-2">
              <div className="text-right">
                <p className="text-xs font-bold text-white leading-none">Dr. Ricardo Silva</p>
                <p className="text-[10px] text-[#D4AF37] font-medium tracking-tighter uppercase mt-1">
                  S�cio Diretor
                </p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-[#D4AF37] p-0.5 overflow-hidden">
                <div className="w-full h-full bg-slate-800 rounded-full flex items-center justify-center font-bold text-xs text-[#D4AF37]">
                  RS
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <main className="pt-24 pb-12 px-8 max-w-[1600px] mx-auto">
        {/* TOP STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          {stats.map((s) => {
            const tone =
              s.tone === "blue"
                ? {
                    wrap: "bg-blue-500/10 border-blue-500/20",
                    icon: "text-blue-400",
                  }
                : s.tone === "amber"
                ? {
                    wrap: "bg-amber-500/10 border-amber-500/20",
                    icon: "text-amber-400",
                  }
                : {
                    wrap: "bg-emerald-500/10 border-emerald-500/20",
                    icon: "text-emerald-400",
                  };

            return (
              <div key={s.label} className="glass-card rounded-2xl p-5 flex items-center gap-4">
                <div className={cx("w-12 h-12 rounded-xl flex items-center justify-center border", tone.wrap)}>
                  <span className={cx("material-symbols-outlined", tone.icon)}>{s.icon}</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">
                    {s.label}
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {s.value}{" "}
                    {s.subValue && (
                      <span
                        className={cx(
                          "text-xs font-medium",
                          s.tone === "blue"
                            ? "text-emerald-400"
                            : s.tone === "amber"
                            ? "text-slate-400"
                            : "text-slate-400"
                        )}
                      >
                        {s.subValue}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-end">
            <button
              type="button"
              className="gold-button flex items-center gap-2 px-8 py-4 rounded-xl text-slate-900 font-extrabold text-sm uppercase tracking-widest hover:scale-105 transition-all"
              onClick={() => {
                // Hook: aqui voc� abre modal de "Nova Oportunidade" no Jurify
                alert("Nova oportunidade (placeholder)");
              }}
            >
              <span className="material-symbols-outlined font-bold">add</span>
              Nova Oportunidade
            </button>
          </div>
        </div>

        {/* SEARCH + FILTER + VIEW */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4 flex-grow max-w-2xl">
            <div className="relative flex-grow">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                search
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] placeholder-slate-600 transition-all"
                placeholder="Pesquisar por cliente, processo ou tag..."
                type="text"
              />
            </div>

            <button
              type="button"
              className="glass-card px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold opacity-80 hover:opacity-100 transition-all"
              onClick={() => alert("Filtros (placeholder)")}
            >
              <span className="material-symbols-outlined text-sm">filter_list</span>
              Filtros
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                className={cx(
                  "p-2 rounded-lg flex items-center justify-center transition-all",
                  view === "list"
                    ? "bg-[#D4AF37] text-slate-900 shadow-inner"
                    : "text-slate-400 hover:text-white"
                )}
                onClick={() => setView("list")}
                aria-label="Visualiza��o em lista"
              >
                <span className="material-symbols-outlined text-sm">view_list</span>
              </button>

              <button
                type="button"
                className={cx(
                  "p-2 rounded-lg flex items-center justify-center transition-all",
                  view === "kanban"
                    ? "bg-[#D4AF37] text-slate-900 shadow-inner"
                    : "text-slate-400 hover:text-white"
                )}
                onClick={() => setView("kanban")}
                aria-label="Visualiza��o em kanban"
              >
                <span className="material-symbols-outlined text-sm">view_kanban</span>
              </button>
            </div>
          </div>
        </div>

        {/* LIST VIEW (igual ao seu HTML) */}
        {view === "list" ? (
          <div className="space-y-4">
            {leads.map((lead) => (
              <div key={lead.id} className="lead-card rounded-2xl p-6 relative overflow-hidden group">
                <div className="flex gap-8">
                  {/* LEFT */}
                  <div className="w-64 shrink-0 flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={cx(
                          "w-12 h-12 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center text-lg font-bold mb-4",
                          initialsToneClasses(lead.initialsColor)
                        )}
                      >
                        {lead.initials}
                      </div>

                      <div className="flex flex-col items-center gap-2 h-full">
                        {lead.timeline.map((t, idx) => (
                          <div
                            key={`${lead.id}-dot-${idx}`}
                            className={cx("timeline-dot w-2 h-2 rounded-full", timelineDotClasses(t.color))}
                            title={t.title}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#D4AF37] transition-colors">
                        {lead.name}
                      </h3>
                      <span
                        className={cx(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-widest w-fit mb-3",
                          statusPillClasses(lead.status)
                        )}
                      >
                        {lead.status}
                      </span>

                      <div className="text-[10px] text-slate-500 flex flex-col gap-1">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">calendar_month</span>{" "}
                          {lead.createdAtLabel}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">history</span>{" "}
                          {lead.updatedAtLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CENTER */}
                  <div className="flex-grow grid grid-cols-3 gap-8 py-2 border-l border-slate-800 pl-8">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block mb-2">
                        Contato
                      </label>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-200 flex items-center gap-2">
                          <span className="material-symbols-outlined text-xs text-slate-500">call</span>{" "}
                          {lead.phone}
                        </p>
                        <p className="text-sm font-medium text-slate-400 flex items-center gap-2">
                          <span className="material-symbols-outlined text-xs text-slate-500">mail</span>{" "}
                          {lead.email}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block mb-2">
                        Segmento
                      </label>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-200">{lead.segmentTitle}</p>
                        <p className="text-[11px] text-slate-500">{lead.segmentSubtitle}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block mb-2">
                        Valor Estimado
                      </label>
                      <div className="space-y-1">
                        <p className="text-lg font-bold text-[#D4AF37]">{lead.estimatedValue}</p>
                        <p className={cx("text-[11px] flex items-center gap-1 font-medium", scoreClasses(lead.scoreTone))}>
                          <span className="material-symbols-outlined text-[12px]">
                            {lead.scoreTone === "emerald" ? "verified" : "warning"}
                          </span>
                          Score: {lead.score}/100
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT */}
                  <div className="flex flex-col justify-between items-end min-w-[140px]">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="w-10 h-10 glass-card rounded-lg flex items-center justify-center hover:text-[#D4AF37] transition-all"
                        onClick={() => alert(`Abrir chat com ${lead.name} (placeholder)`)}
                        aria-label="Chat"
                      >
                        <span className="material-symbols-outlined text-sm">chat</span>
                      </button>

                      <button
                        type="button"
                        className="w-10 h-10 glass-card rounded-lg flex items-center justify-center hover:text-white transition-all"
                        onClick={() => alert(`Ver lead ${lead.name} (placeholder)`)}
                        aria-label="Visualizar"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                      </button>

                      <button
                        type="button"
                        className="w-10 h-10 glass-card rounded-lg flex items-center justify-center hover:border-slate-400 transition-all"
                        onClick={() => alert(`Mais op��es ${lead.name} (placeholder)`)}
                        aria-label="Mais"
                      >
                        <span className="material-symbols-outlined text-sm">more_vert</span>
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 italic">Pr�ximo passo:</span>
                      <p
                        className={cx(
                          "text-[11px] font-semibold",
                          lead.nextStep.includes("Hoje") ? "text-[#D4AF37]" : "text-slate-300"
                        )}
                      >
                        {lead.nextStep}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* PAGINATION */}
            <div className="mt-12 flex items-center justify-between border-t border-slate-800 pt-6">
              <p className="text-xs text-slate-500">
                Exibindo <span className="text-slate-200 font-bold">{Math.min(12, leads.length)}</span> de{" "}
                <span className="text-slate-200 font-bold">1,284</span> leads ativos
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center glass-card rounded-lg opacity-50 cursor-not-allowed"
                  aria-label="P�gina anterior"
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center glass-card rounded-lg bg-[#D4AF37] text-slate-900 font-bold text-xs"
                >
                  1
                </button>
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center glass-card rounded-lg hover:text-white transition-all text-xs"
                >
                  2
                </button>
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center glass-card rounded-lg hover:text-white transition-all text-xs"
                >
                  3
                </button>
                <span className="text-slate-600">...</span>
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center glass-card rounded-lg hover:text-white transition-all text-xs"
                >
                  107
                </button>
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center glass-card rounded-lg hover:text-white transition-all"
                  aria-label="Pr�xima p�gina"
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Kanban placeholder (pra voc� plugar depois no Jurify)
          <div className="glass-card rounded-2xl p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Kanban</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Aqui voc� pode renderizar colunas por status (Qualificado, Proposta Enviada, etc.).
                </p>
              </div>
              <button
                type="button"
                className="glass-card px-4 py-2 rounded-xl text-sm font-semibold hover:text-white transition-all"
                onClick={() => setView("list")}
              >
                Voltar para Lista
              </button>
            </div>
          </div>
        )}
      </main>

      {/* FLOATING AGENT BUTTON */}
      <button
        type="button"
        className="fixed bottom-8 right-8 w-14 h-14 glass-card rounded-2xl flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all group z-50"
        onClick={() => alert("Suporte (placeholder)")}
        aria-label="Suporte"
      >
        <span className="material-symbols-outlined text-[#D4AF37] group-hover:rotate-45 transition-transform">
          support_agent
        </span>
      </button>
    </div>
  );
}
