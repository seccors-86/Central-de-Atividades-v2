-- Dados totalmente fictícios para apresentações da NUVYO.
-- Este arquivo é carregado apenas por docker-compose.demo.yml.
-- Todos os identificadores usam o prefixo demo- para manter a carga isolada.

BEGIN;

INSERT INTO areas (id, name, parent_id) VALUES
  ('demo-area', 'NUVYO Demonstração', NULL),
  ('demo-area-commercial', 'Comercial', 'demo-area'),
  ('demo-area-operations', 'Operações', 'demo-area'),
  ('demo-area-technology', 'Tecnologia e Dados', 'demo-area'),
  ('demo-area-customer', 'Experiência do Cliente', 'demo-area')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id;

-- Os personagens não possuem CPF nem senha e, portanto, não podem autenticar.
-- As três contas previsíveis existem apenas no provisionador local protegido da API.
INSERT INTO users
  (id, name, role, area_id, cpf, phone, password_hash, avatar_url, available_hours, pode_publicar)
VALUES
  ('demo-user-ana', 'Ana Martins', 'manager', 'demo-area-commercial', NULL, NULL, NULL, 'https://ui-avatars.com/api/?name=Ana+Martins&background=374A67&color=E6FAFC', 160, false),
  ('demo-user-bruno', 'Bruno Costa', 'member', 'demo-area-commercial', NULL, NULL, NULL, 'https://ui-avatars.com/api/?name=Bruno+Costa&background=0E1116&color=E6FAFC', 160, false),
  ('demo-user-carla', 'Carla Lima', 'manager', 'demo-area-operations', NULL, NULL, NULL, 'https://ui-avatars.com/api/?name=Carla+Lima&background=374A67&color=E6FAFC', 160, false),
  ('demo-user-diego', 'Diego Rocha', 'member', 'demo-area-technology', NULL, NULL, NULL, 'https://ui-avatars.com/api/?name=Diego+Rocha&background=0E1116&color=E6FAFC', 152, false),
  ('demo-user-elisa', 'Elisa Nunes', 'member', 'demo-area-customer', NULL, NULL, NULL, 'https://ui-avatars.com/api/?name=Elisa+Nunes&background=374A67&color=E6FAFC', 160, false),
  ('demo-user-felipe', 'Felipe Alves', 'member', 'demo-area-operations', NULL, NULL, NULL, 'https://ui-avatars.com/api/?name=Felipe+Alves&background=0E1116&color=E6FAFC', 144, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  area_id = EXCLUDED.area_id,
  avatar_url = EXCLUDED.avatar_url,
  available_hours = EXCLUDED.available_hours;

INSERT INTO clients (id, name) VALUES
  ('demo-client-aurora', 'Grupo Aurora'),
  ('demo-client-horizonte', 'Horizonte Varejo'),
  ('demo-client-atlas', 'Atlas Serviços'),
  ('demo-client-vertice', 'Vértice Logística'),
  ('demo-client-nuvem', 'Nuvem Educação')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO tags (id, name, color) VALUES
  ('demo-tag-strategic', 'Estratégico', 'bg-emerald-100 text-emerald-800'),
  ('demo-tag-client', 'Cliente', 'bg-cyan-100 text-cyan-800'),
  ('demo-tag-data', 'Dados', 'bg-indigo-100 text-indigo-800'),
  ('demo-tag-urgent', 'Urgente', 'bg-red-100 text-red-800'),
  ('demo-tag-process', 'Processos', 'bg-amber-100 text-amber-800'),
  ('demo-tag-training', 'Treinamento', 'bg-violet-100 text-violet-800')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color;

INSERT INTO status_configs (id, label, color, type) VALUES
  ('backlog', 'Backlog', 'bg-gray-100 text-gray-600', 'neutral'),
  ('doing', 'Em Andamento', 'bg-blue-50 text-blue-700', 'warning'),
  ('done', 'Concluído', 'bg-green-50 text-green-700', 'success')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, color = EXCLUDED.color, type = EXCLUDED.type;

INSERT INTO kanban_buckets (id, name, color, position) VALUES
  ('todo', 'A Fazer / Backlog', '#94a3b8', 1),
  ('doing', 'Em Andamento', '#374A67', 2),
  ('impedimento', 'Impedimento', '#ef4444', 3),
  ('done', 'Concluído', '#0E1116', 4)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, position = EXCLUDED.position;

INSERT INTO project_phases (id, name, color, position) VALUES
  ('10000000-0000-4000-8000-000000000001', 'Backlog', 'bg-slate-100', 1),
  ('10000000-0000-4000-8000-000000000002', 'Triagem / Priorização / Viabilidade', 'bg-amber-100', 2),
  ('10000000-0000-4000-8000-000000000003', 'Planejamento', 'bg-blue-100', 3),
  ('10000000-0000-4000-8000-000000000004', 'Execução', 'bg-indigo-100', 4),
  ('10000000-0000-4000-8000-000000000005', 'Encerramento', 'bg-emerald-100', 5)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, position = EXCLUDED.position;

INSERT INTO project_categories (id, name, position) VALUES
  ('sustentacao', 'Sustentação', 1),
  ('estrategico', 'Estratégico', 2),
  ('inovacao', 'Inovação', 3),
  ('rpa', 'RPA', 4),
  ('processos', 'Melhoria de Processos', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO project_statuses (id, name, color, position) VALUES
  ('ativo', 'Ativo', '#374A67', 1),
  ('impedido', 'Impedido', '#ef4444', 2),
  ('atrasado', 'Atrasado', '#f97316', 3),
  ('pausado', 'Pausado', '#6b7280', 4),
  ('concluido', 'Concluído', '#0E1116', 5),
  ('backlog', 'Não iniciado/Backlog', '#64748b', 6),
  ('cancelado', 'Cancelado', '#991b1b', 7)
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects
  (id, name, description, category, phase, selected_phases, status, start_date, end_date,
   owner_id, dono_id, client_id, demandante_area_id, creator_id, area_id, private, publicar_portal,
   created_at, updated_at)
VALUES
  ('demo-project-crm', 'Implantação do CRM Omnichannel', 'Centralizar o relacionamento comercial e criar uma visão única da jornada dos clientes.', 'Estratégico', 'Execução', '["Planejamento","Execução","Encerramento"]', 'Ativo', CURRENT_DATE - 45, CURRENT_DATE + 35, 'demo-user-ana', 'demo-user-ana', 'demo-client-aurora', 'demo-area-commercial', 'demo-user-ana', 'demo-area-commercial', false, true, NOW() - INTERVAL '45 days', NOW() - INTERVAL '1 day'),
  ('demo-project-portal', 'Novo Portal de Autoatendimento', 'Reduzir chamados repetitivos e oferecer autosserviço aos clientes.', 'Inovação', 'Planejamento', '["Triagem / Priorização / Viabilidade","Planejamento","Execução"]', 'Ativo', CURRENT_DATE - 20, CURRENT_DATE + 70, 'demo-user-diego', 'demo-user-carla', 'demo-client-horizonte', 'demo-area-customer', 'demo-user-elisa', 'demo-area-technology', false, true, NOW() - INTERVAL '20 days', NOW() - INTERVAL '2 days'),
  ('demo-project-billing', 'Automação do Faturamento', 'Automatizar conciliações e reduzir o prazo de fechamento mensal.', 'RPA', 'Execução', '["Planejamento","Execução","Encerramento"]', 'Impedido', CURRENT_DATE - 60, CURRENT_DATE + 12, 'demo-user-felipe', 'demo-user-carla', 'demo-client-atlas', 'demo-area-operations', 'demo-user-carla', 'demo-area-operations', false, false, NOW() - INTERVAL '60 days', NOW() - INTERVAL '3 hours'),
  ('demo-project-expansion', 'Expansão Comercial Sul', 'Preparar processos, metas e materiais para abertura de uma nova frente regional.', 'Estratégico', 'Backlog', '["Backlog","Triagem / Priorização / Viabilidade","Planejamento"]', 'Não iniciado/Backlog', CURRENT_DATE + 15, CURRENT_DATE + 120, 'demo-user-bruno', 'demo-user-ana', 'demo-client-vertice', 'demo-area-commercial', 'demo-user-ana', 'demo-area-commercial', false, false, NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
  ('demo-project-dashboard', 'Dashboard Executivo de Resultados', 'Consolidar indicadores comerciais, operacionais e de experiência do cliente.', 'Melhoria de Processos', 'Encerramento', '["Planejamento","Execução","Encerramento"]', 'Concluído', CURRENT_DATE - 100, CURRENT_DATE - 10, 'demo-user-diego', 'demo-user-carla', 'demo-client-aurora', 'demo-area-technology', 'demo-user-diego', 'demo-area-technology', false, false, NOW() - INTERVAL '100 days', NOW() - INTERVAL '10 days'),
  ('demo-project-onboarding', 'Redesenho do Onboarding Digital', 'Simplificar o cadastro e elevar a ativação de novos clientes.', 'Melhoria de Processos', 'Execução', '["Planejamento","Execução","Encerramento"]', 'Atrasado', CURRENT_DATE - 75, CURRENT_DATE - 5, 'demo-user-elisa', 'demo-user-elisa', 'demo-client-nuvem', 'demo-area-customer', 'demo-user-elisa', 'demo-area-customer', false, true, NOW() - INTERVAL '75 days', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category,
  phase = EXCLUDED.phase, selected_phases = EXCLUDED.selected_phases, status = EXCLUDED.status,
  start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, owner_id = EXCLUDED.owner_id,
  dono_id = EXCLUDED.dono_id, client_id = EXCLUDED.client_id,
  demandante_area_id = EXCLUDED.demandante_area_id, area_id = EXCLUDED.area_id,
  updated_at = EXCLUDED.updated_at;

INSERT INTO project_kpi_links (project_id, kpi_id) VALUES
  ('demo-project-crm', 'vendas'),
  ('demo-project-crm', 'novos-clientes'),
  ('demo-project-portal', 'novos-clientes'),
  ('demo-project-billing', 'receita-bruta'),
  ('demo-project-expansion', 'receita-bruta'),
  ('demo-project-expansion', 'vendas'),
  ('demo-project-expansion', 'novos-clientes'),
  ('demo-project-dashboard', 'receita-bruta'),
  ('demo-project-dashboard', 'vendas'),
  ('demo-project-dashboard', 'novos-clientes'),
  ('demo-project-onboarding', 'novos-clientes')
ON CONFLICT (project_id, kpi_id) DO NOTHING;

INSERT INTO project_members (project_id, user_id, role, added_by) VALUES
  ('demo-project-crm', 'demo-user-bruno', 'editor', 'demo-user-ana'),
  ('demo-project-portal', 'demo-user-elisa', 'editor', 'demo-user-diego'),
  ('demo-project-portal', 'demo-user-carla', 'viewer', 'demo-user-diego'),
  ('demo-project-billing', 'demo-user-diego', 'editor', 'demo-user-carla'),
  ('demo-project-dashboard', 'demo-user-carla', 'owner', 'demo-user-diego'),
  ('demo-project-onboarding', 'demo-user-diego', 'viewer', 'demo-user-elisa')
ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO tasks
  (id, title, description, owner_id, start_date, deadline, progress, status, area_id,
   subtasks, project_id, flow_step, priority, hours, notes, time_logs, task_type,
   client_id, demandante_area_id, blocked_reason, blocked_since, publicar_portal)
VALUES
  ('demo-task-crm-map', 'Mapear jornada comercial atual', 'Entrevistar as equipes e consolidar pontos de contato.', 'demo-user-bruno', CURRENT_DATE - 40, CURRENT_DATE - 28, 100, 'done', 'demo-area-commercial', '[{"id":"1","title":"Entrevistas","completed":true},{"id":"2","title":"Mapa consolidado","completed":true}]', 'demo-project-crm', 'Planejamento', 'Alta', '16', 'Entregável validado pela gestão.', '[]', 'activity', 'demo-client-aurora', 'demo-area-commercial', NULL, NULL, false),
  ('demo-task-crm-import', 'Preparar importação da base de clientes', 'Higienizar e validar os dados antes da migração.', 'demo-user-diego', CURRENT_DATE - 12, CURRENT_DATE + 5, 65, 'doing', 'demo-area-technology', '[{"id":"1","title":"Remover duplicidades","completed":true},{"id":"2","title":"Validar campos obrigatórios","completed":false}]', 'demo-project-crm', 'Execução', 'Alta', '32', 'Amostra inicial aprovada.', '[]', 'activity', 'demo-client-aurora', 'demo-area-commercial', NULL, NULL, true),
  ('demo-task-crm-training', 'Treinar equipe de vendas', 'Capacitação prática sobre funil e registro de oportunidades.', 'demo-user-ana', CURRENT_DATE + 8, CURRENT_DATE + 18, 0, 'todo', 'demo-area-commercial', '[]', 'demo-project-crm', 'Execução', 'Média', '12', NULL, '[]', 'activity', 'demo-client-aurora', 'demo-area-commercial', NULL, NULL, false),
  ('demo-task-crm-tests', 'Executar testes de aceite do CRM', 'Validar os principais cenários comerciais antes da entrada em produção.', 'demo-user-bruno', CURRENT_DATE, CURRENT_DATE + 10, 20, 'doing', 'demo-area', '[{"id":"1","title":"Criar oportunidades","completed":true},{"id":"2","title":"Testar aprovações","completed":false}]', 'demo-project-crm', 'Execução', 'Alta', '20', 'Tarefa compartilhada com o colaborador da conta demo.', '[]', 'activity', 'demo-client-aurora', 'demo-area-commercial', NULL, NULL, false),
  ('demo-task-portal-research', 'Analisar motivos de contato', 'Classificar chamados dos últimos 90 dias.', 'demo-user-elisa', CURRENT_DATE - 18, CURRENT_DATE - 8, 100, 'done', 'demo-area-customer', '[]', 'demo-project-portal', 'Triagem / Priorização / Viabilidade', 'Média', '10', NULL, '[]', 'activity', 'demo-client-horizonte', 'demo-area-customer', NULL, NULL, false),
  ('demo-task-portal-prototype', 'Criar protótipo navegável', 'Desenhar os fluxos prioritários de autosserviço.', 'demo-user-diego', CURRENT_DATE - 5, CURRENT_DATE + 14, 40, 'doing', 'demo-area-technology', '[]', 'demo-project-portal', 'Planejamento', 'Alta', '28', NULL, '[]', 'activity', 'demo-client-horizonte', 'demo-area-customer', NULL, NULL, true),
  ('demo-task-portal-content', 'Revisar conteúdo da central de ajuda', 'Padronizar linguagem e instruções dos artigos.', 'demo-user-elisa', CURRENT_DATE + 3, CURRENT_DATE + 30, 0, 'todo', 'demo-area-customer', '[]', 'demo-project-portal', 'Planejamento', 'Baixa', '24', NULL, '[]', 'activity', 'demo-client-horizonte', 'demo-area-customer', NULL, NULL, false),
  ('demo-task-billing-rules', 'Documentar regras de conciliação', 'Levantar exceções fiscais e financeiras.', 'demo-user-felipe', CURRENT_DATE - 50, CURRENT_DATE - 25, 100, 'done', 'demo-area-operations', '[]', 'demo-project-billing', 'Planejamento', 'Alta', '22', NULL, '[]', 'activity', 'demo-client-atlas', 'demo-area-operations', NULL, NULL, false),
  ('demo-task-billing-robot', 'Desenvolver robô de conciliação', 'Automatizar leitura e conferência dos lançamentos.', 'demo-user-diego', CURRENT_DATE - 20, CURRENT_DATE + 2, 55, 'impedimento', 'demo-area-technology', '[]', 'demo-project-billing', 'Execução', 'Urgente', '48', 'Aguardando acesso ao ambiente financeiro.', '[]', 'activity', 'demo-client-atlas', 'demo-area-operations', 'Credencial de homologação pendente', NOW() - INTERVAL '3 days', false),
  ('demo-task-billing-validation', 'Validar fechamento automatizado', 'Comparar resultados manuais e automatizados.', 'demo-user-carla', CURRENT_DATE + 3, CURRENT_DATE + 9, 0, 'todo', 'demo-area-operations', '[]', 'demo-project-billing', 'Encerramento', 'Alta', '16', NULL, '[]', 'activity', 'demo-client-atlas', 'demo-area-operations', NULL, NULL, false),
  ('demo-task-expansion-plan', 'Construir plano regional', 'Definir metas, segmentos e cronograma de entrada.', 'demo-user-ana', CURRENT_DATE + 15, CURRENT_DATE + 35, 0, 'todo', 'demo-area-commercial', '[]', 'demo-project-expansion', 'Backlog', 'Média', '30', NULL, '[]', 'activity', 'demo-client-vertice', 'demo-area-commercial', NULL, NULL, false),
  ('demo-task-dashboard-model', 'Modelar indicadores executivos', 'Definir métricas e fontes oficiais.', 'demo-user-carla', CURRENT_DATE - 90, CURRENT_DATE - 70, 100, 'done', 'demo-area-operations', '[]', 'demo-project-dashboard', 'Planejamento', 'Alta', '24', NULL, '[]', 'activity', 'demo-client-aurora', 'demo-area-technology', NULL, NULL, false),
  ('demo-task-dashboard-build', 'Construir painéis gerenciais', 'Implementar visões de receita, vendas e novos clientes.', 'demo-user-diego', CURRENT_DATE - 65, CURRENT_DATE - 25, 100, 'done', 'demo-area-technology', '[]', 'demo-project-dashboard', 'Execução', 'Alta', '60', NULL, '[]', 'activity', 'demo-client-aurora', 'demo-area-technology', NULL, NULL, false),
  ('demo-task-dashboard-handoff', 'Realizar entrega executiva', 'Apresentar o painel e documentar a governança.', 'demo-user-diego', CURRENT_DATE - 20, CURRENT_DATE - 10, 100, 'done', 'demo-area-technology', '[]', 'demo-project-dashboard', 'Encerramento', 'Média', '8', NULL, '[]', 'activity', 'demo-client-aurora', 'demo-area-technology', NULL, NULL, false),
  ('demo-task-onboarding-form', 'Simplificar formulário de cadastro', 'Reduzir campos e melhorar mensagens de validação.', 'demo-user-elisa', CURRENT_DATE - 60, CURRENT_DATE - 20, 100, 'done', 'demo-area-customer', '[]', 'demo-project-onboarding', 'Execução', 'Alta', '36', NULL, '[]', 'activity', 'demo-client-nuvem', 'demo-area-customer', NULL, NULL, true),
  ('demo-task-onboarding-email', 'Automatizar régua de boas-vindas', 'Criar sequência de mensagens para ativação.', 'demo-user-bruno', CURRENT_DATE - 30, CURRENT_DATE - 5, 70, 'doing', 'demo-area-commercial', '[]', 'demo-project-onboarding', 'Execução', 'Alta', '24', 'Conteúdo final em aprovação.', '[]', 'activity', 'demo-client-nuvem', 'demo-area-customer', NULL, NULL, true),
  ('demo-task-onboarding-metrics', 'Configurar métricas de ativação', 'Medir conclusão de cadastro e primeiro valor percebido.', 'demo-user-diego', CURRENT_DATE - 12, CURRENT_DATE + 7, 30, 'doing', 'demo-area-technology', '[]', 'demo-project-onboarding', 'Execução', 'Média', '18', NULL, '[]', 'activity', 'demo-client-nuvem', 'demo-area-customer', NULL, NULL, false),
  ('demo-task-weekly', 'Preparar reunião semanal de resultados', 'Consolidar destaques, riscos e próximos passos.', 'demo-user-carla', CURRENT_DATE - 1, CURRENT_DATE + 1, 50, 'doing', 'demo-area-operations', '[]', NULL, NULL, 'Alta', '3', NULL, '[]', 'activity', NULL, 'demo-area-operations', NULL, NULL, false)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, owner_id = EXCLUDED.owner_id,
  start_date = EXCLUDED.start_date, deadline = EXCLUDED.deadline, progress = EXCLUDED.progress,
  status = EXCLUDED.status, area_id = EXCLUDED.area_id, subtasks = EXCLUDED.subtasks,
  project_id = EXCLUDED.project_id, flow_step = EXCLUDED.flow_step, priority = EXCLUDED.priority,
  hours = EXCLUDED.hours, notes = EXCLUDED.notes, client_id = EXCLUDED.client_id,
  demandante_area_id = EXCLUDED.demandante_area_id, blocked_reason = EXCLUDED.blocked_reason,
  blocked_since = EXCLUDED.blocked_since, publicar_portal = EXCLUDED.publicar_portal,
  updated_at = NOW();

INSERT INTO task_members (task_id, user_id) VALUES
  ('demo-task-crm-import', 'demo-user-bruno'),
  ('demo-task-portal-prototype', 'demo-user-elisa'),
  ('demo-task-billing-robot', 'demo-user-felipe'),
  ('demo-task-onboarding-email', 'demo-user-elisa')
ON CONFLICT (task_id, user_id) DO NOTHING;

INSERT INTO task_tags (task_id, tag_id) VALUES
  ('demo-task-crm-map', 'demo-tag-client'),
  ('demo-task-crm-import', 'demo-tag-data'),
  ('demo-task-crm-training', 'demo-tag-training'),
  ('demo-task-billing-robot', 'demo-tag-urgent'),
  ('demo-task-billing-robot', 'demo-tag-process'),
  ('demo-task-dashboard-build', 'demo-tag-data'),
  ('demo-task-onboarding-form', 'demo-tag-client'),
  ('demo-task-weekly', 'demo-tag-strategic')
ON CONFLICT (task_id, tag_id) DO NOTHING;

INSERT INTO activity_logs (id, user_id, date, content, status, "timestamp", task_id) VALUES
  ('demo-log-01', 'demo-user-bruno', CURRENT_DATE - 1, 'Concluí a revisão das duplicidades da base do CRM e registrei os pontos de atenção.', 'done', (EXTRACT(EPOCH FROM NOW() - INTERVAL '1 day') * 1000)::bigint, 'demo-task-crm-import'),
  ('demo-log-02', 'demo-user-diego', CURRENT_DATE - 1, 'Evoluí o protótipo do portal e publiquei o fluxo de segunda via para validação.', 'doing', (EXTRACT(EPOCH FROM NOW() - INTERVAL '23 hours') * 1000)::bigint, 'demo-task-portal-prototype'),
  ('demo-log-03', 'demo-user-elisa', CURRENT_DATE - 2, 'Analisei os artigos mais acessados e priorizei a revisão de conteúdo.', 'done', (EXTRACT(EPOCH FROM NOW() - INTERVAL '2 days') * 1000)::bigint, 'demo-task-portal-content'),
  ('demo-log-04', 'demo-user-felipe', CURRENT_DATE - 2, 'Documentei a dependência de acesso que está bloqueando a automação do faturamento.', 'doing', (EXTRACT(EPOCH FROM NOW() - INTERVAL '2 days 2 hours') * 1000)::bigint, 'demo-task-billing-robot'),
  ('demo-log-05', 'demo-user-ana', CURRENT_DATE - 3, 'Validei com a diretoria o cronograma de treinamento do CRM.', 'done', (EXTRACT(EPOCH FROM NOW() - INTERVAL '3 days') * 1000)::bigint, 'demo-task-crm-training'),
  ('demo-log-06', 'demo-user-carla', CURRENT_DATE - 3, 'Consolidei os resultados semanais e atualizei o mapa de riscos.', 'doing', (EXTRACT(EPOCH FROM NOW() - INTERVAL '3 days 1 hour') * 1000)::bigint, 'demo-task-weekly'),
  ('demo-log-07', 'demo-user-diego', CURRENT_DATE - 5, 'Configurei os eventos de ativação do onboarding digital.', 'doing', (EXTRACT(EPOCH FROM NOW() - INTERVAL '5 days') * 1000)::bigint, 'demo-task-onboarding-metrics'),
  ('demo-log-08', 'demo-user-bruno', CURRENT_DATE - 7, 'Ajustei a régua de boas-vindas após retorno do cliente.', 'doing', (EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days') * 1000)::bigint, 'demo-task-onboarding-email')
ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date, content = EXCLUDED.content, status = EXCLUDED.status,
  "timestamp" = EXCLUDED."timestamp", task_id = EXCLUDED.task_id;

INSERT INTO activity_log_tags (activity_log_id, tag_id) VALUES
  ('demo-log-01', 'demo-tag-data'),
  ('demo-log-02', 'demo-tag-client'),
  ('demo-log-04', 'demo-tag-urgent'),
  ('demo-log-05', 'demo-tag-training'),
  ('demo-log-06', 'demo-tag-strategic')
ON CONFLICT (activity_log_id, tag_id) DO NOTHING;

INSERT INTO support_tickets
  (id, title, queue, category, status, priority, responsible, responsible_id, requesting_area,
   demand_description, details, time_spent, outcome, creator_id, area_id, created_at,
   in_progress_at, completed_at)
VALUES
  ('demo-support-001', 'Acesso ao painel comercial', 'Acessos', 'Permissão', 'A fazer', 'Alta', 'Diego Rocha', 'demo-user-diego', 'Comercial', 'Novo integrante precisa acessar o painel.', 'Validar perfil com a gestão.', '', NULL, 'demo-user-bruno', 'demo-area-commercial', NOW() - INTERVAL '2 hours', NULL, NULL),
  ('demo-support-002', 'Erro na importação de planilha', 'Sistemas', 'Incidente', 'Em andamento', 'Urgente', 'Diego Rocha', 'demo-user-diego', 'Operações', 'Arquivo de fechamento apresenta erro de formato.', 'A equipe está analisando uma coluna inconsistente.', '1h20', NULL, 'demo-user-felipe', 'demo-area-operations', NOW() - INTERVAL '8 hours', NOW() - INTERVAL '7 hours', NULL),
  ('demo-support-003', 'Atualização de cadastro de cliente', 'Cadastros', 'Solicitação', 'Validação', 'Média', 'Elisa Nunes', 'demo-user-elisa', 'Comercial', 'Atualizar contato principal do cliente.', 'Alteração realizada e enviada para validação.', '35min', NULL, 'demo-user-bruno', 'demo-area-commercial', NOW() - INTERVAL '1 day', NOW() - INTERVAL '22 hours', NULL),
  ('demo-support-004', 'Dúvida sobre indicador de vendas', 'Dados', 'Dúvida', 'Concluído', 'Baixa', 'Carla Lima', 'demo-user-carla', 'Diretoria', 'Esclarecer regra de cálculo do indicador.', 'Regra explicada e documentação compartilhada.', '40min', 'Orientação concluída', 'demo-user-ana', 'demo-area-operations', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '1 hour', NOW() - INTERVAL '3 days' + INTERVAL '1 hour 40 minutes'),
  ('demo-support-005', 'Lentidão no portal de clientes', 'Sistemas', 'Incidente', 'Concluído', 'Alta', 'Diego Rocha', 'demo-user-diego', 'Experiência do Cliente', 'Portal apresentou lentidão no início da manhã.', 'Cache ajustado e serviço normalizado.', '1h15', 'Serviço normalizado', 'demo-user-elisa', 'demo-area-customer', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '15 minutes', NOW() - INTERVAL '6 days' + INTERVAL '1 hour 30 minutes'),
  ('demo-support-006', 'Criar modelo de relatório mensal', 'Processos', 'Solicitação', 'A fazer', 'Média', 'Felipe Alves', 'demo-user-felipe', 'Operações', 'Padronizar relatório mensal da área.', 'Modelo deve incluir metas, realizado e comentários.', '', NULL, 'demo-user-carla', 'demo-area-operations', NOW() - INTERVAL '4 hours', NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, queue = EXCLUDED.queue, category = EXCLUDED.category,
  status = EXCLUDED.status, priority = EXCLUDED.priority, responsible = EXCLUDED.responsible,
  responsible_id = EXCLUDED.responsible_id, demand_description = EXCLUDED.demand_description,
  details = EXCLUDED.details, time_spent = EXCLUDED.time_spent, outcome = EXCLUDED.outcome,
  area_id = EXCLUDED.area_id, created_at = EXCLUDED.created_at,
  in_progress_at = EXCLUDED.in_progress_at, completed_at = EXCLUDED.completed_at;

INSERT INTO comments (id, entity_type, entity_id, user_id, content, created_at) VALUES
  ('demo-comment-01', 'project', 'demo-project-crm', 'demo-user-ana', 'Cronograma aprovado. Vamos manter a entrada em produção na data planejada.', NOW() - INTERVAL '2 days'),
  ('demo-comment-02', 'task', 'demo-task-crm-import', 'demo-user-diego', 'A importação de teste ficou disponível para conferência.', NOW() - INTERVAL '1 day'),
  ('demo-comment-03', 'project', 'demo-project-billing', 'demo-user-carla', 'Risco registrado; o acesso de homologação foi escalado.', NOW() - INTERVAL '6 hours'),
  ('demo-comment-04', 'task', 'demo-task-onboarding-email', 'demo-user-elisa', 'A nova versão do texto está aprovada pelo time de experiência.', NOW() - INTERVAL '10 hours')
ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, created_at = EXCLUDED.created_at;

INSERT INTO notifications (id, user_id, title, message, type, link, created_by, created_at) VALUES
  ('demo-notification-01', 'demo-user-ana', 'Projeto atualizado', 'O projeto Implantação do CRM avançou para 50% das atividades concluídas.', 'success', NULL, 'demo-user-carla', NOW() - INTERVAL '1 hour'),
  ('demo-notification-02', 'demo-user-diego', 'Tarefa urgente', 'A automação do faturamento possui um impedimento há três dias.', 'warning', NULL, 'demo-user-carla', NOW() - INTERVAL '3 hours'),
  ('demo-notification-03', 'demo-user-elisa', 'Novo comentário', 'Há um novo comentário no projeto de onboarding digital.', 'info', NULL, 'demo-user-ana', NOW() - INTERVAL '8 hours')
ON CONFLICT (id) DO UPDATE SET message = EXCLUDED.message, created_at = EXCLUDED.created_at;

-- Em uma instalação já autenticada, avisa os administradores reais sem criar credenciais demo.
INSERT INTO notifications (id, user_id, title, message, type, link, created_by, created_at)
SELECT
  'demo-showcase-ready-' || md5(id), id, 'Demonstração preparada',
  'Os dados fictícios da NUVYO estão prontos para apresentação.',
  'success', NULL, NULL, NOW()
FROM users
WHERE role = 'admin' AND password_hash IS NOT NULL
ON CONFLICT (id) DO UPDATE SET message = EXCLUDED.message, created_at = EXCLUDED.created_at;

INSERT INTO badges (id, name, description, icon, min_xp, badge_type, color_gradient) VALUES
  ('demo-badge-starter', 'Primeiros Passos', 'Registrou as primeiras entregas na NUVYO.', '🌱', 0, 'level', 'from-green-400 to-emerald-600'),
  ('demo-badge-focus', 'Foco em Resultados', 'Manteve uma sequência consistente de atualizações.', '🎯', 500, 'level', 'from-blue-400 to-indigo-600'),
  ('demo-badge-delivery', 'Entrega de Valor', 'Concluiu entregas relevantes dentro do prazo.', '🚀', 1500, 'level', 'from-purple-400 to-fuchsia-600'),
  ('demo-badge-collaboration', 'Colaboração', 'Apoiou diferentes equipes e projetos.', '🤝', 800, 'streak', 'from-cyan-400 to-blue-600')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description,
  icon = EXCLUDED.icon, min_xp = EXCLUDED.min_xp, badge_type = EXCLUDED.badge_type,
  color_gradient = EXCLUDED.color_gradient;

UPDATE gamification_profiles SET xp_total = 1850, level = 4, current_streak = 7, max_streak = 12, last_activity_date = CURRENT_DATE - 1 WHERE user_id = 'demo-user-diego';
UPDATE gamification_profiles SET xp_total = 1320, level = 3, current_streak = 5, max_streak = 9, last_activity_date = CURRENT_DATE - 1 WHERE user_id = 'demo-user-bruno';
UPDATE gamification_profiles SET xp_total = 980, level = 2, current_streak = 4, max_streak = 7, last_activity_date = CURRENT_DATE - 2 WHERE user_id = 'demo-user-elisa';
UPDATE gamification_profiles SET xp_total = 760, level = 2, current_streak = 3, max_streak = 6, last_activity_date = CURRENT_DATE - 1 WHERE user_id = 'demo-user-carla';
UPDATE gamification_profiles SET xp_total = 540, level = 2, current_streak = 2, max_streak = 5, last_activity_date = CURRENT_DATE - 2 WHERE user_id = 'demo-user-felipe';
UPDATE gamification_profiles SET xp_total = 620, level = 2, current_streak = 3, max_streak = 8, last_activity_date = CURRENT_DATE - 3 WHERE user_id = 'demo-user-ana';

INSERT INTO user_badges (user_id, badge_id, unlocked_at, reason) VALUES
  ('demo-user-diego', 'demo-badge-starter', NOW() - INTERVAL '80 days', 'Primeiras atividades registradas'),
  ('demo-user-diego', 'demo-badge-focus', NOW() - INTERVAL '30 days', 'Consistência nas atualizações'),
  ('demo-user-diego', 'demo-badge-delivery', NOW() - INTERVAL '10 days', 'Entrega do dashboard executivo'),
  ('demo-user-bruno', 'demo-badge-starter', NOW() - INTERVAL '50 days', 'Primeiras atividades registradas'),
  ('demo-user-bruno', 'demo-badge-focus', NOW() - INTERVAL '12 days', 'Sequência de entregas'),
  ('demo-user-elisa', 'demo-badge-collaboration', NOW() - INTERVAL '7 days', 'Colaboração entre áreas')
ON CONFLICT (user_id, badge_id) DO UPDATE SET unlocked_at = EXCLUDED.unlocked_at, reason = EXCLUDED.reason;

INSERT INTO campaigns
  (id, title, description, start_date, end_date, reward_xp, target_metric, target_value, active, reward_badge_id)
VALUES
  ('demo-campaign-delivery', 'Sprint de Entregas', 'Conclua cinco tarefas durante o ciclo atual.', CURRENT_DATE - 10, CURRENT_DATE + 20, 300, 'tasks_done', 5, true, 'demo-badge-delivery'),
  ('demo-campaign-support', 'Excelência no Atendimento', 'Resolva três chamados de suporte com qualidade.', CURRENT_DATE - 15, CURRENT_DATE + 15, 250, 'support_closed', 3, true, 'demo-badge-collaboration')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date, reward_xp = EXCLUDED.reward_xp,
  target_metric = EXCLUDED.target_metric, target_value = EXCLUDED.target_value,
  active = EXCLUDED.active, reward_badge_id = EXCLUDED.reward_badge_id;

INSERT INTO user_campaigns (user_id, campaign_id, current_progress, completed, completed_at) VALUES
  ('demo-user-diego', 'demo-campaign-delivery', 4, false, NULL),
  ('demo-user-bruno', 'demo-campaign-delivery', 3, false, NULL),
  ('demo-user-elisa', 'demo-campaign-support', 2, false, NULL),
  ('demo-user-carla', 'demo-campaign-support', 3, true, NOW() - INTERVAL '2 days')
ON CONFLICT (user_id, campaign_id) DO UPDATE SET
  current_progress = EXCLUDED.current_progress, completed = EXCLUDED.completed,
  completed_at = EXCLUDED.completed_at;

INSERT INTO ai_summaries (id, date, content, period_start, period_end, created_at) VALUES
  ('demo-summary-week', CURRENT_DATE, 'A semana apresentou avanço consistente no CRM e no portal de autoatendimento. O principal risco permanece na automação do faturamento, bloqueada por acesso ao ambiente de homologação. Recomenda-se priorizar a remoção desse impedimento e acompanhar o projeto de onboarding, cujo prazo original foi ultrapassado.', CURRENT_DATE - 7, CURRENT_DATE, NOW() - INTERVAL '30 minutes')
ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date, content = EXCLUDED.content,
  period_start = EXCLUDED.period_start, period_end = EXCLUDED.period_end,
  created_at = EXCLUDED.created_at;

INSERT INTO suggestions (id, user_id, title, description, status, created_at, updated_at) VALUES
  ('demo-suggestion-01', 'demo-user-bruno', 'Modelo de reunião semanal', 'Criar um modelo reutilizável com pauta, riscos, decisões e próximos passos.', 'Em Desenvolvimento', NOW() - INTERVAL '12 days', NOW() - INTERVAL '2 days'),
  ('demo-suggestion-02', 'demo-user-elisa', 'Aviso automático de prazo', 'Enviar uma notificação quando uma tarefa de alta prioridade estiver próxima do vencimento.', 'Em Avaliação', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
  ('demo-suggestion-03', 'demo-user-felipe', 'Exportação executiva em PDF', 'Permitir exportar o resumo dos projetos para apresentação à diretoria.', 'Lançado', NOW() - INTERVAL '35 days', NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, status = EXCLUDED.status,
  created_at = EXCLUDED.created_at, updated_at = EXCLUDED.updated_at;

INSERT INTO suggestion_votes (suggestion_id, user_id) VALUES
  ('demo-suggestion-01', 'demo-user-ana'),
  ('demo-suggestion-01', 'demo-user-carla'),
  ('demo-suggestion-01', 'demo-user-diego'),
  ('demo-suggestion-02', 'demo-user-bruno'),
  ('demo-suggestion-02', 'demo-user-elisa'),
  ('demo-suggestion-03', 'demo-user-ana'),
  ('demo-suggestion-03', 'demo-user-diego'),
  ('demo-suggestion-03', 'demo-user-elisa'),
  ('demo-suggestion-03', 'demo-user-felipe')
ON CONFLICT (suggestion_id, user_id) DO NOTHING;

COMMIT;
