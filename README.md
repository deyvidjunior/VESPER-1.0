# VESPER-1.0

# 🌻 VESPER — "Seu momento. Seu jardim."
App pessoal de afeto: mensagens diárias, poesias, diário, calendário, 6 jogos e registro.

## Rodar local (sem servidor)
1. Abra `public/index.html` no Chrome (ou Live Server no VS Code)
2. `config.js` → `dbMode: false`

## Rodar com nuvem (MySQL)
1. Importe `sql/database.sql` no MySQL (XAMPP/phpMyAdmin)
2. `cd server` → `npm install` → `npm start`
3. `config.js` → `dbMode: true` + `apiBase: 'http://localhost:3000'`
4. Abra o app via Live Server

## Diagnóstico
- 5 toques no 🌻 da tela inicial → painel DIAG
- Banner vermelho no topo = erro com mensagem