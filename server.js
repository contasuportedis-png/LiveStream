const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

app.use(express.static(path.join(__dirname, 'public')));

// Rota amigável /mobile -> mobile.html (sem precisar digitar a extensão no celular)
app.get('/mobile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mobile.html'));
});

// --- SALAS EM MEMÓRIA ---
// room = { code, hostWs, mobileClients: Set<ws> }
const rooms = new Map();

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

wss.on('connection', (ws) => {
  ws.role = null;
  ws.roomCode = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    switch (msg.type) {
      // ===== HOST (PC) cria uma sala ao iniciar a live =====
      case 'host-create-room': {
        const code = generateRoomCode();
        ws.role = 'host';
        ws.roomCode = code;
        rooms.set(code, { code, hostWs: ws, mobileClients: new Set() });
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
        send(room.hostWs, { type: 'chat-from-mobile', name: msg.name || 'Você (Cel)', text: msg.text });
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
    } else if (ws.role === 'mobile') {
      room.mobileClients.delete(ws);
      send(room.hostWs, { type: 'mobile-disconnected', mobileCount: room.mobileClients.size });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
