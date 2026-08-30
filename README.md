# Live Stream Companion

Simulador de live com "segunda tela" no celular: chat em tempo real e uso da câmera do celular como webcam do PC.

## Estrutura

- `server.js` — servidor Node (Express + WebSocket) que serve as páginas e faz a ponte entre PC e celular.
- `public/index.html` — página principal, aberta no PC. É o "host" da live.
- `public/mobile.html` — página da segunda tela, aberta no celular.

## Como publicar de graça no Render

1. Crie uma conta em **render.com** (pode entrar com GitHub).
2. Suba esta pasta inteira para um repositório no GitHub (pode ser privado).
   - Se preferir sem Git: no Render, ao criar o serviço, também dá para conectar direto a um repositório importado de um zip via GitHub (crie um repo vazio, arraste os arquivos pela interface do GitHub, sem precisar saber usar Git no terminal).
3. No Render, clique em **New + → Web Service**.
4. Conecte o repositório.
5. Configurações do serviço:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
6. Clique em **Create Web Service**. O Render vai te dar uma URL tipo `https://seu-app.onrender.com`.

## Como usar

1. No **PC**, acesse `https://seu-app.onrender.com` — essa é a live normal.
2. Assim que a página carregar, um código aparece no card **"📱 Segunda Tela (Celular)"** (ex: `LIVE-4829`).
3. No **celular**, acesse `https://seu-app.onrender.com/mobile`.
4. Digite o código e toque em **Conectar**.
5. No celular você pode:
   - Ver o chat em tempo real (aba **Chat**), inclusive em tela cheia (botão ⛶).
   - Ativar a câmera do celular (aba **Webcam**) para enviá-la ao PC.
6. No PC, quando a câmera do celular conectar, um botão **"📷 Mostrar Webcam do Celular"** aparece no card da segunda tela — use-o para alternar entre o quadradinho de webcam e tela cheia (trocando de lugar com o jogo/tela compartilhada).

## Observações importantes

- **Plano gratuito do Render "dorme"** depois de um tempo sem acesso e demora uns 30-60 segundos para acordar no primeiro acesso do dia. Depois de acordado, funciona normalmente.
- Funciona melhor com **PC e celular na mesma rede Wi-Fi**, mas também funciona em redes diferentes (ex: celular no 4G) — pode ter um pouco mais de instabilidade dependendo da rede.
- Ao atualizar (F5) a página do PC, um novo código é gerado e o celular precisa reconectar com o código novo.
- Deixe a tela do celular ligada enquanto estiver usando como webcam (o navegador tenta evitar que ela apague sozinha, mas nem todo celular suporta isso).
