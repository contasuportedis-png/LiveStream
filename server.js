const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

// --- SALAS EM MEMÓRIA ---
// room = { code, hostWs, mobileClients: Set<ws> }
const rooms = new Map();

// Health check para Render / monitoramento
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), rooms: rooms.size });
});

app.use(express.static(path.join(__dirname, 'public')));

// Rota amigável /mobile -> mobile.html (sem precisar digitar a extensão no celular)
app.get('/mobile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mobile.html'));
});

function generateRoomCode() {
  // Código curto e fácil de digitar no celular: LIVE-1234
  let code;
  do {
    const n = crypto.randomInt(1000, 9999);
    code = `LIVE-${n}`;
  } while (rooms.has(code));
  return code;
}

function send(ws, obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function broadcastToMobiles(room, obj) {
  room.mobileClients.forEach(client => send(client, obj));
}

// Heartbeat para limpar conexões mortas (Render fecha conexões ociosas)
function heartbeat() { this.isAlive = true; }

wss.on('connection', (ws) => {
  ws.role = null;
  ws.roomCode = null;
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    switch (msg.type) {
      // ===== HOST (PC) cria uma sala ao iniciar a live =====
      case 'host-create-room': {
        // Se host já tinha sala, limpa a antiga para não vazar memória
        if (ws.roomCode && rooms.has(ws.roomCode)) {
          const oldRoom = rooms.get(ws.roomCode);
          broadcastToMobiles(oldRoom, { type: 'host-disconnected' });
          rooms.delete(ws.roomCode);
        }
        const code = generateRoomCode();
        ws.role = 'host';
        ws.roomCode = code;
        rooms.set(code, { code, hostWs: ws, mobileClients: new Set() });
        console.log(`[ROOM] Criada ${code} | total salas: ${rooms.size}`);
        send(ws, { type: 'room-created', code });
        break;
      }

      // ===== MOBILE tenta entrar com o código =====
      case 'mobile-join-room': {
        const room = rooms.get(msg.code);
        if (!room) {
          send(ws, { type: 'join-error', message: 'Código inválido ou live não está ativa.' });
          return;
        }
        ws.role = 'mobile';
        ws.roomCode = msg.code;
        room.mobileClients.add(ws);
        send(ws, { type: 'join-success', code: msg.code });
        send(room.hostWs, { type: 'mobile-connected', mobileCount: room.mobileClients.size });
        break;
      }

      // ===== CHAT: mensagem enviada do celular vira mensagem no chat do PC =====
      case 'mobile-chat-message': {
        const room = rooms.get(ws.roomCode);
        if (!room || ws.role !== 'mobile') return;
        // Validação + limite para evitar spam / XSS (frontend também sanitiza)
        const safeName = String(msg.name || 'Você (Cel)').slice(0, 30).trim();
        const safeText = String(msg.text || '').slice(0, 500).trim();
        if (!safeText) return;
        send(room.hostWs, { type: 'chat-from-mobile', name: safeName, text: safeText });
        break;
      }

      // ===== HOST replica eventos do chat para o(s) celular(es) conectado(s) =====
      case 'host-chat-broadcast': {
        const room = rooms.get(ws.roomCode);
        if (!room || ws.role !== 'host') return;
        broadcastToMobiles(room, { type: 'chat-event', payload: msg.payload });
        break;
      }

      // ===== HOST envia stats atualizadas (viewers, likes etc.) pro celular =====
      case 'host-stats-update': {
        const room = rooms.get(ws.roomCode);
        if (!room || ws.role !== 'host') return;
        broadcastToMobiles(room, { type: 'stats-update', payload: msg.payload });
        break;
      }

      // ===== CONTROLE REMOTO: celular controla PC (cena, som, gift, pix, etc) =====
      case 'mobile-control': {
        const room = rooms.get(ws.roomCode);
        if (!room || ws.role !== 'mobile') return;
        // Encaminha ação do celular para o host
        send(room.hostWs, { type: 'mobile-control', action: msg.action, data: msg.data });
        break;
      }

      // ===== WEBRTC SIGNALING: celular manda câmera pro PC =====
      // O celular cria a "offer" (proposta de conexão de vídeo) e manda pro host
      case 'webrtc-offer': {
        const room = rooms.get(ws.roomCode);
        if (!room) return;
        if (ws.role === 'mobile') {
          send(room.hostWs, { type: 'webrtc-offer', offer: msg.offer, from: 'mobile' });
        }
        break;
      }
      case 'webrtc-answer': {
        const room = rooms.get(ws.roomCode);
        if (!room) return;
        if (ws.role === 'host') {
          broadcastToMobiles(room, { type: 'webrtc-answer', answer: msg.answer });
        }
        break;
      }
      case 'webrtc-ice-candidate': {
        const room = rooms.get(ws.roomCode);
        if (!room) return;
        if (ws.role === 'host') {
          broadcastToMobiles(room, { type: 'webrtc-ice-candidate', candidate: msg.candidate });
        } else if (ws.role === 'mobile') {
          send(room.hostWs, { type: 'webrtc-ice-candidate', candidate: msg.candidate });
        }
        break;
      }

      default:
        break;
    }
  });

  ws.on('close', () => {
    if (!ws.roomCode) return;
    const room = rooms.get(ws.roomCode);
    if (!room) return;

    if (ws.role === 'host') {
      // Host saiu: avisa celulares e destrói a sala
      broadcastToMobiles(room, { type: 'host-disconnected' });
      rooms.delete(ws.roomCode);
      console.log(`[ROOM] Encerrada ${ws.roomCode} | restantes: ${rooms.size}`);
    } else if (ws.role === 'mobile') {
      room.mobileClients.delete(ws);
      send(room.hostWs, { type: 'mobile-disconnected', mobileCount: room.mobileClients.size });
    }
  });

  ws.on('error', (err) => {
    console.warn('[WS] erro:', err.message);
  });
});

// Ping a cada 30s para manter alive no proxy do Render
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(interval));

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT} | health: /health`);
});

// Graceful shutdown (Render envia SIGTERM)
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido, encerrando...');
  clearInterval(interval);
  server.close(() => process.exit(0));
});
