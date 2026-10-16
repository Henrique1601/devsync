'use strict';
const $=selector=>document.querySelector(selector), feedback=$('#feedback');
let token=location.hash.slice(1);try{token ||= sessionStorage.getItem('devsync-token') || '';if(token)sessionStorage.setItem('devsync-token',token)}catch{}
history.replaceState(null,'',location.pathname);

function initTheme(){
  let theme='dark';
  try{theme=localStorage.getItem('devsync-theme')||'dark'}catch{}
  const apply=next=>{
    document.documentElement.dataset.theme=next;
    const btn=$('#theme-toggle');
    if(btn)btn.textContent='Tema: '+(next==='light'?'Claro':'Escuro');
    try{localStorage.setItem('devsync-theme',next)}catch{}
  };
  apply(theme);
  $('#theme-toggle')?.addEventListener('click',()=>apply(document.documentElement.dataset.theme==='light'?'dark':'light'));
}
initTheme();

const labels={synced:'Sincronizado',dirty:'Alterações locais pendentes',diverged:'Históricos divergentes',ahead:'Commits para enviar',behind:'Atualizações para receber',paused:'Pausado',error:'Falha na sincronização',pending:'Aguardando verificação',busy:'Operação em andamento',operation:'Operação Git em andamento',detached:'HEAD sem branch','branch-changed':'Branch alterada'};
const sources={automatic:'Automático',manual:'Painel ou terminal',remote:'Painel remoto',registration:'Cadastro'};
let view='projects',refreshing=false,historyLoading=false,updateLoading=false,updatesInitialized=false;const cards=new Map();
function el(tag,text,css){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(css)n.className=css;return n}
function notice(text){feedback.textContent=text}function time(value){return value?new Date(value).toLocaleString('pt-BR'):'aguardando'}
async function api(route,body){const r=await fetch('/api/'+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)throw Error(d.error||'Não foi possível concluir.');return d}
function showView(next){view=next;document.querySelectorAll('.view').forEach(n=>n.hidden=n.id!=='view-'+view);document.querySelectorAll('[data-view]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.view===view)));if(view==='history')loadHistory();if(view==='settings')refreshUpdates()}
document.querySelectorAll('[data-view],[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view||b.dataset.go)));
async function command(cmd,id,extra={}){
  if(cmd==='checkpoint-on'&&!confirm('Criar commits automáticos dos arquivos permitidos? Confira suas regras e o .gitignore. O envio é ativado separadamente.'))return;
  if(cmd==='stash-sync'&&!confirm('Guardar alterações locais em um Stash seguro, sincronizar com o remoto e reaplicar o Stash automaticamente?'))return;
  try{notice('Executando…');const res=await api('command',{command:cmd,id,...extra});notice(res?.message||'Comando concluído.');await refresh()}catch(e){notice(e.message)}
}
$('#sync-all')?.addEventListener('click',async()=>{
  const btn=$('#sync-all');btn.disabled=true;
  try{notice('Sincronizando todos os projetos ativos…');const res=await api('command',{command:'sync-all'});notice(`Sincronização em lote concluída (${res.synced} projeto(s) verificado(s)).`);await refresh()}
  catch(e){notice(e.message)}finally{btn.disabled=false}
});
async function openDiff(id,name){
  const modal=$('#diff-modal'),body=$('#diff-body'),title=$('#diff-title');
  if(!modal||!body)return;
  title.textContent='Alterações: '+name;
  body.replaceChildren(el('p','Inspecionando repositório…'));
  if(typeof modal.showModal==='function')modal.showModal();else modal.removeAttribute('hidden');
  try{
    const d=await api('command',{command:'diff',id});
    body.replaceChildren();
    body.append(el('p',`Branch: ${d.branch} · Estado: ${labels[d.state]||d.state} · À frente: ${d.ahead??0} · Atrás: ${d.behind??0}`));
    if(d.commits?.length){
      const cBox=el('div');cBox.append(el('strong','Commits divergentes/pendentes (HEAD vs Upstream):'));
      const pre=el('div',undefined,'diff-box');
      for(const line of d.commits)pre.append(el('span',line,'diff-line'));
      cBox.append(pre);body.append(cBox);
    }
    if(!d.files?.length){
      body.append(el('p','Nenhuma alteração local não commitada neste projeto.','empty'));
    }else{
      const list=el('div',undefined,'file-list');
      for(const f of d.files){
        const chip=el('div',undefined,'file-chip'+(f.sensitive?' file-sensitive':''));
        chip.append(el('code',`${f.status}  ${f.path}`),el('span',f.sensitive?'Arquivo sensível (oculto)':'Modificado'));
        list.append(chip);
      }
      body.append(list);
      if(d.diff){
        const box=el('div',undefined,'diff-box');
        for(const line of d.diff.split(/\r?\n/)){
          const cls=line.startsWith('+')&&!line.startsWith('+++')?'diff-line diff-add':line.startsWith('-')&&!line.startsWith('---')?'diff-line diff-del':line.startsWith('@@')?'diff-line diff-hunk':'diff-line';
          box.append(el('span',line,cls));
        }
        body.append(box);
      }
    }
  }catch(e){body.replaceChildren(el('p',e.message))}
}
$('#diff-close')?.addEventListener('click',()=>{const m=$('#diff-modal');if(typeof m?.close==='function')m.close();else m?.setAttribute('hidden','')});

function field(parent,id,label,type,value,attrs={}){const box=el('div'),title=el('label',label),input=el(type==='textarea'?'textarea':'input');title.htmlFor=id;input.id=id;if(type!=='textarea')input.type=type;input.value=value;for(const[k,v]of Object.entries(attrs))input.setAttribute(k,v);box.append(title,input);parent.append(box);return input}
function card(project){
  const node=el('section'),top=el('div',undefined,'project-top'),title=el('div'),status=el('span',undefined,'status');title.append(el('h3',project.name),el('code',project.path));top.append(title,status);
  const meta=el('p',undefined,'project-meta'),reason=el('p',undefined,'project-reason'),controls=el('div',undefined,'actions'),buttons={};
  for(const key of ['sync','diff','stash','pause','push','checkpoint']){const b=el('button');b.type='button';buttons[key]=b;controls.append(b)}
  const details=el('details');details.append(el('summary','Regras de sincronização e checkpoints'));const form=el('form',undefined,'grid');
  const interval=field(form,'interval-'+project.id,'Verificar a cada (segundos)','number',project.syncIntervalSeconds??30,{min:15,max:3600,required:''});
  const delay=field(form,'delay-'+project.id,'Esperar sem alterações (segundos)','number',project.checkpointDelaySeconds??60,{min:30,max:3600,required:''});
  const box=el('div',undefined,'full');form.append(box);const include=field(box,'include-'+project.id,'Arquivos permitidos nos checkpoints','textarea',(project.checkpointInclude||['**']).join('\n'),{rows:3,required:''});
  form.append(el('p','Um padrão por linha: src/**, README.md. ** permite todos os arquivos rastreados. Arquivos fora das regras são preservados.','hint full'));const save=el('button','Salvar regras');save.type='submit';form.append(save);details.append(form);
  form.addEventListener('submit',async e=>{e.preventDefault();save.disabled=true;try{await api('command',{command:'settings',id:project.id,syncIntervalSeconds:Number(interval.value),checkpointDelaySeconds:Number(delay.value),checkpointInclude:include.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)});notice('Regras salvas para '+project.name+'.');await refresh()}catch(error){notice(error.message)}finally{save.disabled=false}});
  node.append(top,meta,reason,controls,details);
  function update(p){
    const stateKey=p.paused?'paused':p.state;
    status.className='status status--'+stateKey;
    status.textContent=(p.paused?'Pausado':labels[p.state]||p.state)+(p.busy?' · Sincronizando…':'');
    meta.textContent='Branch: '+p.branch+' · Verificação: '+(p.syncIntervalSeconds??30)+'s · Última: '+time(p.checkedAt);
    reason.textContent=p.message||p.reason||'';reason.hidden=!reason.textContent;
    buttons.diff.textContent='Ver alterações';buttons.diff.disabled=p.busy;buttons.diff.onclick=()=>openDiff(p.id,p.name);
    buttons.stash.textContent='Stash + Sincronizar';buttons.stash.hidden=p.state!=='dirty';buttons.stash.disabled=p.busy;buttons.stash.onclick=()=>command('stash-sync',p.id,{pop:true});
    const actions={sync:['sync','Sincronizar agora'],pause:[p.paused?'resume':'pause',p.paused?'Retomar':'Pausar'],push:[p.autoPush?'push-off':'push-on',p.autoPush?'Desativar envio':'Ativar envio de commits'],checkpoint:[p.checkpoint?'checkpoint-off':'checkpoint-on',p.checkpoint?'Desativar checkpoints':'Ativar checkpoints']};
    for(const[k,[action,text]]of Object.entries(actions)){buttons[k].textContent=text;buttons[k].disabled=p.busy;buttons[k].onclick=()=>command(action,p.id)}
  }
  update(project);return{node,update};
}
async function refresh(){if(refreshing)return;refreshing=true;try{const{projects,remote}=await api('status');$('#remote-status').textContent=remote?.url?(remote.connected?'Conectado: ':'Aguardando conexão: ')+remote.name+' · '+remote.url+(remote.error?' · '+remote.error:''):'Este computador ainda não está conectado ao painel remoto.';$('#disconnect').disabled=!remote?.url;
  const host=$('#projects'),ids=new Set(projects.map(p=>p.id));for(const[id,c]of cards)if(!ids.has(id)){c.node.remove();cards.delete(id)}host.querySelectorAll('.empty').forEach(n=>n.remove());if(!projects.length)host.append(el('p','Nenhum projeto cadastrado. Use Configurar projeto para começar.','empty'));for(const p of projects){if(!cards.has(p.id)){const c=card(p);cards.set(p.id,c);host.append(c.node)}else cards.get(p.id).update(p)}
  const select=$('#history-project'),selected=select.value;select.replaceChildren(new Option('Todos os projetos',''),...projects.map(p=>new Option(p.name,p.id)));if(ids.has(selected))select.value=selected;
}catch(e){notice(e.message)}finally{refreshing=false}}
async function loadHistory(){if(historyLoading)return;historyLoading=true;try{const id=$('#history-project').value,{entries}=await api('history?limit=100'+(id?'&projectId='+encodeURIComponent(id):''));const host=$('#history-list');host.replaceChildren();if(!entries.length)host.append(el('p','Nenhum registro. Os próximos resultados aparecerão aqui.','empty'));
  for(const entry of entries){const node=el('article',undefined,'history-entry'),top=el('div',undefined,'history-top');top.append(el('h3',entry.projectName||entry.projectId),el('span',labels[entry.state]||entry.state||entry.action,'status status--'+(entry.state||'pending')));node.append(top,el('p',time(entry.finishedAt||entry.startedAt)+' · '+(sources[entry.source]||entry.source)));
    if(['sync','stash-sync'].includes(entry.action)){const counts=el('div',undefined,'counts');counts.append(el('span','Recebidos: '+(entry.receivedCommits??0)),el('span','Enviados: '+(entry.sentCommits??0)));if(entry.checkpointCreated)counts.append(el('span','Checkpoint criado'));if(entry.action==='stash-sync')counts.append(el('span','Stash seguro'));node.append(counts)}if(entry.reason)node.append(el('p',entry.reason));if(entry.before?.head||entry.after?.head){const details=el('details');details.append(el('summary','Commits desta verificação'),el('code',(entry.before?.head||'—')+' → '+(entry.after?.head||'—')));node.append(details)}host.append(node)}
}catch(e){notice(e.message)}finally{historyLoading=false}}
$('#history-refresh').addEventListener('click',loadHistory);$('#history-project').addEventListener('change',loadHistory);
$('#diagnose').addEventListener('click',async()=>{const b=$('#diagnose');if(!$('#folder').reportValidity())return;b.disabled=true;notice('Verificando o Git…');try{const d=await api('command',{command:'diagnose',path:$('#folder').value});const host=$('#diagnostics');host.replaceChildren(el('h3',d.ready?'Pronto para cadastrar':'Veja o que precisa ser ajustado'));for(const check of d.checks||[]){const row=el('div',undefined,'diagnostic');row.append(el('strong',(check.ok?'✓ ':'Atenção: ')+check.message));if(check.guidance)row.append(el('p',check.guidance,'hint'));host.append(row)}notice(d.ready?'Configuração verificada. Você já pode cadastrar.':'Verificação concluída. Siga as orientações do assistente.')}catch(e){notice(e.message)}finally{b.disabled=false}});
async function submit(form,payload,message){const b=form.querySelector('button[type=submit]');b.disabled=true;try{await api('command',payload);notice(message);await refresh();if(['add','clone'].includes(payload.command))showView('projects');return true}catch(e){notice(e.message);return false}finally{b.disabled=false}}
$('#add').addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,{command:'add',path:$('#folder').value},'Projeto cadastrado.')});
$('#clone').addEventListener('submit',e=>{e.preventDefault();notice('Clonando…');submit(e.currentTarget,{command:'clone',url:$('#repository').value.trim(),path:$('#destination').value.trim()},'Projeto clonado e cadastrado.')});
$('#remote').addEventListener('submit',async e=>{e.preventDefault();if(await submit(e.currentTarget,{command:'remote-config',settings:{url:$('#remote-url').value.trim(),name:$('#remote-name').value.trim(),deviceId:$('#remote-id').value.trim(),token:$('#remote-token').value.trim()}},'Conexão salva. Aguarde alguns segundos.'))$('#remote-token').value=''});$('#disconnect').addEventListener('click',()=>command('remote-off'));
$('#test-remote')?.addEventListener('click',async()=>{const b=$('#test-remote'),u=$('#remote-url').value.trim();if(!u){notice('Informe o endereço do servidor para testar.');return}b.disabled=true;try{notice('Testando conexão com o coordenador…');const r=await api('command',{command:'check-remote',url:u});notice(`Coordenador online em ${r.url} (latência: ${r.latencyMs}ms).`)}catch(e){notice(e.message)}finally{b.disabled=false}});
async function refreshUpdates(){if(!window.devsyncDesktop?.updateState||updateLoading)return;updateLoading=true;try{const s=await window.devsyncDesktop.updateState();$('#version').textContent=s.currentVersion||'0.4';$('#update-state').textContent=s.message||s.status;$('#update-controls').hidden=!s.supported;if(!updatesInitialized){$('#update-enabled').checked=s.enabled;$('#update-feed').value=s.feedUrl||'';updatesInitialized=true}$('#update-download').hidden=s.status!=='available';$('#update-install').hidden=s.status!=='downloaded';$('#update-check').disabled=!s.enabled||['checking','downloading','installing'].includes(s.status);$('#update-progress').hidden=s.status!=='downloading';$('#update-progress').value=typeof s.progress==='number'?s.progress:s.progress?.percent||0}catch(e){notice(e.message)}finally{updateLoading=false}}
if(window.devsyncDesktop){$('#browse').hidden=false;$('#desktop-settings').hidden=false;$('#browse').addEventListener('click',async()=>{try{const p=await window.devsyncDesktop.chooseFolder();if(p){$('#folder').value=p;$('#diagnostics').replaceChildren()}}catch(e){notice(e.message)}});window.devsyncDesktop.startupEnabled().then(v=>$('#startup').checked=v).catch(e=>notice(e.message));$('#startup').addEventListener('change',async e=>{try{e.target.checked=await window.devsyncDesktop.setStartup(e.target.checked)}catch(error){e.target.checked=!e.target.checked;notice(error.message)}});
  $('#updates').addEventListener('submit',async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;try{const requested={enabled:$('#update-enabled').checked,feedUrl:$('#update-feed').value.trim()};const saved=await window.devsyncDesktop.configureUpdates(requested);$('#update-enabled').checked=saved.enabled;$('#update-feed').value=saved.feedUrl||'';notice(saved.enabled===requested.enabled&&(!requested.feedUrl||saved.feedUrl===new URL(requested.feedUrl.endsWith('/')?requested.feedUrl:requested.feedUrl+'/').href)?'Preferência de atualização salva.':'Fonte não alterada.');await refreshUpdates()}catch(error){notice(error.message)}finally{button.disabled=false}});for(const[selector,action]of [['#update-check','checkUpdates'],['#update-download','downloadUpdate'],['#update-install','installUpdate']])$(selector).addEventListener('click',async()=>{const button=$(selector);button.disabled=true;try{await window.devsyncDesktop[action]();await refreshUpdates()}catch(e){notice(e.message)}finally{button.disabled=false}});refreshUpdates();setInterval(()=>{if(view==='settings')refreshUpdates()},1500);
}
refresh();setInterval(refresh,5000);setInterval(()=>{if(view==='history')loadHistory()},10000);
