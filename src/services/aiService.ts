import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  let apiKey = "";
  
  try {
    // Try to get from process.env (Node/Vite define) or import.meta.env (Vite)
    apiKey = (
      process.env.GEMINI_API_KEY || 
      (import.meta as any).env?.VITE_GEMINI_API_KEY || 
      process.env.API_KEY || // Fallback for some environments
      ""
    ).trim();
  } catch (e) {
    apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
  }
  
  // Handle literal "undefined" or "null" strings that can happen during build/injection
  if (apiKey === "undefined" || apiKey === "null" || !apiKey) {
    console.warn("⚠️ GEMINI_API_KEY not found or invalid in environment variables.");
    // We'll still return the instance, but the API call will likely fail with a clear error
  }
  
  // Remove literal quotes if they exist (common copy-paste error)
  if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
    apiKey = apiKey.substring(1, apiKey.length - 1);
  } else if (apiKey.startsWith("'") && apiKey.endsWith("'")) {
    apiKey = apiKey.substring(1, apiKey.length - 1);
  }
  
  return new GoogleGenAI({ apiKey });
};

export async function generateProductCopyInternal(product: any, trigger?: string) {
  const ai = getAI();
  
  const triggerPrompt = trigger 
    ? `Foque especificamente no gatilho mental de: ${trigger}.`
    : `Gere 3 variações diferentes, focando em gatilhos mentais variados como urgência, escassez, prova social, curiosidade e benefício exclusivo.`;

  const parts: any[] = [
    {
      text: `
        Você é um especialista em Copywriting para Afiliados. 
        Gere uma copy IRRESISTÍVEL para o seguinte produto:
        
        Nome: ${product.name}
        Preço Original: R$ ${product.original_price}
        Preço com Desconto: R$ ${product.discount_price}
        Plataforma: ${product.platform}
        
        ${triggerPrompt}
        
        DIRETRIZES:
        1. Use emojis estratégicos (🔥, 🚀, 😱, 📦, 💰, ⚠️, ✅).
        2. Copy curta, impactante e formatada para leitura rápida.
        3. Destaque o valor do desconto ou a economia.
        4. Crie urgência ou exclusividade.
        
        PLACEHOLDERS:
        - {link} para o link de rastreamento.
        - {name} para o nome do produto.
        - {price} para o preço com desconto.
        - {original_price} para o preço sem desconto.

        IMPORTANTE: 
        - NÃO mencione termos técnicos como "cookies".
        - Foque no benefício real.

        Exemplo: 
        "😱 MEU DEUS! Olha esse preço! 
        📦 {name}
        💰 De R$ {original_price} por APENAS R$ {price}
        🔥 Corre que vai acabar!
        👉 {link}"

        Retorne apenas um JSON no formato:
        [
          { "title": "...", "content": "..." },
          { "title": "...", "content": "..." },
          { "title": "...", "content": "..." }
        ]
      `
    }
  ];

  // Node-compatible image handling
  if (product.image_url && typeof window === 'undefined') {
    try {
      const response = await fetch(product.image_url);
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      parts.push({
        inlineData: {
          mimeType: contentType,
          data: base64
        }
      });
    } catch (e) {
      console.warn("Could not fetch image for AI analysis in Node:", e);
    }
  } else if (product.image_url && typeof window !== 'undefined') {
    // Browser-compatible image handling
    try {
      const imgRes = await fetch(product.image_url);
      const blob = await imgRes.blob();
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64data = reader.result as string;
          resolve(base64data.split(',')[1]);
        };
      });
      reader.readAsDataURL(blob);
      const base64 = await base64Promise;
      
      parts.push({
        inlineData: {
          mimeType: blob.type || "image/jpeg",
          data: base64
        }
      });
    } catch (e) {
      console.warn("Could not fetch image for AI analysis in Browser:", e);
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
    });
    const text = response.text;
    if (!text) throw new Error("No text returned from Gemini");
    
    // Clean JSON from markdown if present
    const cleanedText = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error: any) {
    // Check if it's an API key error and provide a more helpful message
    const errorMsg = error.message || String(error);
    if (errorMsg.includes("API key not valid") || errorMsg.includes("API_KEY_INVALID")) {
      console.error("❌ Gemini API Key is invalid or missing. Please check your environment variables.");
    } else {
      console.error("❌ Error generating copy with Gemini:", errorMsg);
    }
    
    // Fallback copies if AI fails
    const link = product.affiliate_link || product.original_link;
    const price = typeof product.discount_price === 'number' ? product.discount_price.toFixed(2) : product.discount_price;
    const originalPrice = typeof product.original_price === 'number' ? product.original_price.toFixed(2) : product.original_price;

    return [
      { title: "Oferta Incrível!", content: `🔥 OFERTA IMPERDÍVEL\n📦 {name}\n💰 De R$ ${originalPrice} por R$ ${price}\n⚠️ Estoque limitado\n👉 {link}` },
      { title: "Preço Baixo!", content: `🚀 CORRE QUE TÁ BARATO\n📦 {name}\n💰 Apenas R$ ${price}\n⚠️ Poucas unidades\n👉 {link}` },
      { title: "Melhor Escolha!", content: `🌟 O MAIS VENDIDO\n📦 {name}\n💰 De R$ ${originalPrice} por R$ ${price}\n⚠️ Promoção por tempo limitado\n👉 {link}` }
    ];
  }
}

// Keep the original export name
export const generateProductCopy = generateProductCopyInternal;
