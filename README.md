# Live Stream Companion

Simulador de live com "segunda tela" no celular: chat em tempo real e uso da câmera do celular como webcam do PC.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/contasuportedis-png/LiveStream)

> Clique no botão acima para publicar o site com todas as funcionalidades (WebSocket + WebRTC) em 1 clique no Render (grátis).

## Estrutura

- `server.js` — servidor Node (Express + WebSocket) que serve as páginas e faz a ponte entre PC e celular.
- `public/index.html` — página principal, aberta no PC. É o "host" da live.
- `public/mobile.html` — página da segunda tela, aberta no celular.
- `render.yaml` — blueprint para deploy automático no Render (health check em `/health`).
- `package.json` — deps `express` + `ws`, start `node server.js`.

## Como publicar de graça no Render (100% funcional)

### Opção A — 1 clique (recomendado)

1. Clique no botão **Deploy to Render** acima (ou acesse https://render.com/deploy?repo=https://github.com/contasuportedis-png/LiveStream).
2. Faça login com GitHub (`contasuportedis-png`) e autorize o Render.
3. O Render vai ler o `render.yaml` automaticamente:
   - **Runtime**: Node 18
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check**: `/health`
   - **Instance Type**: Free
4. Clique em **Apply**. Aguarde ~2 min. O Render vai te dar URL tipo `https://live-stream-companion-xxxx.onrender.com`.

### Opção B — Manual

1. Crie conta em **render.com** (pode entrar com GitHub).
2. Clique em **New + → Web Service** → conecte o repositório `contasuportedis-png/LiveStream` (branch `main`).
3. Configurações:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. **Create Web Service**. URL: `https://seu-app.onrender.com`.

## Como usar

1. No **PC**, acesse `https://seu-app.onrender.com` — essa é a live normal.
2. Assim que a página carregar, um código aparece no card **"📱 Segunda Tela (Celular)"** (ex: `LIVE-4829`).
3. No **celular**, acesse `https://seu-app.onrender.com/mobile`.
4. Digite o código e toque em **Conectar**.
5. No celular você pode:
   - Ver o chat em tempo real (aba **Chat**), inclusive em tela cheia (botão ⛶).
   - Ativar a câmera do celular (aba **Webcam**) para enviá-la ao PC.
6. No PC, quando a câmera do celular conectar, um botão **"📷 Mostrar Webcam do Celular"** aparece no card da segunda tela — use-o para alternar entre o quadradinho de webcam e tela cheia.

## Verificar se está online

- Health check: `https://seu-app.onrender.com/health` → `{ "status": "ok" }`
- Logs no Render: Dashboard → seu serviço → Logs (verá `[ROOM] Criada LIVE-XXXX`)

## Observações importantes

- **Plano gratuito do Render "dorme"** depois de ~15 min sem acesso e demora 30-60s para acordar no primeiro acesso. Depois funciona normal. Heartbeat a cada 30s mantém WS vivo (`server.js:176`).
- Funciona melhor com **PC e celular na mesma rede Wi-Fi**, mas também funciona em redes diferentes (ex: 4G) via STUN `stun.l.google.com:19302`.
- Ao atualizar (F5) a página do PC, novo código é gerado e celular reconecta.
- Deixe a tela do celular ligada ao usar como webcam (Wake Lock quando suportado).

## Desenvolvimento local

```bash
npm install
npm start
# http://localhost:3000  e  http://localhost:3000/mobile
# health: http://localhost:3000/health
```
