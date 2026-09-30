/* ===== VESPER • CONECTOR MYSQL (só ativa com dbMode: true) ===== */
(function(){
var CFG = window.VESPER_CONFIG || { dbMode:false, apiBase:'' };
if (!CFG.dbMode) return;
var API = CFG.apiBase.replace(/\/$/,'');
var TOKEN = localStorage.getItem('vesper_token') || null;
function api(path, opt){
  opt = opt || {};
  opt.headers = Object.assign({'Content-Type':'application/json'}, opt.headers || {});
  if (TOKEN) opt.headers.Authorization = 'Bearer ' + TOKEN;
  return fetch(API + path, opt).then(function(r){
    return r.json().catch(function(){return {}}).then(function(j){
      if (!r.ok) throw new Error(j.erro || ('Erro ' + r.status));
      return j;
    });
  });
}
function fp(){ var s = navigator.userAgent + '|' + screen.width + 'x' + screen.height + '|' + (Intl.DateTimeFormat().resolvedOptions().timeZone || ''); var h = 5381; for (var i=0;i<s.length;i++) h = ((h<<5)+h+s.charCodeAt(i))|0; return 'fp'+(h>>>0).toString(36); }
var DEV = (navigator.userAgent.match(/\(([^)]+)\)/)||['','dispositivo'])[1].slice(0,80);
var syncT = null;
function queueSync(){ if(!TOKEN) return; clearTimeout(syncT); syncT = setTimeout(pushSync, 1500); }
function pushSync(){
  if (!navigator.onLine || !TOKEN) return;
  api('/sync', { method:'PUT', body: JSON.stringify({ jardim:S, notas:jget(K.notas,[]), atividade:jget(K.ativ,[]), temas:jget(K.temas,[]) }) }).catch(function(){});
}
var _jset = jset;
jset = function(k,v){ _jset(k,v); if (['vesper_jardim','vesper_notas','vesper_atividade','vesper_temas'].indexOf(k)>=0) queueSync(); };
createJardim = function(){
  var nome = document.getElementById('obNome').value.trim();
  var p1 = document.getElementById('obPass').value, p2 = document.getElementById('obPass2').value;
  var q = parseInt(document.getElementById('obQ').value), a = document.getElementById('obA').value.trim();
  if(!nome){toast('Digite seu nome 🌱');return}
  if(p1 && p1.length<4){toast('Senha: mínimo 4 caracteres');return}
  if(p1 && p1!==p2){toast('As senhas não conferem');return}
  if(p1 && !a){toast('Responda a pergunta secreta 🔑');return}
  curPhrase = genPhrase();
  api('/registro', { method:'POST', body: JSON.stringify({ nome:nome, senha:p1, pergunta:q, resposta:a, frase:curPhrase }) })
  .then(function(r){
    TOKEN = r.token; localStorage.setItem('vesper_token', TOKEN);
    S = { nome:nome, coins:0, hearts:0, unlocked:[1], saved:[], read:[], savedWords:[], lastBonus:'', lastSave:'' };
    _jset(K.jardim,S); _jset(K.notas,[]); _jset(K.ativ,[]); _jset(K.temas,[]);
    log('conta','Jardim criado na nuvem','🌱');
    if(p1){ document.getElementById('phraseWords').textContent = curPhrase; document.getElementById('phraseModal').classList.add('on'); }
    else enter();
    toast('Jardim criado na nuvem! ☁️🌻');
  }).catch(function(e){ toast(e.message); });
};
tryLogin = function(){
  var senha = document.getElementById('lgPass').value;
  var nome = localStorage.getItem('vesper_ultimo') || prompt('Seu nome de jardim:');
  if(!nome) return;
  api('/login', { method:'POST', body: JSON.stringify({ nome:nome, senha:senha, dispositivo:DEV, fp:fp() }) })
  .then(function(r){ TOKEN = r.token; localStorage.setItem('vesper_token', TOKEN); localStorage.setItem('vesper_ultimo', nome); return pullSync(); })
  .then(function(){ toast('Bem-vinda de volta, '+NM()+'! 🌻'); })
  .catch(function(e){ toast(e.message); });
};
tryRecover = function(){
  var nome = localStorage.getItem('vesper_ultimo') || prompt('Seu nome de jardim:');
  var body = { nome: nome };
  if (recMode==='ph') body.frase = document.getElementById('rcPhrase').value;
  else body.resposta = document.getElementById('rcAns').value;
  api('/recuperar', { method:'POST', body: JSON.stringify(body) })
  .then(function(r){ TOKEN = r.token; localStorage.setItem('vesper_token', TOKEN); recOk = true; showAuth('newpass'); toast('Identidade confirmada! ✅'); })
  .catch(function(e){ toast(e.message); });
};
setNewPass = function(){
  var p1 = document.getElementById('npPass').value, p2 = document.getElementById('npPass2').value;
  if(p1.length<4){toast('Mínimo 4 caracteres');return}
  if(p1!==p2){toast('Não conferem');return}
  curPhrase = genPhrase();
  api('/nova-senha', { method:'POST', body: JSON.stringify({ senha:p1, frase:curPhrase }) })
  .then(function(){
    document.getElementById('phraseWords').textContent = curPhrase;
    document.getElementById('phraseModal').classList.add('on');
    closePhrase = function(){ document.getElementById('phraseModal').classList.remove('on'); pullSync(); };
    toast('Senha nova salva no servidor 🔐');
  }).catch(function(e){ toast(e.message); });
};
function pullSync(){
  return api('/sync').then(function(d){
    S = Object.assign({ savedWords:[], temaManual:null }, d.jardim);
    _jset(K.jardim,S); _jset(K.notas,d.notas); _jset(K.ativ,d.atividade); _jset(K.temas,d.temas);
    enter();
  });
}
if (TOKEN) api('/sync').then(function(d){
    S = Object.assign({ savedWords:[], temaManual:null }, d.jardim);
    _jset(K.jardim,S); _jset(K.notas,d.notas); _jset(K.ativ,d.atividade); _jset(K.temas,d.temas);
    enter();
  }).catch(function(){ toast('Modo offline 🌙 — dados locais ativos'); });
})();