export const REPORT_VARIABLES = [
  { id: 'projects', label: 'Projetos', description: 'Nome, descrição, fase, responsável e cliente.', category: 'Portfólio' },
  { id: 'project_status', label: 'Saúde e status', description: 'Situação, evolução e volume de entregas dos projetos.', category: 'Portfólio' },
  { id: 'progress', label: 'Progresso', description: 'Avanço calculado a partir das tarefas concluídas.', category: 'Portfólio' },
  { id: 'deadlines', label: 'Prazos e atrasos', description: 'Datas, vencimentos e itens potencialmente atrasados.', category: 'Execução' },
  { id: 'kpis', label: 'KPIs', description: 'Indicadores vinculados aos projetos.', category: 'Portfólio' },
  { id: 'tasks', label: 'Tarefas e entregas', description: 'Tarefas, prioridades, responsáveis e andamento.', category: 'Execução' },
  { id: 'blockers', label: 'Bloqueios', description: 'Motivos de bloqueio registrados nas tarefas.', category: 'Riscos' },
  { id: 'dependencies', label: 'Dependências', description: 'Dependências entre projetos e impactos associados.', category: 'Riscos' },
  { id: 'team', label: 'Equipe e responsáveis', description: 'Pessoas responsáveis e áreas envolvidas.', category: 'Pessoas' },
  { id: 'activity_logs', label: 'Diário de bordo', description: 'Registros de atividades e evolução no período.', category: 'Execução' },
  { id: 'clients', label: 'Clientes', description: 'Clientes relacionados aos projetos e tarefas.', category: 'Relacionamento' },
  { id: 'workload', label: 'Carga e horas', description: 'Horas planejadas e apontadas nas tarefas.', category: 'Pessoas' },
  { id: 'risks', label: 'Riscos e criticidade', description: 'Sinais de atraso, bloqueio, prioridade e dependência.', category: 'Riscos' }
] as const;

export type ReportVariableId = typeof REPORT_VARIABLES[number]['id'];
export type ReportRequiredScope = 'any' | 'client';

export type ReportTemplateSection = {
  id: string;
  title: string;
  instructions: string;
  variables: ReportVariableId[];
};

export type ReportTemplateDefinition = {
  id: string;
  name: string;
  description: string;
  sections: ReportTemplateSection[];
  requiredScope: ReportRequiredScope;
  featured: boolean;
  builtIn: boolean;
};

const section = (id: string, title: string, instructions: string, variables: ReportVariableId[]): ReportTemplateSection => ({
  id, title, instructions, variables
});

export const DEFAULT_REPORT_TEMPLATES: ReportTemplateDefinition[] = [
  {
    id: 'senior-project-manager',
    name: 'Gestor de Projetos Sênior',
    description: 'Um diagnóstico experiente do portfólio, com decisões e plano de ação para 7, 30 e 90 dias.',
    featured: true,
    builtIn: true,
    requiredScope: 'any',
    sections: [
      section('senior-diagnosis', 'Diagnóstico executivo', 'Explique de forma direta a situação atual, o que merece atenção da liderança e a confiança possível nos dados disponíveis.', ['projects', 'project_status', 'progress', 'deadlines', 'kpis', 'risks']),
      section('senior-health', 'Saúde do portfólio', 'Avalie equilíbrio, andamento, prazos, prioridades e concentração do portfólio. Separe fatos observados de hipóteses.', ['projects', 'project_status', 'progress', 'deadlines', 'dependencies', 'clients']),
      section('senior-critical', 'Projetos críticos e causas prováveis', 'Liste os projetos que exigem intervenção, apresente evidências, impacto provável e perguntas que precisam ser respondidas. Não invente causas.', ['projects', 'tasks', 'blockers', 'deadlines', 'dependencies', 'risks', 'activity_logs']),
      section('senior-governance', 'Governança, equipe e capacidade', 'Analise clareza de responsáveis, distribuição do trabalho, carga, cadência de acompanhamento e lacunas de informação.', ['team', 'workload', 'tasks', 'projects', 'activity_logs']),
      section('senior-decisions', 'Decisões necessárias', 'Recomende decisões objetivas, com prioridade, responsável sugerido, prazo e benefício esperado. Identifique o que deve ser interrompido, corrigido ou escalado.', ['projects', 'risks', 'dependencies', 'deadlines', 'team']),
      section('senior-plan', 'Plano de ação 7, 30 e 90 dias', 'Monte um plano realista dividido em 7, 30 e 90 dias. Inclua ritos de gestão, entregas verificáveis e sinais de sucesso.', ['projects', 'tasks', 'risks', 'team', 'kpis', 'activity_logs'])
    ]
  },
  {
    id: 'executive', name: 'Resumo executivo', featured: false, builtIn: true, requiredScope: 'any',
    description: 'Visão geral, principais resultados, pontos de atenção e próximos passos.',
    sections: [
      section('executive-overview', 'Síntese executiva', 'Resuma os principais fatos, resultados e mudanças observáveis no período.', ['projects', 'tasks', 'activity_logs', 'kpis']),
      section('executive-attention', 'Pontos de atenção', 'Destaque riscos, atrasos, bloqueios e decisões que exigem atenção.', ['risks', 'deadlines', 'blockers', 'dependencies']),
      section('executive-actions', 'Próximos passos', 'Proponha próximos passos acionáveis, priorizados e compatíveis com os dados.', ['projects', 'tasks', 'team'])
    ]
  },
  {
    id: 'portfolio', name: 'Portfólio de projetos', featured: false, builtIn: true, requiredScope: 'any',
    description: 'Situação dos projetos, progresso, prazos, KPIs e dependências.',
    sections: [
      section('portfolio-overview', 'Panorama do portfólio', 'Apresente a composição e o estado geral do portfólio.', ['projects', 'project_status', 'progress', 'clients']),
      section('portfolio-performance', 'Evolução e indicadores', 'Analise entregas, prazos e KPIs disponíveis sem criar métricas ausentes.', ['tasks', 'deadlines', 'kpis', 'progress']),
      section('portfolio-actions', 'Riscos e recomendações', 'Priorize riscos, dependências e ações recomendadas.', ['risks', 'blockers', 'dependencies', 'team'])
    ]
  },
  {
    id: 'productivity', name: 'Produtividade e entregas', featured: false, builtIn: true, requiredScope: 'any',
    description: 'Atividades, tarefas, entregas, carga e evolução da equipe.',
    sections: [
      section('productivity-delivery', 'Entregas no período', 'Analise volume e qualidade aparente das entregas sem criar ranking simplista de pessoas.', ['tasks', 'activity_logs', 'progress']),
      section('productivity-capacity', 'Distribuição e capacidade', 'Avalie distribuição de trabalho, horas e possíveis concentrações.', ['team', 'workload', 'tasks']),
      section('productivity-improvement', 'Bloqueios e melhorias', 'Identifique bloqueios e oportunidades práticas de melhoria.', ['blockers', 'deadlines', 'risks', 'team'])
    ]
  },
  {
    id: 'risks', name: 'Riscos e prioridades', featured: false, builtIn: true, requiredScope: 'any',
    description: 'Atrasos, bloqueios, criticidades e plano de ação sugerido.',
    sections: [
      section('risks-map', 'Mapa de riscos', 'Identifique evidências de atraso, bloqueio, concentração e dependência.', ['risks', 'deadlines', 'blockers', 'dependencies']),
      section('risks-priority', 'Prioridades', 'Organize os itens por urgência e impacto, explicando o critério usado.', ['projects', 'tasks', 'risks']),
      section('risks-plan', 'Plano de resposta', 'Apresente ações, responsáveis sugeridos, prazos e sinais de resolução.', ['team', 'projects', 'tasks'])
    ]
  },
  {
    id: 'client', name: 'Relatório por cliente', featured: false, builtIn: true, requiredScope: 'client',
    description: 'Projetos, atividades, entregas e riscos relacionados ao cliente.',
    sections: [
      section('client-relationship', 'Visão do relacionamento', 'Resuma o trabalho relacionado exclusivamente ao cliente selecionado.', ['clients', 'projects', 'tasks']),
      section('client-delivery', 'Projetos e entregas', 'Apresente situação, progresso, prazos e entregas do cliente.', ['projects', 'project_status', 'progress', 'deadlines', 'kpis', 'tasks']),
      section('client-actions', 'Pendências e próximos passos', 'Destaque riscos, pendências e próximos passos relacionados ao cliente.', ['risks', 'blockers', 'team'])
    ]
  }
];

export const REPORT_VARIABLE_IDS = new Set<string>(REPORT_VARIABLES.map(variable => variable.id));
