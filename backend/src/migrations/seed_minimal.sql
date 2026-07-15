INSERT INTO areas (id, name, parent_id) VALUES
  ('area1', 'Gerência de Negócios', NULL),
  ('area_agro', 'Time Agro', 'area1'),
  ('area_pf', 'Time Pessoa Física', 'area1'),
  ('area2', 'Tecnologia & Inovação', NULL);

INSERT INTO tags (id, name, color) VALUES
  ('t1', 'Reunião', 'bg-indigo-100 text-indigo-800'),
  ('t2', 'Treinamento', 'bg-violet-100 text-violet-800'),
  ('t3', 'Deslocamento', 'bg-amber-100 text-amber-800'),
  ('t4', 'Operacional', 'bg-slate-100 text-slate-800'),
  ('t5', 'Estratégico', 'bg-emerald-100 text-emerald-800'),
  ('t6', 'Projeto', 'bg-cyan-100 text-cyan-800');

INSERT INTO status_configs (id, label, color, type) VALUES
  ('backlog', 'Backlog', 'bg-gray-100 text-gray-600', 'neutral'),
  ('doing', 'Em Andamento', 'bg-blue-50 text-blue-700', 'warning'),
  ('done', 'Concluído', 'bg-green-50 text-[#005C46]', 'success');

INSERT INTO project_kpis (id, name, position) VALUES
  ('receita-bruta', 'Receita Bruta', 1),
  ('vendas', 'Vendas', 2),
  ('novos-clientes', 'Novos Clientes', 3);
