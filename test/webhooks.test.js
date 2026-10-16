import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWebhookSettings, formatWebhookPayload, sendWebhook } from '../src/webhooks.js';

test('validateWebhookSettings validates URLs, services and localhost http', () => {
  // Valid Discord
  const discord = validateWebhookSettings({ url: 'https://discord.com/api/webhooks/123/abc' });
  assert.equal(discord.service, 'discord');
  assert.equal(discord.enabled, true);

  // Valid Telegram
  const telegram = validateWebhookSettings({ url: 'https://api.telegram.org/bot123/sendMessage', chatId: '987654' });
  assert.equal(telegram.service, 'telegram');
  assert.equal(telegram.chatId, '987654');

  // Valid Localhost HTTP
  const local = validateWebhookSettings({ url: 'http://127.0.0.1:9000/webhook', service: 'generic' });
  assert.equal(local.service, 'generic');

  // Rejections
  assert.throws(() => validateWebhookSettings(null), /Configuração de webhook inválida/);
  assert.throws(() => validateWebhookSettings({ url: '' }), /Informe a URL/);
  assert.throws(() => validateWebhookSettings({ url: 'not-a-url' }), /URL de webhook inválida/);
  assert.throws(() => validateWebhookSettings({ url: 'http://external-site.com/webhook' }), /HTTPS fora de localhost/);
  assert.throws(() => validateWebhookSettings({ url: 'https://external-site.com/webhook', service: 'invalid' }), /Serviço de webhook desconhecido/);
});

test('formatWebhookPayload formats Discord, Telegram and generic payloads', () => {
  const event = {
    type: 'synced',
    project: { id: 'p1', name: 'Meu Projeto', branch: 'main' },
    message: 'Sincronizado com sucesso.',
    receivedCommits: 2,
    sentCommits: 1,
    timestamp: '2026-10-16T12:00:00.000Z'
  };

  // Discord
  const discordPayload = formatWebhookPayload('discord', event);
  assert.ok(Array.isArray(discordPayload.embeds));
  assert.match(discordPayload.embeds[0].title, /Sincronizado: Meu Projeto/);
  assert.equal(discordPayload.embeds[0].color, 0x6ee7b7);
  assert.equal(discordPayload.embeds[0].fields.length, 3);

  // Telegram
  const tgPayload = formatWebhookPayload('telegram', event);
  assert.match(tgPayload.text, /Meu Projeto/);
  assert.match(tgPayload.text, /Commits recebidos/);
  assert.equal(tgPayload.parse_mode, 'Markdown');

  // Generic
  const genericPayload = formatWebhookPayload('generic', event);
  assert.equal(genericPayload.event, 'synced');
  assert.equal(genericPayload.project.name, 'Meu Projeto');
  assert.equal(genericPayload.receivedCommits, 2);
  assert.equal(genericPayload.sentCommits, 1);
});

test('sendWebhook handles disabled state and dispatches requests safely', async () => {
  // Disabled does not call fetch
  const noop = await sendWebhook({ enabled: false, url: 'https://example.com' }, { type: 'test' });
  assert.equal(noop, undefined);

  // Mock global fetch
  const originalFetch = globalThis.fetch;
  let fetchedUrl = null;
  let fetchedBody = null;
  globalThis.fetch = async (url, opts) => {
    fetchedUrl = url;
    fetchedBody = JSON.parse(opts.body);
    return { ok: true, status: 200 };
  };

  try {
    const res = await sendWebhook(
      { enabled: true, url: 'https://discord.com/api/webhooks/mock', service: 'discord' },
      { type: 'test', message: 'Teste' }
    );
    assert.equal(res.ok, true);
    assert.equal(res.status, 200);
    assert.equal(fetchedUrl, 'https://discord.com/api/webhooks/mock');
    assert.ok(fetchedBody.embeds);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
