import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleMcpMessage, MCP_TOOLS } from '../src/mcp.js';

test('MCP server handles initialize, ping and tools/list', async () => {
  const init = await handleMcpMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  assert.equal(init.id, 1);
  assert.equal(init.result.serverInfo.name, 'devsync-mcp');
  assert.equal(init.result.serverInfo.version, '0.5.0');

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

  const errorCall = await handleMcpMessage(
    { jsonrpc: '2.0', id: 13, method: 'tools/call', params: { name: 'unknown_tool', arguments: {} } },
    { callDaemon: fakeDaemon }
  );
  assert.equal(errorCall.id, 13);
  assert.equal(errorCall.result.isError, true);
  assert.match(errorCall.result.content[0].text, /desconhecida/);
});
