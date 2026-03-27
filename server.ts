import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { db, auth } from './src/lib/firebase.ts';
import { collection, getDocs, query, orderBy, limit, where, addDoc, setDoc, doc, getDoc, updateDoc, deleteDoc, writeBatch, Timestamp, serverTimestamp } from 'firebase/firestore';
import { Telegraf } from 'telegraf';
import { scrapeMercadoLivre, scrapeShopee, scrapeAmazon, scrapeMagalu } from './src/services/scraperService.ts';
import { generateProductCopy } from './src/services/aiService.ts';
import { initTelegramBot, postToTelegram } from './src/services/telegramService.ts';
import axios from 'axios';
import { connectToWhatsApp, getWhatsAppStatus, sendWhatsAppMessage, closeWhatsApp } from './src/services/whatsappService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper for Firestore errors
const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
} as const;

type OperationType = (typeof OperationType)[keyof typeof OperationType];

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/l/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const productDoc = await getDoc(doc(db, 'products', id));
      if (productDoc.exists()) {
        const product = { id: productDoc.id, ...productDoc.data() } as any;
        
        // Increment clicks in analytics for today
        const today = new Date().toISOString().split('T')[0];
        const analyticsQuery = query(
          collection(db, 'analytics'),
          where('product_id', '==', id),
          where('date', '==', today),
          limit(1)
        );
        
        const analyticsSnap = await getDocs(analyticsQuery);
        
        if (!analyticsSnap.empty) {
          const analyticsDoc = analyticsSnap.docs[0];
          await updateDoc(doc(db, 'analytics', analyticsDoc.id), {
            clicks: (analyticsDoc.data().clicks || 0) + 1
          });
        } else {
          await addDoc(collection(db, 'analytics'), {
            product_id: id,
            clicks: 1,
            conversions: 0,
            date: today
          });
        }
        
        const redirectUrl = product.affiliate_link || product.original_link;
        console.log(`🔗 Redirecting product ${id} to: ${redirectUrl}`);

        if (!redirectUrl) {
          return res.status(404).send('Link de redirecionamento não encontrado.');
        }

        // Always use the Super Link implementation (HTML with OG metadata) for all users.
        // This avoids 302 redirect issues with some proxies/WAFs (like Cloud Armor) that block "Open Redirects".
        // It also ensures that OG metadata is always present for social sharing previews.
        const title = product.name;
        const description = `🔥 Oferta Imperdível: R$ ${product.discount_price.toFixed(2)}! Confira agora.`;
        const imageUrl = product.image_url;
        const escapedUrl = redirectUrl.replace(/"/g, '&quot;').replace(/'/g, '&#39;');

        // Use https explicitly for OG metadata as the app is served over https in production/preview
        const host = req.get('host');
        const protocol = host?.includes('localhost') ? 'http' : 'https';
        const currentUrl = `${protocol}://${host}${req.originalUrl}`;

        res.send(`
          <!DOCTYPE html>
          <html lang="pt-br">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            
            <!-- Open Graph / Facebook / WhatsApp -->
            <meta property="og:type" content="website">
            <meta property="og:url" content="${currentUrl}">
            <meta property="og:title" content="${title}">
            <meta property="og:description" content="${description}">
            <meta property="og:image" content="${imageUrl}">
            <meta property="og:image:width" content="1200">
            <meta property="og:image:height" content="630">

            <!-- Twitter -->
            <meta property="twitter:card" content="summary_large_image">
            <meta property="twitter:url" content="${currentUrl}">
            <meta property="twitter:title" content="${title}">
            <meta property="twitter:description" content="${description}">
            <meta property="twitter:image" content="${imageUrl}">

            <!-- Meta Refresh Redirect -->
            <meta http-equiv="refresh" content="1; url=${escapedUrl}">
            
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #ffffff; color: #333; }
              .container { text-align: center; padding: 20px; max-width: 400px; width: 100%; }
              .loader { border: 3px solid #f3f3f3; border-top: 3px solid #25D366; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              .btn { display: inline-block; background-color: #25D366; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: background 0.2s; }
              .btn:hover { background-color: #128C7E; }
              .product-img { max-width: 150px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { font-size: 1.2rem; margin-bottom: 10px; }
              p { font-size: 0.9rem; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <img src="${imageUrl}" class="product-img" alt="${title}">
              <h1>${title}</h1>
              <div class="loader"></div>
              <p>Redirecionando para a oferta oficial...</p>
              <a href="${escapedUrl}" class="btn">CLIQUE AQUI PARA CONTINUAR</a>
              <p style="margin-top: 20px;"><small>Se não for redirecionado em 2 segundos, clique no botão acima.</small></p>
            </div>
            <script>
              // JavaScript fallback redirect
              setTimeout(function() {
                window.location.href = "${escapedUrl.replace(/&#39;/g, "'").replace(/&quot;/g, '"')}";
              }, 1500);
            </script>
          </body>
          </html>
        `);
      } else {
        res.status(404).send('Product not found');
      }
    } catch (error) {
      console.error('Redirect error:', error);
      res.status(500).send('Internal server error');
    }
  });

  // API Routes
  app.get('/api/products', async (req, res) => {
    try {
      const productsSnap = await getDocs(query(collection(db, 'products'), orderBy('created_at', 'desc')));
      const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Include the first copy for each product if it exists
      const productsWithCopies = await Promise.all(products.map(async (p: any) => {
        const copiesQuery = query(
          collection(db, `products/${p.id}/copies`),
          orderBy('variation', 'asc'),
          limit(1)
        );
        const copiesSnap = await getDocs(copiesQuery);
        const firstCopy = copiesSnap.empty ? null : copiesSnap.docs[0].data();
        return { ...p, first_copy: firstCopy?.content || null };
      }));
      
      res.json(productsWithCopies);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'products');
    }
  });

  app.get('/api/stats', async (req, res) => {
    try {
      const analyticsSnap = await getDocs(collection(db, 'analytics'));
      const productsSnap = await getDocs(collection(db, 'products'));
      
      let totalClicks = 0;
      let totalConversions = 0;
      analyticsSnap.forEach(doc => {
        totalClicks += doc.data().clicks || 0;
        totalConversions += doc.data().conversions || 0;
      });

      const totalProducts = productsSnap.size;
      
      // Top products by clicks
      // Since Firestore doesn't support complex joins/group by easily, we'll do it in memory for now
      const productClicks: Record<string, { name: string, platform: string, clicks: number, conversions: number }> = {};
      
      analyticsSnap.forEach(aDoc => {
        const data = aDoc.data();
        const pid = data.product_id;
        if (!productClicks[pid]) {
          productClicks[pid] = { name: 'Unknown', platform: 'Unknown', clicks: 0, conversions: 0 };
        }
        productClicks[pid].clicks += data.clicks || 0;
        productClicks[pid].conversions += data.conversions || 0;
      });

      // Enrich with product names
      await Promise.all(Object.keys(productClicks).map(async (pid) => {
        const pDoc = await getDoc(doc(db, 'products', pid));
        if (pDoc.exists()) {
          const pData = pDoc.data();
          productClicks[pid].name = pData.name;
          productClicks[pid].platform = pData.platform;
        }
      }));

      const topProducts = Object.values(productClicks)
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 4);

      // Weekly performance (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      const weeklyQuery = query(
        collection(db, 'analytics'),
        where('date', '>=', sevenDaysAgoStr),
        orderBy('date', 'asc')
      );
      const weeklySnap = await getDocs(weeklyQuery);
      
      const weeklyMap: Record<string, { cliques: number, conv: number }> = {};
      weeklySnap.forEach(doc => {
        const data = doc.data();
        if (!weeklyMap[data.date]) {
          weeklyMap[data.date] = { cliques: 0, conv: 0 };
        }
        weeklyMap[data.date].cliques += data.clicks || 0;
        weeklyMap[data.date].conv += data.conversions || 0;
      });

      const dayNames: Record<string, string> = {
        '0': 'Dom', '1': 'Seg', '2': 'Ter', '3': 'Qua', '4': 'Qui', '5': 'Sex', '6': 'Sáb'
      };

      const formattedWeeklyData = Object.entries(weeklyMap).map(([dateStr, stats]) => {
        const date = new Date(dateStr);
        return {
          name: dayNames[date.getDay()] || dateStr,
          ...stats
        };
      });

      // If no data, provide some empty structure
      const finalWeeklyData = formattedWeeklyData.length > 0 ? formattedWeeklyData : [
        { name: 'Seg', cliques: 0, conv: 0 },
        { name: 'Ter', cliques: 0, conv: 0 },
        { name: 'Qua', cliques: 0, conv: 0 },
        { name: 'Qui', cliques: 0, conv: 0 },
        { name: 'Sex', cliques: 0, conv: 0 },
        { name: 'Sáb', cliques: 0, conv: 0 },
        { name: 'Dom', cliques: 0, conv: 0 },
      ];

      res.json({
        clicks: totalClicks,
        products: totalProducts,
        conversions: totalConversions,
        estimatedProfit: totalConversions * 5.50,
        topProducts,
        weeklyData: finalWeeklyData
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Settings Endpoints
  app.get('/api/settings', async (req, res) => {
    try {
      const settingsSnap = await getDocs(collection(db, 'settings'));
      const settings: Record<string, string> = {};
      settingsSnap.forEach(doc => {
        const data = doc.data();
        settings[data.key] = data.value;
      });
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/settings', async (req, res) => {
    const settings = req.body;
    console.log('Saving settings:', Object.keys(settings));
    
    try {
      const batch = writeBatch(db);
      for (const [key, value] of Object.entries(settings)) {
        const settingRef = doc(db, 'settings', key);
        batch.set(settingRef, { key, value: String(value) }, { merge: true });
      }
      await batch.commit();

      // Re-initialize Telegram bot if token changed
      if (settings.telegram_token) {
        initTelegramBot(settings.telegram_token);
      }

      // Restart automation loop with new interval
      if (settings.automation_interval) {
        restartAutomationLoop(parseInt(settings.automation_interval));
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to save settings:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.post('/api/settings/test-telegram', async (req, res) => {
    const { token, chatId } = req.body;
    if (!token || !chatId) {
      return res.status(400).json({ success: false, error: 'Token and Chat ID are required' });
    }
    
    try {
      const testBot = new Telegraf(token);
      await testBot.telegram.sendMessage(chatId, '✅ AFILIAUTO PRO: Teste de conexão bem-sucedido!');
      res.json({ success: true });
    } catch (error) {
      console.error('Telegram test error:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.get('/api/products/:id/copies', async (req, res) => {
    const { id } = req.params;
    try {
      const copiesSnap = await getDocs(collection(db, `products/${id}/copies`));
      const copies = copiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(copies);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/products/:id/copies', async (req, res) => {
    const { id } = req.params;
    const copies = req.body; // Array of { title, content }
    
    if (!Array.isArray(copies)) {
      return res.status(400).json({ success: false, error: 'Copies must be an array' });
    }

    try {
      const batch = writeBatch(db);
      
      // Remove old copies first
      const oldCopiesSnap = await getDocs(collection(db, `products/${id}/copies`));
      oldCopiesSnap.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      copies.forEach((c: any, i: number) => {
        const copyRef = doc(collection(db, `products/${id}/copies`));
        batch.set(copyRef, {
          product_id: id,
          title: c.title || '',
          content: c.content,
          variation: i + 1
        });
      });
      
      await batch.commit();
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to save copies:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.post('/api/telegram/post', async (req, res) => {
    const { content } = req.body;
    try {
      const settingSnap = await getDoc(doc(db, 'settings', 'telegram_chat_id'));
      const telegramChatId = settingSnap.exists() ? settingSnap.data().value : null;

      if (!telegramChatId) {
        return res.status(400).json({ success: false, error: 'Telegram Chat ID not configured' });
      }

      await postToTelegram(telegramChatId, content);
      res.json({ success: true });
    } catch (error) {
      console.error('Telegram post error:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.get('/api/whatsapp/status', (req, res) => {
    try {
      res.json(getWhatsAppStatus());
    } catch (error) {
      console.error('Failed to get WhatsApp status:', error);
      res.status(500).json({ status: 'error', error: String(error) });
    }
  });

  app.post('/api/whatsapp/connect', async (req, res) => {
    try {
      await connectToWhatsApp(true);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.post('/api/whatsapp/reset', async (req, res) => {
    try {
      const authPath = path.join(process.cwd(), 'auth_info_baileys');
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
      }
      await connectToWhatsApp(true);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  async function postToWhatsApp(apiUrl: string, apiKey: string, chatId: string, content: string, imageUrl?: string) {
    try {
      // Try to use Baileys connection if it's active or can be activated
      const status = getWhatsAppStatus();
      if (status.status === 'open' || status.status === 'close' || status.status === 'connecting') {
        try {
          await sendWhatsAppMessage(chatId, content, imageUrl);
          console.log('✅ Posted to WhatsApp via Baileys successfully');
          return;
        } catch (baileysError) {
          console.error('❌ Baileys send failed, trying fallback if available:', baileysError instanceof Error ? baileysError.message : String(baileysError));
        }
      }

      // Fallback to external API if configured
      if (apiUrl && apiKey) {
        await axios.post(apiUrl, {
          number: chatId,
          text: content,
          message: content,
          image: imageUrl
        }, {
          headers: {
            'apikey': apiKey,
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('✅ Posted to WhatsApp via external API successfully');
      }
    } catch (error) {
      console.error('❌ WhatsApp post error:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  app.post('/api/whatsapp/post', async (req, res) => {
    const { content } = req.body;
    try {
      const keys = ['whatsapp_api_url', 'whatsapp_api_key', 'whatsapp_chat_id'];
      const settings: Record<string, string> = {};
      
      await Promise.all(keys.map(async (key) => {
        const sDoc = await getDoc(doc(db, 'settings', key));
        if (sDoc.exists()) {
          settings[key] = sDoc.data().value;
        }
      }));

      if (!settings.whatsapp_api_url || !settings.whatsapp_chat_id) {
        return res.status(400).json({ success: false, error: 'WhatsApp not configured' });
      }

      await postToWhatsApp(settings.whatsapp_api_url, settings.whatsapp_api_key, settings.whatsapp_chat_id, content);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Automation Logic
  let automationIntervalId: NodeJS.Timeout | null = null;

  function isWithinAutomationWindow(startTime: string, endTime: string): boolean {
    if (!startTime || !endTime) return true;
    
    const now = new Date();
    // Use local time for scheduling
    const currentTimeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    // Simple string comparison for HH:mm
    if (startTime <= endTime) {
      return currentTimeStr >= startTime && currentTimeStr <= endTime;
    } else {
      // Over midnight case (e.g., 22:00 to 06:00)
      return currentTimeStr >= startTime || currentTimeStr <= endTime;
    }
  }

  async function sendAutomationNotification(type: 'success' | 'failure', message: string) {
    try {
      const settingsSnap = await getDocs(collection(db, 'settings'));
      const settings: Record<string, string> = {};
      settingsSnap.forEach(doc => {
        const data = doc.data();
        settings[data.key] = data.value;
      });

      const telegramChatId = settings['telegram_notification_chat_id'] || settings['telegram_chat_id'];
      const whatsappChatId = settings['whatsapp_notification_chat_id'] || settings['whatsapp_chat_id'];
      const whatsappApiUrl = settings['whatsapp_api_url'];
      const whatsappApiKey = settings['whatsapp_api_key'];

      const notifyTelegram = settings[`notify_telegram_${type}`] === 'true';
      const notifyWhatsapp = settings[`notify_whatsapp_${type}`] === 'true';

      const statusEmoji = type === 'success' ? '✅' : '❌';
      const finalMessage = `${statusEmoji} *AFILIAUTO PRO: Automação*\n\n${message}`;

      if (notifyTelegram && telegramChatId) {
        try {
          await postToTelegram(telegramChatId, finalMessage);
        } catch (e) {
          console.error('Failed to send Telegram notification:', e);
        }
      }

      if (notifyWhatsapp && (whatsappChatId || whatsappApiUrl)) {
        try {
          await postToWhatsApp(whatsappApiUrl, whatsappApiKey, whatsappChatId, finalMessage);
        } catch (e) {
          console.error('Failed to send WhatsApp notification:', e);
        }
      }
    } catch (error) {
      console.error('Automation notification error:', error);
    }
  }

  async function runAutomationCycle(bypassWindow: boolean = false) {
    console.log('🤖 Running automation cycle...');
    try {
      const settingsSnap = await getDocs(collection(db, 'settings'));
      const settings: Record<string, string> = {};
      settingsSnap.forEach(doc => {
        const data = doc.data();
        settings[data.key] = data.value;
      });

      // Check if within allowed window
      const startTime = settings['automation_start_time'] || '08:00';
      const endTime = settings['automation_end_time'] || '22:00';
      
      if (!bypassWindow && !isWithinAutomationWindow(startTime, endTime)) {
        console.log(`⏳ Outside automation window (${startTime} - ${endTime}). Skipping cycle.`);
        return 0;
      }

      // Record that we are starting a cycle
      await setDoc(doc(db, 'settings', 'automation_last_status'), { key: 'automation_last_status', value: 'running' }, { merge: true });
      
      const cookies = settings['affiliate_cookies'] || '';
      const limitCount = parseInt(settings['automation_limit'] || '5');
      
      const allScrapedProducts = [];
      
      // Scrape from active platforms
      if (settings['mercadolivre_active'] === 'true') {
        const mlProducts = await scrapeMercadoLivre(cookies);
        allScrapedProducts.push(...mlProducts);
      }
      
      if (settings['shopee_active'] === 'true') {
        const shopeeProducts = await scrapeShopee(cookies);
        allScrapedProducts.push(...shopeeProducts);
      }
      
      if (settings['amazon_active'] === 'true') {
        const amazonProducts = await scrapeAmazon(cookies);
        allScrapedProducts.push(...amazonProducts);
      }
      
      if (settings['magalu_active'] === 'true') {
        const magaluProducts = await scrapeMagalu(cookies);
        allScrapedProducts.push(...magaluProducts);
      }

      const newProducts = [];
      
      for (const p of allScrapedProducts) {
        const cleanLink = p.original_link.split('?')[0];
        
        // Smarter search: Check if this product was already posted in the last 3 days
        const q = query(
          collection(db, 'products'),
          where('original_link', '>=', cleanLink),
          where('original_link', '<=', cleanLink + '\uf8ff'),
          orderBy('original_link'),
          orderBy('created_at', 'desc'),
          limit(1)
        );
        
        const lastEntrySnap = await getDocs(q);
        const lastEntry = lastEntrySnap.empty ? null : { id: lastEntrySnap.docs[0].id, ...lastEntrySnap.docs[0].data() } as any;
        
        let shouldPost = false;
        
        if (!lastEntry) {
          shouldPost = true;
        } else {
          const lastPostedDate = lastEntry.created_at?.toDate() || new Date(0);
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          
          if (p.discount_price < lastEntry.discount_price) {
            console.log(`📉 Price drop detected for ${p.name}: R$ ${lastEntry.discount_price} -> R$ ${p.discount_price}`);
            shouldPost = true;
          } else if (lastPostedDate < threeDaysAgo) {
            shouldPost = true;
          }
        }
        
        if (shouldPost) {
          newProducts.push(p);
        }
        
        if (newProducts.length >= limitCount) break;
      }
      
      const processedProducts = newProducts;
      
      const TRIGGERS = [
        'Urgência (ex: "Corre, acaba logo!", "Últimas unidades!")',
        'Escassez (ex: "Poucas unidades no estoque!", "Não vai sobrar nada!")',
        'Prova Social (ex: "O mais vendido do dia!", "Todo mundo está aproveitando!")'
      ];

      const COPY_TEMPLATES = [
        "🔥 OFERTA IMPERDÍVEL\n📦 {name}\n💰 De R$ {valor original} por R$ {valor com desconto}\n⚠️ Estoque limitado\n👉 {link}",
        "🚀 CORRE QUE TÁ BARATO\n📦 {name}\n💰 Era R$ {valor original} agora apenas R$ {valor com desconto}\n⚠️ Poucas unidades\n👉 {link}",
        "🌟 O MAIS VENDIDO\n📦 {name}\n💰 De R$ {valor original} por R$ {valor com desconto}\n⚠️ Promoção por tempo limitado\n👉 {link}"
      ];

      let triggerIndex = parseInt(settings['last_trigger_index'] || '0');
      
      for (const p of processedProducts) {
        // Get platform specific settings
        const platformKey = p.platform.toLowerCase().replace(/\s+/g, '');
        const platformAffId = settings[`${platformKey}_affiliate_id`] || '';
        const platformAffId2 = settings[`${platformKey}_affiliate_id_2`] || '';
        const platformTemplate = settings[`${platformKey}_link_template`] || '{link}?aff_id={affiliate_id}';

        // Clean original link and apply affiliate template
        const fullLink = p.original_link;
        const cleanLink = p.original_link.split('?')[0];
        const affiliateLink = platformTemplate
          .replace(/{link}/g, cleanLink)
          .replace(/{encoded_link}/g, encodeURIComponent(cleanLink))
          .replace(/{full_link}/g, fullLink)
          .replace(/{encoded_full_link}/g, encodeURIComponent(fullLink))
          .replace(/{affiliate_id}/g, platformAffId)
          .replace(/{affiliate_id_2}/g, platformAffId2);
        
        const productRef = doc(collection(db, 'products'));
        await setDoc(productRef, {
          name: p.name,
          original_price: p.original_price,
          discount_price: p.discount_price,
          original_link: p.original_link,
          affiliate_link: affiliateLink,
          image_url: p.image_url,
          platform: p.platform,
          rating: p.rating || 0,
          sales_count: p.sales_count || 0,
          created_at: serverTimestamp()
        });
        
        const productId = productRef.id;
        
        // Tracking link
        let appUrl = (settings['app_url'] || process.env.APP_URL || '').trim();
        if (!appUrl) {
          appUrl = `http://localhost:${PORT}`;
          console.warn('⚠️ APP_URL setting or environment variable is not set. Using localhost:', appUrl);
        }
        if (appUrl.endsWith('/')) appUrl = appUrl.slice(0, -1);
        const trackingLink = `${appUrl}/l/${productId}`;

        // Generate copies with alternating triggers
        const currentTrigger = TRIGGERS[triggerIndex % TRIGGERS.length];
        triggerIndex++;

        console.log(`🤖 Generating copies for product ${productId} using trigger: ${currentTrigger}`);
        
        try {
          const aiCopies = await generateProductCopy(p, currentTrigger);
          if (Array.isArray(aiCopies)) {
            const batch = writeBatch(db);
            for (let i = 0; i < aiCopies.length; i++) {
              const copyRef = doc(collection(db, `products/${productId}/copies`));
              batch.set(copyRef, {
                product_id: productId,
                title: aiCopies[i].title,
                content: aiCopies[i].content,
                variation: i
              });
            }
            await batch.commit();
          }
        } catch (e) {
          console.error(`Failed to generate AI copies for product ${productId}:`, e);
        }
        
        // Automated posting
        const telegramChatId = settings['telegram_chat_id'];
        const whatsappActive = settings['whatsapp_active'] === 'true';
        const whatsappApiUrl = settings['whatsapp_api_url'];
        const whatsappApiKey = settings['whatsapp_api_key'];
        const whatsappChatId = settings['whatsapp_chat_id'];

        const replacePlaceholders = (text: string) => {
          if (!text) return '';
          const cleanedText = text.replace(/cookie\s*check|verificação\s*de\s*cookies/gi, '').trim();
          
          return cleanedText
            .split('{name}').join(p.name || 'Produto')
            .split('{valor original}').join(p.original_price.toFixed(2))
            .split('{valor com desconto}').join(p.discount_price.toFixed(2))
            .split('{price}').join(p.discount_price.toFixed(2))
            .split('{original_price}').join(p.original_price.toFixed(2))
            .split('{link}').join(affiliateLink || trackingLink)
            .split('{direct_link}').join(affiliateLink || trackingLink)
            .split('{tracking_link}').join(trackingLink);
        };

        const copiesSnap = await getDocs(query(collection(db, `products/${productId}/copies`), orderBy('variation', 'asc'), limit(1)));
        const firstAiCopy = copiesSnap.empty ? null : copiesSnap.docs[0].data();
        
        let finalCopy = '';
        if (firstAiCopy && firstAiCopy.content) {
          finalCopy = replacePlaceholders(firstAiCopy.content);
        } else {
          const templateIndex = (triggerIndex - 1) % COPY_TEMPLATES.length;
          finalCopy = replacePlaceholders(COPY_TEMPLATES[templateIndex]);
        }

        if (telegramChatId) {
          try {
            await postToTelegram(telegramChatId, finalCopy, p.image_url);
          } catch (e) {
            console.error('Telegram auto-post failed:', e);
          }
        }

        if (whatsappActive && (whatsappChatId || whatsappApiUrl)) {
          try {
            await postToWhatsApp(whatsappApiUrl, whatsappApiKey, whatsappChatId, finalCopy, p.image_url);
          } catch (e) {
            console.error('WhatsApp auto-post failed:', e);
          }
        }
      }
      
      // Update last run time and status
      const now = new Date().toISOString();
      const batch = writeBatch(db);
      batch.set(doc(db, 'settings', 'last_automation_run'), { key: 'last_automation_run', value: now }, { merge: true });
      batch.set(doc(db, 'settings', 'automation_last_status'), { key: 'automation_last_status', value: 'success' }, { merge: true });
      batch.set(doc(db, 'settings', 'last_trigger_index'), { key: 'last_trigger_index', value: (triggerIndex % TRIGGERS.length).toString() }, { merge: true });
      await batch.commit();
      
      console.log(`✅ Cycle complete: ${processedProducts.length} products processed at ${now}`);
      
      if (processedProducts.length > 0) {
        await sendAutomationNotification('success', `Automação concluída com sucesso!\n📦 ${processedProducts.length} novos produtos processados.`);
      }
      
      return processedProducts.length;
    } catch (err) {
      console.error('❌ Automation cycle failed:', err);
      await setDoc(doc(db, 'settings', 'automation_last_status'), { key: 'automation_last_status', value: 'error' }, { merge: true });
      await setDoc(doc(db, 'settings', 'automation_last_error'), { key: 'automation_last_error', value: String(err) }, { merge: true });
      
      await sendAutomationNotification('failure', `A automação falhou!\n⚠️ Erro: ${String(err)}`);
      
      throw err;
    }
  }

  async function restartAutomationLoop(hours: number) {
    if (automationIntervalId) {
      clearInterval(automationIntervalId);
    }
    
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    batch.set(doc(db, 'settings', 'automation_started_at'), { key: 'automation_started_at', value: now }, { merge: true });
    batch.set(doc(db, 'settings', 'automation_interval'), { key: 'automation_interval', value: String(hours) }, { merge: true });
    await batch.commit();

    const ms = hours * 60 * 60 * 1000;
    console.log(`Setting automation interval to ${hours} hours (${ms}ms). Started at ${now}`);
    
    // Run first cycle immediately
    runAutomationCycle().catch(err => console.error('Initial automation cycle failed:', err));
    
    automationIntervalId = setInterval(runAutomationCycle, ms);
  }

  app.get('/api/automation/status', async (req, res) => {
    try {
      const keys = [
        'last_automation_run', 
        'automation_interval', 
        'whatsapp_active', 
        'automation_started_at', 
        'automation_last_status', 
        'automation_last_error',
        'automation_start_time',
        'automation_end_time',
        'app_url'
      ];
      
      const status: Record<string, string> = {};
      await Promise.all(keys.map(async (key) => {
        const sDoc = await getDoc(doc(db, 'settings', key));
        if (sDoc.exists()) {
          status[key] = sDoc.data().value;
        }
      }));
      
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/automation/trigger', async (req, res) => {
    console.log('Manual automation trigger...');
    try {
      const count = await runAutomationCycle(true);
      res.json({ success: true, message: `${count} products processed` });
    } catch (error) {
      console.error('Automation error:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Initialize WhatsApp with a random delay to avoid conflicts between multiple instances
  const startupDelay = Math.floor(Math.random() * 30000);
  console.log(`⏳ Initializing WhatsApp in ${startupDelay/1000} seconds...`);
  setTimeout(() => {
    connectToWhatsApp().catch(err => console.error('Failed to init WhatsApp:', err));
  }, startupDelay);

  // Graceful shutdown
  process.on('exit', () => {
    closeWhatsApp();
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing WhatsApp...');
    closeWhatsApp();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, closing WhatsApp...');
    closeWhatsApp();
    process.exit(0);
  });

  // Initialize Default Settings if they don't exist
  const defaultSettings = [
    { key: 'automation_category_1', value: 'oferta roupas calçados' },
    { key: 'automation_category_2', value: 'smartphone eletrônicos tech' },
    { key: 'automation_category_3', value: 'suplemento whey fitness' },
    { key: 'automation_category_4', value: 'casa decoração utensílios' },
    { key: 'automation_category_5', value: 'perfume maquiagem beleza' },
    { key: 'automation_category_6', value: 'console games jogos' },
    { key: 'automation_category_0', value: 'ofertas do dia' },
    { key: 'automation_start_time', value: '00:00' },
    { key: 'automation_end_time', value: '23:59' },
    { key: 'automation_interval', value: '2' },
    { key: 'whatsapp_active', value: 'true' },
    { key: 'mercadolivre_active', value: 'true' },
    { key: 'shopee_active', value: 'true' },
    { key: 'amazon_active', value: 'true' },
    { key: 'magalu_active', value: 'true' },
    { key: 'mercadolivre_link_template', value: '{link}?matt_tool={affiliate_id}&matt_word={affiliate_id_2}' },
    { key: 'shopee_link_template', value: '{link}?aff_id={affiliate_id}' },
    { key: 'amazon_link_template', value: '{link}?tag={affiliate_id}' },
    { key: 'magalu_link_template', value: 'https://www.magazinevoce.com.br/magazine{affiliate_id}/p/{link}' },
    { key: 'automation_last_status', value: 'idle' }
  ];

  const settingsBatch = writeBatch(db);
  for (const setting of defaultSettings) {
    const sDoc = await getDoc(doc(db, 'settings', setting.key));
    if (!sDoc.exists()) {
      settingsBatch.set(doc(db, 'settings', setting.key), setting);
    }
  }
  await settingsBatch.commit();

  // Initialize Automation
  const automationIntervalDoc = await getDoc(doc(db, 'settings', 'automation_interval'));
  const initialInterval = automationIntervalDoc.exists() ? parseInt(automationIntervalDoc.data().value) : 2;
  
  // Force 24/7 if old defaults were present
  const startTimeDoc = await getDoc(doc(db, 'settings', 'automation_start_time'));
  const endTimeDoc = await getDoc(doc(db, 'settings', 'automation_end_time'));
  const startTime = startTimeDoc.exists() ? startTimeDoc.data().value : null;
  const endTime = endTimeDoc.exists() ? endTimeDoc.data().value : null;

  if (startTime === '08:00' && endTime === '22:00') {
    await setDoc(doc(db, 'settings', 'automation_start_time'), { key: 'automation_start_time', value: '00:00' }, { merge: true });
    await setDoc(doc(db, 'settings', 'automation_end_time'), { key: 'automation_end_time', value: '23:59' }, { merge: true });
    console.log('✅ Automation window updated to 24/7 (00:00 - 23:59)');
  }

  restartAutomationLoop(initialInterval);

  // Verify Gemini API Key
  let geminiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
  if (geminiKey.startsWith('"') && geminiKey.endsWith('"')) geminiKey = geminiKey.substring(1, geminiKey.length - 1);
  if (geminiKey.startsWith("'") && geminiKey.endsWith("'")) geminiKey = geminiKey.substring(1, geminiKey.length - 1);

  if (!geminiKey) {
    console.error('❌ CRITICAL: GEMINI_API_KEY is missing from environment variables.');
  } else {
    console.log(`✅ Gemini API Key found in environment (length: ${geminiKey.length}).`);
  }

  // Initialize Telegram Bot
  const telegramTokenDoc = await getDoc(doc(db, 'settings', 'telegram_token'));
  if (telegramTokenDoc.exists() && telegramTokenDoc.data().value) {
    initTelegramBot(telegramTokenDoc.data().value);
  } else if (process.env.TELEGRAM_BOT_TOKEN) {
    initTelegramBot(process.env.TELEGRAM_BOT_TOKEN);
  }

  app.delete('/api/products', async (req, res) => {
    console.log('DELETE /api/products request received');
    try {
      const collections = ['analytics', 'copies', 'products'];
      for (const colName of collections) {
        const q = query(collection(db, colName));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      console.log('Deletion completed successfully');
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to clear products:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'AFILIAUTO PRO API is running' });
  });

  // API 404 handler - MUST be before Vite middleware
  app.all('/api/*', (req, res) => {
    res.status(404).json({ success: false, error: 'API route not found' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AFILIAUTO PRO running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
});
