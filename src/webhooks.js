export function validateWebhookSettings(settings) {
  if (!settings || typeof settings !== 'object') throw new Error('Configuração de webhook inválida.');
  if (typeof settings.url !== 'string' || !settings.url.trim()) throw new Error('Informe a URL do webhook.');
  let parsed;
  try { parsed = new URL(settings.url.trim()); } catch { throw new Error('URL de webhook inválida.'); }
  const local = ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) {
    throw new Error('A URL do webhook precisa usar HTTPS fora de localhost.');
  }
  const service = settings.service ? String(settings.service).toLowerCase() : (
    parsed.hostname.includes('discord.com') ? 'discord' :
    parsed.hostname.includes('telegram.org') ? 'telegram' : 'generic'
  );
  if (!['discord', 'telegram', 'generic'].includes(service)) {
    throw new Error('Serviço de webhook desconhecido. Use discord, telegram ou generic.');
  }
  return {
    url: parsed.href,
    service,
    enabled: settings.enabled !== false,
    chatId: settings.chatId ? String(settings.chatId).trim() : undefined
  };
}

export function formatWebhookPayload(service, event) {
  const { type, project, message, timestamp = new Date().toISOString() } = event;
  const projectName = project?.name || 'DevSync';

  if (service === 'discord') {
    const colors = {
      synced: 0x6ee7b7,    // Green
      checkpoint: 0x9bcaff,// Sky blue
      error: 0xfca5a5,     // Red
      diverged: 0xfca5a5,  // Red
      test: 0xa9d1ff       // Blue
    };
    const titles = {
      synced: `✅ Sincronizado: ${projectName}`,
      checkpoint: `💾 Checkpoint Criado: ${projectName}`,
      error: `⚠️ Atenção no Projeto: ${projectName}`,
      diverged: `🔀 Divergência Detectada: ${projectName}`,
      test: `🔔 Teste de Notificação: DevSync`
    };
    return {
      embeds: [{
        title: titles[type] || `DevSync: ${projectName}`,
        description: message || `Status: ${type}`,
        color: colors[type] || 0x9bcaff,
        fields: [
          ...(project?.branch ? [{ name: 'Branch', value: project.branch, inline: true }] : []),
          ...(event.receivedCommits ? [{ name: 'Recebidos', value: String(event.receivedCommits), inline: true }] : []),
          ...(event.sentCommits ? [{ name: 'Enviados', value: String(event.sentCommits), inline: true }] : [])
        ],
        footer: { text: 'DevSync Multi-PC' },
        timestamp
      }]
    };
  }

  if (service === 'telegram') {
    const icons = { synced: '✅', checkpoint: '💾', error: '⚠️', diverged: '🔀', test: '🔔' };
    const text = `${icons[type] || '🔔'} *DevSync: ${projectName}*\n` +
      `*Evento:* ${type}\n` +
      (project?.branch ? `*Branch:* \`${project.branch}\`\n` : '') +
      (event.receivedCommits ? `*Commits recebidos:* ${event.receivedCommits}\n` : '') +
      (event.sentCommits ? `*Commits enviados:* ${event.sentCommits}\n` : '') +
      (message ? `\n_${message}_` : '');
    return { text, parse_mode: 'Markdown' };
  }

  // Generic JSON
  return {
    event: type,
    project: project ? { id: project.id, name: project.name, branch: project.branch } : null,
    message,
    receivedCommits: event.receivedCommits || 0,
    sentCommits: event.sentCommits || 0,
    timestamp
  };
}

export async function sendWebhook(settings, event) {
  if (!settings || !settings.enabled || !settings.url) return;
  try {
    const payload = formatWebhookPayload(settings.service, event);
    let finalUrl = settings.url;
    let bodyData = payload;

    // For Telegram bot webhook URLs (send message endpoint with chatId)
    if (settings.service === 'telegram' && settings.chatId) {
      bodyData = { chat_id: settings.chatId, ...payload };
    }

    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData),
      signal: AbortSignal.timeout(6000)
    });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
