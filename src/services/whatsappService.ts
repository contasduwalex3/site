import { 
  makeWASocket, 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion,
  delay
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import QRCode from 'qrcode';
import P from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let sock: any = null;
let qrCode: string | null = null;
let connectionStatus: 'connecting' | 'open' | 'close' | 'qr' = 'close';
let isConnecting = false;
let lastError: string | null = null;
let retryCount = 0;
const MAX_RETRIES = 20;

let isConnectingNow = false;

export async function connectToWhatsApp(force = false) {
  if (isConnectingNow || connectionStatus === 'connecting') return;
  if (connectionStatus === 'open' && !force) {
    console.log('✅ WhatsApp already open, skipping...');
    return;
  }
  
  if (force) {
    retryCount = 0;
  }

  isConnectingNow = true;
  isConnecting = true;
  connectionStatus = 'connecting';
  lastError = null;

  try {
    const authPath = path.join(process.cwd(), 'auth_info_baileys');
    if (!fs.existsSync(authPath)) {
      fs.mkdirSync(authPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version } = await fetchLatestBaileysVersion();

    if (sock) {
      try {
        console.log('⏳ Closing existing WhatsApp socket before reconnecting...');
        sock.ev.removeAllListeners('connection.update');
        sock.ev.removeAllListeners('creds.update');
        sock.end(undefined);
        sock = null;
        // Increased delay to ensure socket is fully closed and server-side session is released
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (e) {
        console.error('Error closing existing socket:', e);
      }
    }

    sock = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: state,
      logger: P({ level: 'silent' }),
      browser: ['Ubuntu', 'Chrome', '110.0.5481.177'],
      connectTimeoutMs: 120000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      retryRequestDelayMs: 5000,
      qrTimeout: 120000,
      syncFullHistory: false,
    });

    sock.ev.on('connection.update', async (update: any) => {
      try {
        const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrCode = await QRCode.toDataURL(qr);
        connectionStatus = 'qr';
        lastError = null;
        console.log('✅ QR Code generated');
      }

      if (connection === 'close') {
        const error = lastDisconnect?.error as Boom;
        const statusCode = error?.output?.statusCode;
        const errorMessage = error?.message || '';
        const errorStack = error?.stack || '';
             const isQRTimeout = errorMessage.includes('QR refs attempts ended') || errorStack.includes('QR refs attempts ended');
        const isTerminated = errorMessage.includes('Connection Terminated by Server') || errorStack.includes('Connection Terminated by Server') || statusCode === 428;
        const isStreamError = statusCode === 515 || errorMessage.includes('Stream Errored');
        const isConflict = statusCode === 440 || errorMessage.includes('conflict');
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const isConnectionLost = statusCode === DisconnectReason.connectionLost || statusCode === DisconnectReason.timedOut || statusCode === 408;
        
        // Reconnect on almost everything except explicit logout or QR timeout
        // If it's a conflict (440), we still try to reconnect but maybe with a warning
        const shouldReconnect = !isLoggedOut && !isQRTimeout && retryCount < MAX_RETRIES;
        
        console.log(`❌ Connection closed. Status: ${statusCode}. Message: ${errorMessage}. Reconnecting: ${shouldReconnect} (Attempt ${retryCount}/${MAX_RETRIES})`);
        
        if (lastDisconnect?.error) {
          if (isQRTimeout) {
            lastError = 'QR Code expirou. Por favor, gere um novo.';
          } else if (isTerminated) {
            lastError = 'Conexão encerrada pelo servidor. Tentando reconectar...';
          } else if (isStreamError) {
            lastError = 'Erro de fluxo (Stream Errored). Reiniciando conexão...';
          } else if (isConflict) {
            lastError = 'Conflito de conexão: Esta conta foi conectada em outro lugar. Tentando recuperar em 120s...';
            console.warn('⚠️ WhatsApp Conflict: Connection replaced by another session. Waiting longer to reconnect to avoid ping-pong.');
          } else if (isConnectionLost) {
            lastError = 'Conexão perdida com o servidor. Tentando reconectar...';
          } else if (isLoggedOut) {
            lastError = 'Sessão encerrada pelo WhatsApp. Por favor, conecte novamente.';
            // Clear auth path on logout
            try {
              fs.rmSync(authPath, { recursive: true, force: true });
            } catch (e) {
              console.error('Failed to clear auth path:', e);
            }
          } else if (retryCount >= MAX_RETRIES) {
            lastError = 'Muitas tentativas de conexão falharam. Por favor, tente novamente mais tarde ou resete a sessão.';
          } else {
            lastError = `Erro: ${errorMessage || 'Conexão encerrada'}`;
          }
        }
        
        connectionStatus = 'close';
        qrCode = null;
        isConnecting = false;
        
        // For stream errors, conflicts, or server terminations, we want to ensure the socket is completely nulled
        if (isStreamError || isTerminated || isConnectionLost || isConflict) {
          sock = null;
        }

        if (shouldReconnect) {
          retryCount++;
          // Exponential backoff
          // For conflicts, we use a much longer initial delay (120s) to avoid ping-ponging
          const baseDelay = isConflict ? 120000 : (isStreamError ? 10000 : 5000);
          const jitter = Math.floor(Math.random() * 15000); // Add up to 15s jitter
          const delayTime = Math.min(baseDelay * Math.pow(1.5, retryCount - 1), 300000) + jitter;
          console.log(`⏳ Reconnecting in ${Math.round(delayTime/1000)} seconds...`);
          setTimeout(() => connectToWhatsApp(), delayTime);
        }
      } else if (connection === 'open') {
        console.log('✅ WhatsApp connection opened');
        connectionStatus = 'open';
        qrCode = null;
        isConnecting = false;
        lastError = null;
        retryCount = 0; // Reset retry count on success
      }
    } catch (err) {
      console.error('Error in connection.update handler:', err);
    }
  });

    sock.ev.on('creds.update', saveCreds);

    return sock;
  } catch (error) {
    console.error('❌ Failed to initialize WhatsApp:', error);
    connectionStatus = 'close';
    isConnecting = false;
    lastError = `Erro na inicialização: ${error instanceof Error ? error.message : String(error)}`;
    throw error;
  } finally {
    isConnectingNow = false;
  }
}

export function getWhatsAppStatus() {
  return { status: connectionStatus, qr: qrCode, error: lastError };
}

export async function sendWhatsAppMessage(chatId: string, content: string, imageUrl?: string) {
  if (!sock || connectionStatus !== 'open') {
    // Try to reconnect if not connected
    if (connectionStatus !== 'connecting') {
      console.log('⏳ WhatsApp not connected, attempting to reconnect before sending message...');
      connectToWhatsApp();
    }
    
    // Wait longer for connection to open (up to 150 seconds if conflict, 30 seconds otherwise)
    let waitCount = 0;
    const isConflictState = lastError?.includes('Conflito');
    const maxWait = isConflictState ? 75 : 15; // 150s or 30s
    
    while (connectionStatus !== 'open' && waitCount < maxWait) {
      if (waitCount % 5 === 0) {
        console.log(`⏳ Waiting for WhatsApp connection... (${waitCount + 1}/${maxWait}) - Status: ${connectionStatus}`);
      }
      await delay(2000);
      waitCount++;
    }
    
    if (!sock || connectionStatus !== 'open') {
      throw new Error(`WhatsApp not connected (Status: ${connectionStatus})`);
    }
  }

  // Format chatId for groups if needed
  const jid = chatId.includes('@g.us') ? chatId : `${chatId}@s.whatsapp.net`;

  try {
    if (imageUrl && imageUrl.startsWith('http')) {
      // According to user request: "delay de 3 segundos para que a imagem do anúncio carregue e seja enviada"
      console.log(`⏳ Waiting 3 seconds before sending image to ${jid}...`);
      await delay(3000);

      // Fetch image to buffer to avoid "unsupported image format" errors with direct URLs in Baileys
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      const buffer = Buffer.from(await response.arrayBuffer());

      // 1. Send Image
      if (!sock) throw new Error('WhatsApp connection lost before sending image');
      await sock.sendMessage(jid, {
        image: buffer,
      });

      // 2. Small delay between image and text
      await delay(1000);

      // 3. Send Text (with link)
      if (!sock) throw new Error('WhatsApp connection lost before sending text');
      await sock.sendMessage(jid, { 
        text: content,
      });

      console.log(`✅ Super Link message sent to ${jid} (Image + Text separated)`);
    } else {
      if (!sock) throw new Error('WhatsApp connection lost');
      await sock.sendMessage(jid, { text: content });
    }
  } catch (e: any) {
    const errorMessage = e?.message || '';
    const errorStack = e?.stack || '';
    const isTerminated = errorMessage.includes('Connection Terminated by Server') || errorStack.includes('Connection Terminated by Server');
    const isConnectionLost = errorMessage.includes('Connection Lost') || errorMessage.includes('Timed Out');

    if (isTerminated || isConnectionLost) {
      console.error(`❌ WhatsApp connection error during send: ${errorMessage}. Resetting socket...`);
      sock = null;
      connectionStatus = 'close';
      connectToWhatsApp(true); // Force reconnect
    }
    
    console.error(`❌ Failed to send WhatsApp message to ${jid}. Error: ${errorMessage}`);
    throw e;
  }
}

export function getSocket() {
  return sock;
}

export function closeWhatsApp() {
  if (sock) {
    try {
      sock.ev.removeAllListeners('connection.update');
      sock.ev.removeAllListeners('creds.update');
      sock.end(undefined);
      sock = null;
      connectionStatus = 'close';
    } catch (e) {
      console.error('Error closing WhatsApp:', e);
    }
  }
}
