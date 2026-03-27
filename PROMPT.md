# Prompt de Geração para o Google AI Studio

Você pode usar o prompt abaixo para recriar esta aplicação exatamente como ela está agora em um novo projeto do Google AI Studio.

---

**Prompt:**

Crie uma aplicação full-stack chamada "AFILIAUTO PRO" para automação de afiliados. A aplicação deve ser um Dashboard de Gerenciamento de Ofertas com as seguintes funcionalidades:

1. **Dashboard Principal:**
   - Lista de produtos minerados com imagem, nome, preço original, preço com desconto e plataforma (Mercado Livre, Shopee, Amazon, Magalu).
   - Botões para "Gerar Copy AI", "Postar no Telegram" e "Postar no WhatsApp".
   - Gráfico de cliques (Analytics) por produto.

2. **Automação Inteligente:**
   - Sistema de raspagem (scraping) automática de ofertas do Mercado Livre, Shopee, Amazon e Magalu usando Puppeteer.
   - Geração automática de copies usando a API do Gemini (Google AI).
   - Ciclo de automação configurável (ex: a cada 2 horas) que minera novos produtos e posta automaticamente.

3. **Integrações de Postagem:**
   - **Telegram:** Integração via Bot API para postar ofertas em canais/grupos.
   - **WhatsApp:** Integração nativa usando a biblioteca `@whiskeysockets/baileys` para conectar via QR Code e postar em grupos.
   - **Super Link:** Sistema de redirecionamento (`/l/:id`) que gera metadados Open Graph (OG) para que o link fique clicável e com prévia (imagem/título) no WhatsApp, mesmo para não-contatos.

4. **Padrão de Mensagens (Copies):**
   - As postagens automáticas devem alternar entre 3 modelos:
     - Modelo 1: 🔥 OFERTA IMPERDÍVEL | 📦 {name} | 💰 De R$ {valor original} por R$ {valor com desconto} | ⚠️ Estoque limitado | 👉 {link}
     - Modelo 2: 🚀 CORRE QUE TÁ BARATO | 📦 {name} | 💰 Era R$ {valor original} agora apenas R$ {valor com desconto} | ⚠️ Poucas unidades | 👉 {link}
     - Modelo 3: 🌟 O MAIS VENDIDO | 📦 {name} | 💰 De R$ {valor original} por R$ {valor com desconto} | ⚠️ Promoção por tempo limitado | 👉 {link}

5. **Configurações:**
   - Painel para configurar Tokens do Telegram, APIs de WhatsApp, Cookies de Afiliado, Intervalo de Automação e IDs de Canais.

**Tecnologias:**
- Frontend: React + Tailwind CSS + Lucide Icons.
- Backend: Express + SQLite (better-sqlite3) + Puppeteer + Baileys.
- IA: Google Gemini API.

**Design:**
- Estilo Dashboard moderno, dark mode ou clean, com foco em usabilidade e dados.

---

**Instruções Adicionais:**
- Certifique-se de que o redirecionamento `/l/:id` inclua tags `<meta property="og:..." />` para a "mágica" do Super Link funcionar no WhatsApp.
- No WhatsApp, envie a imagem primeiro e o texto separado para garantir a clicabilidade do link.
- Use `link-preview-js` para ajudar na geração de previews se necessário.
