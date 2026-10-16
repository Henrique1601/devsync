import { stat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { git } from './git.js';

export async function diagnose(folder) {
  const result = { gitInstalled: false, pathValid: false, repository: false, branch: null, upstream: null,
    identity: { nameConfigured: false, emailConfigured: false }, checks: [], ready: false };
  const check = (id, ok, message, guidance = '') => result.checks.push({ id, ok, message, guidance: ok ? '' : guidance });
  result.gitInstalled = await git(process.cwd(), '--version').then(() => true, () => false);
  check('git', result.gitInstalled, result.gitInstalled ? 'Git instalado.' : 'Git não encontrado.', 'Instale o Git e reinicie o DevSync para atualizar o PATH.');
  if (typeof folder !== 'string' || !folder.trim() || /^https?:\/\//i.test(folder.trim())) {
    check('path', false, 'Informe uma pasta local.', 'Use o seletor de pastas ou Clonar do GitHub para baixar um repositório.'); return result;
  }
  let absolute;
  try { absolute = await realpath(path.resolve(folder.trim().replace(/^"(.*)"$/, '$1'))); result.pathValid = (await stat(absolute)).isDirectory(); } catch {}
  check('path', result.pathValid, result.pathValid ? 'Pasta acessível.' : 'Pasta não encontrada ou sem acesso.', 'Selecione a pasta do clone existente neste computador.');
  if (!result.pathValid || !result.gitInstalled) return result;
  let root;
  try { root = await git(absolute, 'rev-parse', '--show-toplevel'); result.repository = Boolean(root); } catch {}
  check('repository', result.repository, result.repository ? 'Repositório Git encontrado.' : 'A pasta não pertence a um repositório Git.', 'Clone o projeto pelo painel ou selecione um clone existente.');
  if (!result.repository) return result;
  result.branch = await git(root, 'symbolic-ref', '--quiet', '--short', 'HEAD').catch(() => null);
  check('branch', Boolean(result.branch), result.branch ? `Branch atual: ${result.branch}.` : 'HEAD destacado.', 'No terminal desta pasta, selecione uma branch existente com git switch <branch>.');
  const committed = await git(root, 'rev-parse', '--verify', 'HEAD').then(() => true, () => false);
  check('commits', committed, committed ? 'O projeto possui commits.' : 'O projeto ainda não possui commits.', 'Revise os arquivos e crie o primeiro commit manualmente.');
  result.upstream = await git(root, 'rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}').catch(() => null);
  check('upstream', Boolean(result.upstream), result.upstream ? `Upstream: ${result.upstream}.` : 'Upstream não configurado.', 'Se a branch remota já existe, execute git branch --set-upstream-to=origin/<branch>. Se não existe, publique-a manualmente após revisar os commits.');
  result.identity.nameConfigured = await git(root, 'config', '--get', 'user.name').then(Boolean, () => false);
  result.identity.emailConfigured = await git(root, 'config', '--get', 'user.email').then(Boolean, () => false);
  check('identity', result.identity.nameConfigured && result.identity.emailConfigured, result.identity.nameConfigured && result.identity.emailConfigured ? 'Identidade de commit configurada.' : 'Identidade de commit incompleta.', 'Nesta pasta, configure git config user.name "Seu nome" e git config user.email "seu@email" antes de ativar checkpoints.');
  const credHelper = await git(root, 'config', '--get', 'credential.helper').catch(() => null);
  const remoteUrl = await git(root, 'config', '--get', 'remote.origin.url').catch(() => '');
  const usesSsh = remoteUrl.startsWith('git@') || remoteUrl.startsWith('ssh://');
  const authOk = usesSsh || Boolean(credHelper);
  check('credentials', authOk, authOk ? (usesSsh ? 'Autenticação via chave SSH detectada.' : `Auxiliar de credenciais Git ativo (${credHelper}).`) : 'Nenhum auxiliar de credenciais Git configurado.', 'Recomendado: configure git config --global credential.helper manager para não travar pedidos de senha no serviço em segundo plano.');
  result.ready = result.checks.filter(item => !['identity', 'credentials'].includes(item.id)).every(item => item.ok);
  return result;
}
