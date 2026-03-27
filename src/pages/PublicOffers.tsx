import React, { useState, useEffect } from 'react';
import { Zap, ExternalLink, ShoppingCart, TrendingUp, Copy } from '../components/Icons';

const PublicOffers = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/public/products');
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const shareOnWhatsApp = (product: any) => {
    if (product.first_copy) {
      window.open(`https://wa.me/?text=${encodeURIComponent(product.first_copy)}`, '_blank');
      return;
    }
    
    const originalPrice = (product.original_price || 0).toFixed(2);
    const discountPrice = (product.discount_price || 0).toFixed(2);
    const text = `🔥 *OFERTA IMPERDÍVEL!* 🔥\n\n📦 *${product.name}*\n\n💰 De: ~~R$ ${originalPrice}~~\n✅ Por: *R$ ${discountPrice}*\n\n🔗 Compre aqui: ${product.affiliate_link || product.original_link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Removed alert as it's blocked in iframes
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-yellow-400 selection:text-black">
      {/* Hero */}
      <div className="bg-zinc-950 border-b border-zinc-900 py-12 sm:py-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full text-yellow-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
            <Zap size={14} fill="currentColor" />
            Ofertas Atualizadas Agora
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase italic leading-none">
            AFILIAUTO <span className="text-yellow-400">PRO</span>
          </h1>
          <p className="text-zinc-400 text-base sm:text-xl max-w-xl mx-auto leading-relaxed">
            As melhores ofertas da Shopee e Mercado Livre selecionadas automaticamente para você.
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto p-4 sm:p-8 md:p-12">
        {loading ? (
          <div className="text-center py-20 text-zinc-500 font-bold uppercase tracking-widest animate-pulse">
            Buscando as melhores ofertas...
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            Nenhuma oferta disponível no momento. Volte mais tarde!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((p) => (
              <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden flex flex-col group hover:border-yellow-400/50 transition-all duration-500">
                <div className="aspect-square relative overflow-hidden bg-white">
                  <img 
                    src={p.image_url} 
                    alt={p.name} 
                    className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 right-4 bg-emerald-500 text-black font-black px-3 py-1 rounded-full text-sm shadow-xl">
                    {p.original_price > 0 ? `-${Math.round((1 - p.discount_price / p.original_price) * 100)}% OFF` : 'OFERTA'}
                  </div>
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-white/10">
                    {p.platform}
                  </div>
                </div>

                <div className="p-8 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-white line-clamp-2 mb-4 leading-tight group-hover:text-yellow-400 transition-colors">
                    {p.name}
                  </h3>
                  
                  <div className="mt-auto space-y-6">
                    <div className="flex items-end gap-3">
                      <div>
                        <p className="text-zinc-500 text-sm line-through font-medium">R$ {(p.original_price || 0).toFixed(2)}</p>
                        <p className="text-3xl font-black text-white">R$ {(p.discount_price || 0).toFixed(2)}</p>
                      </div>
                      <div className="mb-1">
                        <div className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                          <TrendingUp size={14} />
                          {p.sales_count}+ vendidos
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <a 
                        href={p.affiliate_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-yellow-400 hover:bg-yellow-500 text-black py-4 rounded-2xl font-black text-center flex items-center justify-center gap-3 transition-all uppercase tracking-tighter shadow-xl shadow-yellow-400/10 active:scale-95 text-sm"
                      >
                        <ShoppingCart size={18} fill="currentColor" />
                        Comprar
                      </a>
                      <button 
                        onClick={() => shareOnWhatsApp(p)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-black py-4 rounded-2xl font-black text-center flex items-center justify-center gap-3 transition-all uppercase tracking-tighter shadow-xl shadow-emerald-500/10 active:scale-95 text-sm"
                      >
                        <Zap size={18} fill="currentColor" />
                        Zap
                      </button>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(p.affiliate_link)}
                      className="mt-3 w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all text-sm"
                    >
                      <Copy size={16} />
                      Copiar Link
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12 px-6 text-center">
        <p className="text-zinc-600 text-sm font-bold uppercase tracking-widest">
          &copy; 2026 AFILIAUTO PRO - Automação de Ofertas
        </p>
      </footer>
    </div>
  );
};

export default PublicOffers;
