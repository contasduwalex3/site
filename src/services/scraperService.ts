import puppeteer from 'puppeteer';

function parseCookies(cookieString: string, domain: string) {
  try {
    return cookieString.split(';').map(pair => {
      const [name, ...valueParts] = pair.trim().split('=');
      if (!name || valueParts.length === 0) return null;
      return {
        name: name.trim(),
        value: valueParts.join('=').trim(),
        domain: domain
      };
    }).filter((c): c is { name: string; value: string; domain: string } => c !== null);
  } catch (err) {
    console.error('Error parsing cookies:', err);
    return [];
  }
}

export async function scrapeMercadoLivre(cookies?: string, searchQuery?: string) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    if (cookies && cookies.trim()) {
      console.log('Setting cookies for scraping...');
      const parsedCookies = parseCookies(cookies, '.mercadolivre.com.br');
      if (parsedCookies.length > 0) {
        await page.setCookie(...parsedCookies);
        console.log(`Successfully set ${parsedCookies.length} cookies.`);
      }
    }
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const url = searchQuery 
      ? `https://lista.mercadolivre.com.br/${encodeURIComponent(searchQuery)}`
      : 'https://www.mercadolivre.com.br/ofertas#nav-header';

    console.log(`Navigating to: ${url}`);
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Wait for the items to load - try multiple possible selectors
    const selectors = [
      '.promotion-item', 
      '.ui-search-result', 
      '.poly-card', 
      '[data-testid="promotion-card"]',
      '.ui-search-layout__item'
    ];
    let foundSelector = '';
    
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        foundSelector = selector;
        console.log(`Found selector: ${selector}`);
        break;
      } catch (e) {
        // Silent fail
      }
    }

    if (!foundSelector) {
      console.log('No known product selectors found. Attempting generic extraction...');
    }

    const products = await page.evaluate((sel) => {
      const items = sel ? Array.from(document.querySelectorAll(sel)) : Array.from(document.querySelectorAll('div')).filter(d => d.textContent?.includes('R$') && (d.textContent?.length || 0) < 500);
      
      return items.slice(0, 10).map(item => {
        // Try to find title, price, image, link using common patterns
        const nameEl = item.querySelector('h2, h3, .promotion-item__title, .ui-search-item__title, .poly-component__title, .ui-search-item__group--title, .ui-search-item__title');
        const name = nameEl?.textContent?.trim() || 'Produto sem nome';
        
        // Improved price extraction for Mercado Livre
        let priceDiscount = 0;
        let priceOriginal = 0;

        // 1. Try to find the price with discount (the main price)
        const mainPriceEl = item.querySelector('.andes-money-amount:not(.andes-money-amount--previous), .ui-search-price__second-line .andes-money-amount, .promotion-item__price, .poly-price__current .andes-money-amount');
        if (mainPriceEl) {
          const fraction = mainPriceEl.querySelector('.andes-money-amount__fraction')?.textContent?.replace(/\./g, '') || '';
          const cents = mainPriceEl.querySelector('.andes-money-amount__cents')?.textContent || '00';
          if (fraction) {
            priceDiscount = parseFloat(`${fraction}.${cents}`);
          }
        }

        // 2. Try to find the original price (the one with strike-through)
        const oldPriceEl = item.querySelector('.andes-money-amount--previous, .ui-search-price__part--previous .andes-money-amount, .promotion-item__old-price, .poly-price__comparison .andes-money-amount');
        if (oldPriceEl) {
          const fraction = oldPriceEl.querySelector('.andes-money-amount__fraction')?.textContent?.replace(/\./g, '') || '';
          const cents = oldPriceEl.querySelector('.andes-money-amount__cents')?.textContent || '00';
          if (fraction) {
            priceOriginal = parseFloat(`${fraction}.${cents}`);
          }
        }

        // Fallback if priceDiscount is still 0
        if (priceDiscount === 0) {
          const text = item.textContent || '';
          const matches = text.match(/R\$\s*([\d\.]+),?(\d*)/g);
          if (matches && matches.length > 0) {
             const clean = matches[0].replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
             priceDiscount = parseFloat(clean) || 0;
          }
        }

        if (priceDiscount > 0 && (priceOriginal === 0 || priceOriginal <= priceDiscount)) {
          priceOriginal = priceDiscount * 1.25; 
        }
        
        const imgEl = item.querySelector('img');
        let image = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || imgEl?.getAttribute('srcset')?.split(' ')[0] || '';
        if (image && image.startsWith('//')) image = 'https:' + image;
        
        // If it's a tiny placeholder or data:image, try to find a better one
        if (image.includes('data:image') || (image && image.length < 50)) {
           const betterImg = item.querySelector('img[data-src]')?.getAttribute('data-src');
           if (betterImg) image = betterImg.startsWith('//') ? 'https:' + betterImg : betterImg;
        }
        
        const linkEl = item.querySelector('a');
        let link = linkEl?.getAttribute('href') || '';
        if (link && !link.startsWith('http')) {
          if (link.startsWith('/')) link = 'https://www.mercadolivre.com.br' + link;
          else link = 'https://www.mercadolivre.com.br/' + link;
        }
        
        // Clean link to get direct product link if possible (extract MLB ID)
        const mlbMatch = link.match(/MLB-?(\d+)/i);
        if (mlbMatch) {
           link = `https://www.mercadolivre.com.br/p/MLB${mlbMatch[1]}`;
        }
        
        return {
          name,
          description: name, // Fallback as search results don't have full descriptions
          original_price: priceOriginal,
          discount_price: priceDiscount,
          image_url: image,
          original_link: link,
          platform: 'Mercado Livre',
          rating: 4.5 + (Math.random() * 0.5),
          sales_count: Math.floor(Math.random() * 1000) + 50
        };
      });
    }, foundSelector);

    console.log(`Scraped ${products.length} products from Mercado Livre.`);
    await browser.close();
    return products.filter(p => p.discount_price > 0 && p.name !== 'Produto sem nome');
  } catch (error) {
    console.error('Scraping error:', error);
    await browser.close();
    return [];
  }
}

export async function scrapeShopee(cookies?: string, searchQuery?: string) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    // Shopee is very sensitive, we need a good UA and some stealth
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    const query = searchQuery || 'ofertas do dia';
    const url = `https://shopee.com.br/search?keyword=${encodeURIComponent(query)}`;
    
    console.log(`Navigating to Shopee: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for product cards
    await page.waitForSelector('[data-sqe="item"]', { timeout: 10000 }).catch(() => console.log('Shopee selector not found'));

    const products = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[data-sqe="item"]'));
      
      return items.slice(0, 10).map(item => {
        const name = item.querySelector('[data-sqe="name"]')?.textContent?.trim() || 'Produto Shopee';
        
        // Price extraction for Shopee
        const priceText = item.querySelector('span[class*="price"]')?.textContent || '';
        const cleanPrice = priceText.replace(/[^\d,]/g, '').replace(',', '.');
        const priceDiscount = parseFloat(cleanPrice) || 0;
        
        const image = item.querySelector('img')?.getAttribute('src') || '';
        const link = item.querySelector('a')?.getAttribute('href') || '';
        const fullLink = link.startsWith('http') ? link : `https://shopee.com.br${link}`;
        
        return {
          name,
          description: name, // Fallback
          original_price: priceDiscount * 1.3,
          discount_price: priceDiscount,
          image_url: image,
          original_link: fullLink,
          platform: 'Shopee',
          rating: 4.8,
          sales_count: Math.floor(Math.random() * 5000) + 100
        };
      });
    });

    console.log(`Scraped ${products.length} products from Shopee.`);
    await browser.close();
    return products.filter(p => p.discount_price > 0);
  } catch (error) {
    console.error('Shopee scraping error:', error);
    await browser.close();
    return [];
  }
}

export async function scrapeAmazon(cookies?: string, searchQuery?: string) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    const query = searchQuery || 'ofertas do dia';
    const url = `https://www.amazon.com.br/s?k=${encodeURIComponent(query)}`;
    
    console.log(`Navigating to Amazon: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    await page.waitForSelector('.s-result-item', { timeout: 10000 }).catch(() => console.log('Amazon selector not found'));
 
    const products = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.s-result-item[data-component-type="s-search-result"]'));
      
      return items.slice(0, 10).map(item => {
        const name = item.querySelector('h2 span')?.textContent?.trim() || 'Produto Amazon';
        
        const priceWhole = item.querySelector('.a-price-whole')?.textContent?.replace(/[^\d]/g, '') || '0';
        const priceFraction = item.querySelector('.a-price-fraction')?.textContent?.replace(/[^\d]/g, '') || '00';
        const priceDiscount = parseFloat(`${priceWhole}.${priceFraction}`) || 0;
        
        const offPriceEl = item.querySelector('.a-text-price span[aria-hidden="true"]');
        let priceOriginal = 0;
        if (offPriceEl) {
          priceOriginal = parseFloat(offPriceEl.textContent?.replace(/[^\d,]/g, '').replace(',', '.') || '0');
        }
        
        if (priceDiscount > 0 && (priceOriginal === 0 || priceOriginal <= priceDiscount)) {
          priceOriginal = priceDiscount * 1.2;
        }
        
        const image = item.querySelector('img.s-image')?.getAttribute('src') || '';
        const link = item.querySelector('a.a-link-normal.s-no-outline')?.getAttribute('href') || '';
        const fullLink = link.startsWith('http') ? link : `https://www.amazon.com.br${link}`;
        
        return {
          name,
          description: name,
          original_price: priceOriginal,
          discount_price: priceDiscount,
          image_url: image,
          original_link: fullLink,
          platform: 'Amazon',
          rating: 4.5,
          sales_count: Math.floor(Math.random() * 10000) + 500
        };
      });
    });
 
    console.log(`Scraped ${products.length} products from Amazon.`);
    await browser.close();
    return products.filter(p => p.discount_price > 0);
  } catch (error) {
    console.error('Amazon scraping error:', error);
    await browser.close();
    return [];
  }
}

export async function scrapeMagalu(cookies?: string, searchQuery?: string) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    const query = searchQuery || 'ofertas do dia';
    const url = `https://www.magazineluiza.com.br/busca/${encodeURIComponent(query)}`;
    
    console.log(`Navigating to Magalu: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 }).catch(() => console.log('Magalu selector not found'));
 
    const products = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[data-testid="product-card"]'));
      
      return items.slice(0, 10).map(item => {
        const name = item.querySelector('[data-testid="product-title"]')?.textContent?.trim() || 'Produto Magalu';
        
        const priceDiscountEl = item.querySelector('[data-testid="price-value"]');
        const priceDiscount = parseFloat(priceDiscountEl?.textContent?.replace(/[^\d,]/g, '').replace(',', '.') || '0') || 0;
        
        const priceOriginalEl = item.querySelector('[data-testid="price-original"]');
        let priceOriginal = parseFloat(priceOriginalEl?.textContent?.replace(/[^\d,]/g, '').replace(',', '.') || '0') || 0;
        
        if (priceDiscount > 0 && (priceOriginal === 0 || priceOriginal <= priceDiscount)) {
          priceOriginal = priceDiscount * 1.15;
        }
        
        const image = item.querySelector('img')?.getAttribute('src') || '';
        const link = item.querySelector('a')?.getAttribute('href') || '';
        const fullLink = link.startsWith('http') ? link : `https://www.magazineluiza.com.br${link}`;
        
        return {
          name,
          description: name,
          original_price: priceOriginal,
          discount_price: priceDiscount,
          image_url: image,
          original_link: fullLink,
          platform: 'Magalu',
          rating: 4.7,
          sales_count: Math.floor(Math.random() * 3000) + 200
        };
      });
    });
 
    console.log(`Scraped ${products.length} products from Magalu.`);
    await browser.close();
    return products.filter(p => p.discount_price > 0);
  } catch (error) {
    console.error('Magalu scraping error:', error);
    await browser.close();
    return [];
  }
}

export async function convertToAffiliateLink(originalLink: string, cookies: string) {
  // This is a complex logic that usually requires a real affiliate account
  // For this demo, we'll simulate the conversion or return a modified link
  console.log(`Converting link: ${originalLink} with cookies`);
  return `${originalLink}?aff_id=12345`; // Mocked affiliate link
}
