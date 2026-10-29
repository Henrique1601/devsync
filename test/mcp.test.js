import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleMcpMessage, MCP_TOOLS } from '../src/mcp.js';

test('MCP server handles initialize, ping and tools/list', async () => {
  const init = await handleMcpMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  assert.equal(init.id, 1);
  assert.equal(init.result.serverInfo.name, 'devsync-mcp');
  assert.ok(init.result.serverInfo.version);

  const ping = await handleMcpMessage({ jsonrpc: '2.0', id: 2, method: 'ping' });
  assert.equal(ping.id, 2);
  assert.deepEqual(ping.result, {});

  const list = await handleMcpMessage({ jsonrpc: '2.0', id: 3, method: 'tools/list' });
  assert.equal(list.id, 3);
  assert.equal(list.result.tools.length, MCP_TOOLS.length);
  const toolNames = list.result.tools.map(t => t.name);
  assert.ok(toolNames.includes('devsync_status'));
  assert.ok(toolNames.includes('devsync_sync'));
  assert.ok(toolNames.includes('devsync_sync_all'));
  assert.ok(toolNames.includes('devsync_diff'));
  assert.ok(toolNames.includes('devsync_stash_sync'));
  assert.ok(toolNames.includes('devsync_diagnose'));
  assert.ok(toolNames.includes('devsync_history'));
  assert.ok(toolNames.includes('devsync_metrics'));
  assert.ok(toolNames.includes('devsync_predict_conflicts'));
  assert.ok(toolNames.includes('devsync_scan_secrets'));
  assert.ok(toolNames.includes('devsync_ai_resolve_conflict'));
  assert.ok(toolNames.includes('devsync_resolve_conflict'));
  assert.ok(toolNames.includes('devsync_scout'));
  assert.ok(toolNames.includes('devsync_worktree_sync'));
  assert.ok(toolNames.includes('devsync_daily_summary'));
  assert.ok(toolNames.includes('devsync_p2p_peers'));
  assert.ok(toolNames.includes('devsync_catch_up'));
  assert.ok(toolNames.includes('devsync_add_batch'));
});

test('MCP server dispatches tools/call to daemon dependency injection', async () => {
  const calls = [];
  const fakeDaemon = async (route, payload) => {
    calls.push({ route, payload });
    if (route === 'status') return { projects: [{ id: 'p1', name: 'CRM', state: 'synced' }] };
    if (route === 'command' && payload.command === 'sync-all') return { synced: 1, projects: [] };
    if (route === 'command' && payload.command === 'diff') return { files: [{ path: 'app.js', status: 'M' }] };
    return { ok: true };
  };

  const statusCall = await handleMcpMessage(
    { jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'devsync_status', arguments: {} } },
    { callDaemon: fakeDaemon }
  );
  assert.equal(statusCall.id, 10);
  assert.equal(statusCall.result.isError, false);
  const statusOutput = JSON.parse(statusCall.result.content[0].text);
  assert.equal(statusOutput.projects[0].name, 'CRM');

  const syncAllCall = await handleMcpMessage(
    { jsonrpc: '2.0', id: 11, method: 'tools/call', params: { name: 'devsync_sync_all', arguments: {} } },
    { callDaemon: fakeDaemon }
  );
  assert.equal(syncAllCall.id, 11);
  assert.equal(syncAllCall.result.isError, false);

  const diffCall = await handleMcpMessage(
    { jsonrpc: '2.0', id: 12, method: 'tools/call', params: { name: 'devsync_diff', arguments: { id: 'p1' } } },
    { callDaemon: fakeDaemon }
  );
  assert.equal(diffCall.id, 12);
  assert.equal(diffCall.result.isError, false);
  const diffOutput = JSON.parse(diffCall.result.content[0].text);
  assert.equal(diffOutput.files[0].path, 'app.js');

  const scanSecretsCall = await handleMcpMessage(
    { jsonrpc: '2.0', id: 13, method: 'tools/call', params: { name: 'devsync_scan_secrets', arguments: { id: 'p1' } } },
    { callDaemon: fakeDaemon }
  );
  assert.equal(scanSecretsCall.id, 13);
  assert.equal(scanSecretsCall.result.isError, false);

  const catchUpCall = await handleMcpMessage(
    { jsonrpc: '2.0', id: 14, method: 'tools/call', params: { name: 'devsync_catch_up', arguments: { id: 'p1' } } },
    { callDaemon: fakeDaemon }
  );
  assert.equal(catchUpCall.id, 14);
  assert.equal(catchUpCall.result.isError, false);

  const addBatchCall = await handleMcpMessage(
    { jsonrpc: '2.0', id: 15, method: 'tools/call', params: { name: 'devsync_add_batch', arguments: { paths: ['/path/to/repo'] } } },
    { callDaemon: fakeDaemon }
  );
  assert.equal(addBatchCall.id, 15);
  assert.equal(addBatchCall.result.isError, false);

  const errorCall = await handleMcpMessage(
    { jsonrpc: '2.0', id: 16, method: 'tools/call', params: { name: 'unknown_tool', arguments: {} } },
    { callDaemon: fakeDaemon }
  );
  assert.equal(errorCall.id, 16);
  assert.equal(errorCall.result.isError, true);
  assert.match(errorCall.result.content[0].text, /desconhecida/);
});
