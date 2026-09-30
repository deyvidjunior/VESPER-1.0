require('dotenv').config();
const express = require('express'), cors = require('cors'),
      mysql = require('mysql2/promise'), crypto = require('crypto');
const app = express();
app.use(cors()); app.use(express.json({ limit: '3mb' }));
const SECRET = process.env.SECRET || 'vesper-segredo';
const pool = mysql.createPool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASS || '', database: process.env.DB_NAME,
  waitForConnections: true, connectionLimit: 5
});
const sha = (t, s) => crypto.createHash('sha256').update(t + '::' + s).digest('hex');
const mkToken = id => { const exp = Date.now() + 7 * 864e5;
  const sig = crypto.createHmac('sha256', SECRET).update(id + '.' + exp).digest('hex').slice(0, 32);
  return id + '.' + exp + '.' + sig; };
const auth = (req, res, next) => {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  const [id, exp, sig] = t.split('.');
  const ok = sig && crypto.createHmac('sha256', SECRET).update(id + '.' + exp).digest('hex').slice(0, 32) === sig && Date.now() < +exp;
  if (!ok) return res.status(401).json({ erro: 'Sessão expirada. Entre de novo 🌻' });
  req.pessoa = +id; next();
};
app.get('/api/saude', (req, res) => res.json({ ok: true, nome: 'Vesper API 🌻' }));
app.post('/api/registro', async (req, res) => {
  try {
    const { nome, senha, pergunta, resposta, frase } = req.body;
    if (!nome || !senha || senha.length < 4) return res.status(400).json({ erro: 'Nome e senha (mín. 4) obrigatórios' });
    const salt = crypto.randomBytes(16).toString('hex');
    const [r] = await pool.query(
      'INSERT INTO pessoas (nome,senha_hash,salt,pergunta_id,resposta_hash,frase_hash) VALUES (?,?,?,?,?,?)',
      [nome.toLowerCase(), sha(senha, salt), salt, pergunta, sha(resposta.toLowerCase().trim(), salt), sha(frase.toLowerCase().trim(), salt)]);
    await pool.query('INSERT INTO jardins (pessoa_id,moedas,coracoes) VALUES (?,0,0)', [r.insertId]);
    await pool.query('INSERT INTO pessoa_poesias (pessoa_id,poesia_id,tipo) VALUES (?,1,"desbloqueada")', [r.insertId]);
    res.json({ token: mkToken(r.insertId) });
  } catch (e) { res.status(409).json({ erro: 'Este nome já tem jardim 🌻' }); }
});
app.post('/api/login', async (req, res) => {
  const { nome, senha, dispositivo, fp } = req.body;
  const [rows] = await pool.query('SELECT * FROM pessoas WHERE nome=?', [nome.toLowerCase()]);
  if (!rows.length) return res.status(404).json({ erro: 'Jardim não encontrado neste servidor' });
  const p = rows[0];
  if (sha(senha, p.salt) !== p.senha_hash) return res.status(401).json({ erro: 'Senha incorreta 🔑' });
  await pool.query('INSERT INTO sessoes (pessoa_id,dispositivo,fp_hash) VALUES (?,?,?)', [p.id, dispositivo || '', fp || '']);
  res.json({ token: mkToken(p.id), nome: p.nome });
});
app.post('/api/recuperar', async (req, res) => {
  const { nome, frase, resposta } = req.body;
  const [rows] = await pool.query('SELECT * FROM pessoas WHERE nome=?', [nome.toLowerCase()]);
  if (!rows.length) return res.status(404).json({ erro: 'Jardim não encontrado' });
  const p = rows[0];
  const okF = frase && sha(frase.toLowerCase().trim(), p.salt) === p.frase_hash;
  const okR = resposta && sha(resposta.toLowerCase().trim(), p.salt) === p.resposta_hash;
  if (!okF && !okR) return res.status(401).json({ erro: 'Não confere. Tente de novo 🔑' });
  res.json({ token: mkToken(p.id) });
});
app.post('/api/nova-senha', auth, async (req, res) => {
  const { senha, frase } = req.body;
  if (!senha || senha.length < 4) return res.status(400).json({ erro: 'Senha mín. 4 caracteres' });
  const [rows] = await pool.query('SELECT salt FROM pessoas WHERE id=?', [req.pessoa]);
  const salt = rows[0].salt;
  await pool.query('UPDATE pessoas SET senha_hash=?, frase_hash=? WHERE id=?',
    [sha(senha, salt), sha((frase || '').toLowerCase().trim(), salt), req.pessoa]);
  res.json({ ok: true });
});
app.get('/api/sync', auth, async (req, res) => {
  const id = req.pessoa;
  const [j] = await pool.query('SELECT * FROM jardins WHERE pessoa_id=?', [id]);
  const [pp] = await pool.query('SELECT poesia_id,tipo FROM pessoa_poesias WHERE pessoa_id=?', [id]);
  const [notas] = await pool.query('SELECT id,DATE_FORMAT(data,"%Y-%m-%d") data,titulo,texto,humor,fixada,arcada FROM notas WHERE pessoa_id=? ORDER BY data DESC', [id]);
  const [ativ] = await pool.query('SELECT tipo,detalhe,valor,DATE_FORMAT(ts,"%Y-%m-%dT%H:%i:%s") ts FROM atividade WHERE pessoa_id=? ORDER BY ts DESC LIMIT 500', [id]);
  const [temas] = await pool.query('SELECT tema FROM temas_vividos WHERE pessoa_id=?', [id]);
  const [pess] = await pool.query('SELECT nome FROM pessoas WHERE id=?', [id]);
  const g = j[0] || { moedas: 0, coracoes: 0 };
  res.json({
    jardim: {
      nome: pess[0].nome, coins: g.moedas, hearts: g.coracoes,
      lastBonus: g.ultimo_bonus ? String(g.ultimo_bonus).slice(0, 10) : '',
      lastSave: g.ultimo_save ? String(g.ultimo_save).slice(0, 10) : '',
      unlocked: pp.filter(x => x.tipo === 'desbloqueada').map(x => x.poesia_id),
      read: pp.filter(x => x.tipo === 'lida').map(x => x.poesia_id),
      saved: pp.filter(x => x.tipo === 'guardada').map(x => x.poesia_id),
      savedWords: []
    },
    notas: notas.map(n => ({ ...n, id: 'db' + n.id, fixada: !!n.fixada, arcada: !!n.arcada })),
    atividade: ativ, temas: temas.map(t => t.tema)
  });
});
app.put('/api/sync', auth, async (req, res) => {
  const id = req.pessoa, { jardim, notas, atividade, temas } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE jardins SET moedas=?,coracoes=?,ultimo_bonus=?,ultimo_save=?,tema_manual=? WHERE pessoa_id=?',
      [jardim.coins | 0, jardim.hearts | 0, jardim.lastBonus || null, jardim.lastSave || null, jardim.temaManual || null, id]);
    await conn.query('DELETE FROM pessoa_poesias WHERE pessoa_id=?', [id]);
    for (const p of jardim.unlocked || []) await conn.query('INSERT IGNORE INTO pessoa_poesias VALUES (?,?,"desbloqueada")', [id, p]);
    for (const p of jardim.read || []) await conn.query('INSERT IGNORE INTO pessoa_poesias VALUES (?,?,"lida")', [id, p]);
    for (const p of jardim.saved || []) await conn.query('INSERT IGNORE INTO pessoa_poesias VALUES (?,?,"guardada")', [id, p]);
    await conn.query('DELETE FROM notas WHERE pessoa_id=?', [id]);
    for (const n of notas || []) await conn.query('INSERT INTO notas (pessoa_id,data,titulo,texto,humor,fixada,arcada) VALUES (?,?,?,?,?,?,?)',
      [id, n.data, n.titulo || '', n.texto || '', n.humor || '', n.fixada ? 1 : 0, n.arcada ? 1 : 0]);
    await conn.query('DELETE FROM atividade WHERE pessoa_id=?', [id]);
    for (const a of (atividade || []).slice(0, 500)) await conn.query('INSERT INTO atividade (pessoa_id,ts,tipo,detalhe,valor,dispositivo) VALUES (?,?,?,?,?,?)',
      [id, String(a.ts).replace('T', ' '), a.tipo, a.detalhe, a.valor, a.dispositivo || '']);
    await conn.query('DELETE FROM temas_vividos WHERE pessoa_id=?', [id]);
    for (const t of temas || []) await conn.query('INSERT IGNORE INTO temas_vividos VALUES (?,?)', [id, t]);
    await conn.commit();
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); res.status(500).json({ erro: 'Falha ao sincronizar' }); }
  finally { conn.release(); }
});
app.listen(process.env.PORT || 3000, () => console.log('🌻 Vesper API no ar na porta ' + (process.env.PORT || 3000)));