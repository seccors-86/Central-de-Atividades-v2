import dotenv from 'dotenv';
dotenv.config();

export const triggerPortalSync = async () => {
  const webhookUrl = process.env.PORTAL_SYNC_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, { method: 'POST' });
    console.log(`[Portal Webhook] Sincronização disparada com sucesso para ${webhookUrl}`);
  } catch (error: any) {
    console.error(`[Portal Webhook] Erro ao disparar sincronização: ${error.message}`);
  }
};
