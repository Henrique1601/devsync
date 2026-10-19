import readline from 'node:readline';
import { read } from './store.js';
import { diagnose } from './onboarding.js';

export const MCP_TOOLS = [
  {
    name: 'devsync_status',
    description: 'Lista todos os projetos cadastrados no DevSync, seus estados Git (synced, dirty, ahead, behind, diverged, paused) e o estado do painel remoto.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'devsync_sync',
    description: 'Sincroniza imediatamente um projeto cadastrado pelo ID ou nome (fast-forward seguro e push se habilitado).',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'ID ou nome do projeto cadastrado.' } },
      required: ['id'],
      additionalProperties: false
    }
  },
  {
    name: 'devsync_sync_all',
    description: 'Sincroniza em lote todos os projetos ativos (não pausados) cadastrados neste computador.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'devsync_diff',
    description: 'Inspeciona os arquivos alterados, commits pendentes e diff sanitizado (ocultando arquivos sensíveis) de um projeto cadastrado.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'ID ou nome do projeto cadastrado.' } },
      required: ['id'],
      additionalProperties: false
    }
  },
  {
    name: 'devsync_stash_sync',
    description: 'Guarda alterações locais em Stash seguro, sincroniza por fast-forward e opcionalmente reaplica o Stash.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID ou nome do projeto cadastrado.' },
        pop: { type: 'boolean', description: 'Reaplicar o Stash após sincronizar (padrão: true).' }
      },
      required: ['id'],
      additionalProperties: false
    }
  },
  {
    name: 'devsync_diagnose',
    description: 'Verifica sem mutações se uma pasta local possui repositório Git válido, branch ativa, commits, upstream e identidade.',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Caminho absoluto da pasta local do repositório.' } },
      required: ['path'],
      additionalProperties: false
    }
  },
  {
    name: 'devsync_history',
    description: 'Consulta o histórico persistente de sincronizações e eventos do DevSync.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID opcional do projeto para filtrar.' },
        limit: { type: 'integer', minimum: 1, maximum: 1000, description: 'Quantidade máxima de registros (padrão: 25).' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'devsync_pause_resume',
    description: 'Pausa ou retoma a sincronização automática de um projeto cadastrado.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID ou nome do projeto.' },
        action: { type: 'string', enum: ['pause', 'resume'], description: 'Ação desejada: pause ou resume.' }
      },
      required: ['id', 'action'],
      additionalProperties: false
    }
  },
  {
    name: 'devsync_metrics',
    description: 'Obtém estatísticas de produtividade, taxa de sucesso, commits transferidos, horas economizadas e atividade dos últimos 7 dias.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'devsync_predict_conflicts',
    description: 'Simula em memória (sem alterar a árvore de trabalho) se a reconciliação com o upstream gerará conflitos no Git.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'ID ou nome do projeto cadastrado.' } },
      required: ['id'],
      additionalProperties: false
    }
  },
  {
    name: 'devsync_scan_secrets',
    description: 'Analisa arquivos modificados do projeto contra vazamento de credenciais, chaves de API, senhas ou tokens privados.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'ID ou nome do projeto cadastrado.' } },
      required: ['id'],
      additionalProperties: false
    }
  },
  {
    name: 'devsync_ai_resolve_conflict',
    description: 'Gera uma proposta semântica de resolução com IA ou heurística para um arquivo em conflito.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID ou nome do projeto.' },
        file: { type: 'string', description: 'Caminho relativo do arquivo em conflito.' }
      },
      required: ['id', 'file'],
      additionalProperties: false
    }
  },
  {
    name: 'devsync_resolve_conflict',
    description: 'Aplica o código resolvido diretamente a um arquivo em conflito e marca a resolução via git add.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID ou nome do projeto.' },
        file: { type: 'string', description: 'Caminho relativo do arquivo em conflito.' },
        resolvedCode: { type: 'string', description: 'Conteúdo final reconciliado do arquivo.' }
      },
      required: ['id', 'file', 'resolvedCode'],
      additionalProperties: false
    }
  },
  {
    name: 'devsync_scout',
    description: 'Varre diretórios locais e descobre repositórios Git existentes para cadastro.',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Diretório raiz para varredura recursiva (opcional).' } },
      additionalProperties: false
    }
  },
  {
    name: 'devsync_worktree_sync',
    description: 'Sincroniza uma branch secundária em uma worktree Git isolada sem mexer na branch ativa de trabalho.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID do projeto cadastrado.' },
        branch: { type: 'string', description: 'Nome da branch a sincronizar (ex: main, develop).' }
      },
      required: ['id', 'branch'],
      additionalProperties: false
    }
  },
  {
    name: 'devsync_daily_summary',
    description: 'Gera um diário de bordo e resumo de produtividade do dia gravado no cofre Obsidian do DevSync.',
    inputSchema: {
      type: 'object',
      properties: { date: { type: 'string', description: 'Data no formato YYYY-MM-DD (padrão: hoje).' } },
      additionalProperties: false
    }
  },
  {
    name: 'devsync_p2p_peers',
    description: 'Lista outros computadores DevSync detectados na rede local (LAN via UDP beacon).',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'devsync_catch_up',
    description: 'Gera um briefing executivo matinal e plano de retomada de contexto com IA/heurística para um projeto após sincronização.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID ou nome do projeto cadastrado (opcional; padrão: primeiro ativo).' },
        date: { type: 'string', description: 'Data YYYY-MM-DD para salvar no diário do Obsidian (opcional).' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'devsync_add_batch',
    description: 'Cadastra múltiplos repositórios Git de uma só vez no DevSync informando uma lista de caminhos absolutos.',
    inputSchema: {
      type: 'object',
      properties: {
        paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista de caminhos absolutos das pastas dos projetos Git a cadastrar.'
        }
      },
      required: ['paths'],
      additionalProperties: false
    }
  }
];

export async function defaultDaemonCall(route, payload) {
  const runtime = await read('runtime.json');
  const url = `http://127.0.0.1:${runtime.port}/api/${route}`;
  const response = await fetch(url, {
    method: payload ? 'POST' : 'GET',
    signal: AbortSignal.timeout(120000),
    headers: { authorization: `Bearer ${runtime.token}`, 'Content-Type': 'application/json' },
    ...(payload ? { body: JSON.stringify(payload) } : {})
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Erro ao comunicar com o daemon do DevSync.');
  return body;
}

export async function executeMcpTool(name, args = {}, { callDaemon = defaultDaemonCall, diagnoseRepo = diagnose } = {}) {
  switch (name) {
    case 'devsync_status':
      return callDaemon('status');
    case 'devsync_metrics':
      return callDaemon('metrics');
    case 'devsync_sync':
      if (!args.id) throw new Error('Informe o parâmetro id.');
      return callDaemon('command', { command: 'sync', id: String(args.id) });
    case 'devsync_sync_all':
      return callDaemon('command', { command: 'sync-all' });
    case 'devsync_diff':
      if (!args.id) throw new Error('Informe o parâmetro id.');
      return callDaemon('command', { command: 'diff', id: String(args.id) });
    case 'devsync_predict_conflicts':
      if (!args.id) throw new Error('Informe o parâmetro id.');
      return callDaemon('command', { command: 'predict-conflicts', id: String(args.id) });
    case 'devsync_scan_secrets':
      if (!args.id) throw new Error('Informe o parâmetro id.');
      return callDaemon('command', { command: 'scan-secrets', id: String(args.id) });
    case 'devsync_ai_resolve_conflict':
      if (!args.id || !args.file) throw new Error('Informe id e file.');
      return callDaemon('command', { command: 'ai-resolve', id: String(args.id), file: String(args.file) });
    case 'devsync_resolve_conflict':
      if (!args.id || !args.file || typeof args.resolvedCode !== 'string') throw new Error('Informe id, file e resolvedCode.');
      return callDaemon('command', { command: 'resolve-conflict', id: String(args.id), file: String(args.file), resolvedCode: args.resolvedCode });
    case 'devsync_stash_sync':
      if (!args.id) throw new Error('Informe o parâmetro id.');
      return callDaemon('command', { command: 'stash-sync', id: String(args.id), pop: args.pop !== false });
    case 'devsync_diagnose':
      if (!args.path) throw new Error('Informe o parâmetro path.');
      return diagnoseRepo(String(args.path));
    case 'devsync_history': {
      const params = new URLSearchParams();
      if (args.projectId) params.set('projectId', String(args.projectId));
      params.set('limit', String(args.limit ?? 25));
      return callDaemon(`history?${params.toString()}`);
    }
    case 'devsync_pause_resume':
      if (!args.id || !['pause', 'resume'].includes(args.action)) throw new Error('Informe id e action (pause ou resume).');
      return callDaemon('command', { command: args.action, id: String(args.id) });
    case 'devsync_scout':
      return callDaemon('command', { command: 'scout', path: args.path ? String(args.path) : undefined });
    case 'devsync_worktree_sync':
      if (!args.id || !args.branch) throw new Error('Informe id e branch.');
      return callDaemon('command', { command: 'worktree-sync', id: String(args.id), branch: String(args.branch) });
    case 'devsync_daily_summary':
      return callDaemon('command', { command: 'daily-summary', date: args.date ? String(args.date) : undefined });
    case 'devsync_p2p_peers':
      return callDaemon('command', { command: 'p2p-peers' });
    case 'devsync_catch_up':
      return callDaemon('command', { command: 'catch-up', id: args.id ? String(args.id) : undefined, date: args.date ? String(args.date) : undefined });
    case 'devsync_add_batch':
      if (!Array.isArray(args.paths) || !args.paths.length) throw new Error('Informe uma lista de caminhos em paths.');
      return callDaemon('command', { command: 'add-batch', paths: args.paths.map(String) });
    default:
      throw new Error(`Ferramenta MCP desconhecida: ${name}`);
  }
}

export async function handleMcpMessage(message, deps = {}) {
  if (!message || typeof message !== 'object' || message.jsonrpc !== '2.0') {
    return { jsonrpc: '2.0', id: message?.id ?? null, error: { code: -32600, message: 'Requisição JSON-RPC 2.0 inválida.' } };
  }
  if (message.id === undefined) return null; // Notification
  try {
    if (message.method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id: message.id,
        result: {
          protocolVersion: message.params?.protocolVersion || '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'devsync-mcp', version: '0.8.0' }
        }
      };
    }
    if (message.method === 'ping') {
      return { jsonrpc: '2.0', id: message.id, result: {} };
    }
    if (message.method === 'tools/list') {
      return { jsonrpc: '2.0', id: message.id, result: { tools: MCP_TOOLS } };
    }
    if (message.method === 'tools/call') {
      const toolName = message.params?.name;
      const toolArgs = message.params?.arguments || {};
      try {
        const output = await executeMcpTool(toolName, toolArgs, deps);
        return {
          jsonrpc: '2.0',
          id: message.id,
          result: { content: [{ type: 'text', text: JSON.stringify(output, null, 2) }], isError: false }
        };
      } catch (error) {
        return {
          jsonrpc: '2.0',
          id: message.id,
          result: { content: [{ type: 'text', text: `Erro: ${error.message}` }], isError: true }
        };
      }
    }
    return { jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `Método não encontrado: ${message.method}` } };
  } catch (error) {
    return { jsonrpc: '2.0', id: message.id, error: { code: -32603, message: error.message } };
  }
}

export async function startMcpServer(deps = {}) {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let parsed;
    try { parsed = JSON.parse(trimmed); } catch {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido.' } }) + '\n');
      continue;
    }
    const response = await handleMcpMessage(parsed, deps);
    if (response) process.stdout.write(JSON.stringify(response) + '\n');
  }
}
