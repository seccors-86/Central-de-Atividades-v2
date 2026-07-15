import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { rateLimit } from 'express-rate-limit';

const router = Router();

router.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Limite de gerações por IA atingido. Tente novamente mais tarde.' }
}));

router.post('/weekly-summary', async (req, res) => {
  try {
    if (!['admin', 'manager'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Apenas administradores e gestores podem gerar resumos.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'Serviço de IA não configurado.' });

    const logs = Array.isArray(req.body?.logs) ? req.body.logs.slice(0, 1000) : [];
    const users = Array.isArray(req.body?.users) ? req.body.users.slice(0, 500) : [];
    const userMap = new Map(users.map((user: any) => [String(user.id), String(user.name || 'Desconhecido').slice(0, 200)]));
    const formattedLogs = logs.map((log: any) => {
      const name = userMap.get(String(log.userId)) || 'Desconhecido';
      const date = String(log.date || '').slice(0, 20);
      const content = String(log.content || '').slice(0, 10000);
      return `Colaborador: ${name}\nData: ${date}\nAtividades:\n${content}\n---`;
    }).join('\n').slice(0, 200000);

    const prompt = `Crie um Resumo Executivo Semanal em Markdown com as seções: Visão Geral da Equipe, Entregas por Colaborador, e Conclusão e Próximos Passos. Seja direto, use bullet points, agrupe atividades do mesmo colaborador e ignore colaboradores sem registros.\n\nDados:\n${formattedLogs}`;
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
    res.json({ content: response.text || 'Não foi possível gerar o resumo.' });
  } catch (error) {
    console.error('Erro ao gerar resumo por IA:', error);
    res.status(502).json({ error: 'Falha ao consultar o serviço de IA.' });
  }
});

export default router;
