import React, { useState, useEffect } from 'react';
import { 
  Package, 
  ExternalLink, 
  Trash2, 
  RefreshCw, 
  Search,
  Filter,
  Zap,
  Copy,
  MessageSquare,
  X,
  Sparkles
} from '../components/Icons';
import { generateProductCopy } from '../services/aiService';
import { useAuth } from '../contexts/AuthContext';
import { Product, Copy as ProductCopy } from '../types';

const ProductsPage = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [copies, setCopies] = useState<ProductCopy[]>([]);
  const [loadingCopies, setLoadingCopies] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data) {
        let filtered = data;
        if (debouncedSearch) {
          filtered = filtered.filter((p: any) => 
            p.name.toLowerCase().includes(debouncedSearch.toLowerCase())
          );
        }
        if (priceFilter) {
          filtered = filtered.filter((p: any) => p.discount_price === parseFloat(priceFilter));
        }
        setProducts(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [debouncedSearch, priceFilter]);

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const clearProducts = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/products', { method: 'DELETE' });
      if (response.ok) {
        setProducts([]);
        setShowDeleteConfirm(false);
      } else {
        const data = await response.json();
        console.error('Failed to clear products:', data.error);
      }
    } catch (err) {
      console.error('Failed to clear products:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const replacePlaceholders = (text: string, product: any) => {
    if (!text || !product) return '';
    const originalPrice = (product.original_price || 0).toFixed(2);
    const discountPrice = (product.discount_price || 0).toFixed(2);
    const trackingLink = `${window.location.origin}/l/${product.id}`;

    return text
      .split('{name}').join(product.name || 'Produto')
      .split('{valor original}').join(originalPrice)
      .split('{valor com desconto}').join(discountPrice)
      .split('{price}').join(discountPrice)
      .split('{original_price}').join(originalPrice)
      .split('{link}').join(trackingLink)
      .split('{direct_link}').join(product.affiliate_link || trackingLink);
  };

  const shareOnWhatsApp = (product: any) => {
    if (product.first_copy) {
      const finalCopy = replacePlaceholders(product.first_copy, product);
      window.open(`https://wa.me/?text=${encodeURIComponent(finalCopy)}`, '_blank');
      return;
    }

    const originalPrice = (product.original_price || 0).toFixed(2);
    const discountPrice = (product.discount_price || 0).toFixed(2);
    const trackingLink = `${window.location.origin}/l/${product.id}`;
    const text = `🔥 *OFERTA IMPERDÍVEL!* 🔥\n\n📦 *${product.name}*\n\n💰 De: ~~R$ ${originalPrice}~~\n✅ Por: *R$ ${discountPrice}*\n\n🔗 Compre aqui: ${trackingLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Removed alert as it's blocked in iframes
  };

  const triggerAutomation = async () => {
    setTriggering(true);
    try {
      await fetch('/api/automation/trigger', { 
        method: 'POST'
      });
      await fetchProducts();
    } catch (err) {
      console.error(err);
    } finally {
      setTriggering(false);
    }
  };

  const openCopiesModal = async (product: any) => {
    setSelectedProduct(product);
    setLoadingCopies(true);
    try {
      const res = await fetch(`/api/copies/${product.id}`);
      const data = await res.json();
      setCopies(data || []);
      
      // If no copies exist, generate them automatically
      if (!data || data.length === 0) {
        handleGenerateCopies(product);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCopies(false);
    }
  };

  const handleGenerateCopies = async (product: any) => {
    setGenerating(true);
    try {
      const newCopies = await generateProductCopy(product);
      const formattedCopies = newCopies.map((c: any, i: number) => ({ ...c, variation: i + 1, product_id: product.id }));
      setCopies(formattedCopies);
      
      // Save to API
      await fetch(`/api/copies/${product.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedCopies)
      });
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const postCopy = async (product: any, content: string) => {
    const finalContent = replacePlaceholders(content, product);

    try {
      const res = await fetch('/api/telegram/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: finalContent })
      });
      if (res.ok) {
        // Removed alert as it's blocked in iframes
      } else {
        const data = await res.json();
        console.error(`Erro ao postar: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Produtos</h2>
          <p className="text-zinc-400 text-sm md:text-base">Gerencie e visualize os produtos capturados pelo sistema.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto items-center">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2 bg-rose-500/10 p-1.5 rounded-xl border border-rose-500/20 animate-in fade-in zoom-in duration-200">
              <span className="text-xs text-rose-500 font-medium px-2">Apagar tudo?</span>
              <button
                onClick={clearProducts}
                disabled={isDeleting}
                className="bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-600 disabled:opacity-50 transition-all"
              >
                {isDeleting ? '...' : 'Sim'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-zinc-700 transition-all"
              >
                Não
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-shrink-0 bg-zinc-900 hover:bg-zinc-800 text-rose-500 p-3 rounded-xl border border-zinc-800 transition-all"
              title="Limpar todos os produtos"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button 
            onClick={fetchProducts}
            className="flex-shrink-0 bg-zinc-900 hover:bg-zinc-800 text-white p-3 rounded-xl border border-zinc-800 transition-all"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={triggerAutomation}
            disabled={triggering}
            className="flex-1 md:flex-none bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Zap size={18} fill="currentColor" />
            {triggering ? 'Processando...' : 'Buscar Novos'}
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou descrição..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 outline-none focus:border-yellow-400/50 transition-all text-sm"
          />
        </div>
        <div className="relative w-full sm:w-48">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">R$</span>
          <input 
            type="number" 
            placeholder="Preço exato" 
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 outline-none focus:border-yellow-400/50 transition-all text-sm"
          />
        </div>
        <button className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-6 py-3 rounded-2xl flex items-center justify-center gap-2 hover:text-white transition-all text-sm">
          <Filter size={18} />
          Mais Filtros
        </button>
      </div>

      {/* Products Table / Cards */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <table className="hidden md:table w-full text-left border-collapse">
            <thead>
              <tr className="border-bottom border-zinc-800 bg-zinc-950/50">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Produto</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Plataforma</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Preço</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Desconto</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">Carregando produtos...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">Nenhum produto encontrado.</td>
                </tr>
              ) : products.map((product) => (
                <tr key={product.id} className="hover:bg-zinc-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium line-clamp-1">{product.name}</p>
                        <p className="text-xs text-zinc-500">ID: #{product.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-zinc-800 text-zinc-300 text-xs font-bold rounded-lg border border-zinc-700">
                      {product.platform}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <p className="text-zinc-500 line-through">R$ {(product.original_price || 0).toFixed(2)}</p>
                      <p className="text-white font-bold">R$ {(product.discount_price || 0).toFixed(2)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-emerald-500 font-bold text-sm">
                      {product.original_price > 0 ? `-${Math.round((1 - product.discount_price / product.original_price) * 100)}%` : 'OFERTA'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openCopiesModal(product)}
                        className="p-2 bg-zinc-800 hover:bg-yellow-400 hover:text-black text-yellow-400 rounded-lg transition-all"
                        title="Ver Copies de IA"
                      >
                        <MessageSquare size={16} />
                      </button>
                      <button 
                        onClick={() => shareOnWhatsApp(product)}
                        className="p-2 bg-zinc-800 hover:bg-emerald-500 hover:text-white text-emerald-500 rounded-lg transition-all"
                        title="Compartilhar no WhatsApp"
                      >
                        <Zap size={16} />
                      </button>
                      <button 
                        onClick={() => copyToClipboard(product.affiliate_link)}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg transition-all"
                        title="Copiar Link de Afiliado"
                      >
                        <Copy size={16} />
                      </button>
                      <a 
                        href={product.affiliate_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 bg-zinc-800 hover:bg-yellow-400 hover:text-black text-zinc-400 rounded-lg transition-all"
                      >
                        <ExternalLink size={16} />
                      </a>
                      <button className="p-2 bg-zinc-800 hover:bg-red-500/20 hover:text-red-500 text-zinc-400 rounded-lg transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-zinc-800">
            {loading ? (
              <div className="px-6 py-12 text-center text-zinc-500">Carregando produtos...</div>
            ) : products.length === 0 ? (
              <div className="px-6 py-12 text-center text-zinc-500">Nenhum produto encontrado.</div>
            ) : products.map((product) => (
              <div key={product.id} className="p-4 space-y-4">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-white font-bold text-sm line-clamp-2">{product.name}</p>
                      <span className="flex-shrink-0 text-emerald-500 font-bold text-xs">
                        {product.original_price > 0 ? `-${Math.round((1 - product.discount_price / product.original_price) * 100)}%` : 'OFERTA'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        {product.platform}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm">
                    <p className="text-zinc-500 line-through text-xs">R$ {(product.original_price || 0).toFixed(2)}</p>
                    <p className="text-white font-black text-lg">R$ {(product.discount_price || 0).toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openCopiesModal(product)}
                      className="p-3 bg-zinc-800 text-yellow-400 rounded-xl"
                    >
                      <MessageSquare size={18} />
                    </button>
                    <button 
                      onClick={() => shareOnWhatsApp(product)}
                      className="p-3 bg-zinc-800 text-emerald-500 rounded-xl"
                    >
                      <Zap size={18} />
                    </button>
                    <button 
                      onClick={() => copyToClipboard(product.affiliate_link)}
                      className="p-3 bg-zinc-800 text-zinc-300 rounded-xl"
                      title="Copiar Link"
                    >
                      <Copy size={18} />
                    </button>
                    <a 
                      href={product.affiliate_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 bg-zinc-800 text-zinc-300 rounded-xl"
                    >
                      <ExternalLink size={18} />
                    </a>
                    <button className="p-3 bg-zinc-800 text-zinc-300 rounded-xl">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Copies Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-xl overflow-hidden flex-shrink-0 border border-zinc-800">
                  <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Copies de IA</h3>
                  <p className="text-zinc-400 text-sm line-clamp-1">{selectedProduct.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedProduct(null)}
                className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {loadingCopies || generating ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin"></div>
                  <p className="text-zinc-400 animate-pulse">
                    {generating ? 'Gemini está criando copies persuasivas...' : 'Carregando copies...'}
                  </p>
                </div>
              ) : copies.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <p className="text-zinc-500">Nenhuma copy gerada para este produto.</p>
                  <button 
                    onClick={() => handleGenerateCopies(selectedProduct)}
                    className="bg-yellow-400 text-black px-6 py-2 rounded-xl font-bold flex items-center gap-2 mx-auto"
                  >
                    <Sparkles size={18} />
                    Gerar agora
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {copies.map((copy, idx) => (
                    <div key={idx} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-yellow-400 uppercase tracking-widest">Variação {copy.variation || idx + 1}</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => copyToClipboard(copy.content)}
                            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all"
                            title="Copiar texto"
                          >
                            <Copy size={16} />
                          </button>
                          <button 
                            onClick={() => postCopy(selectedProduct, copy.content)}
                            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-emerald-500 transition-all"
                            title="Postar no Telegram"
                          >
                            <Zap size={16} />
                          </button>
                        </div>
                      </div>
                      <h4 className="text-white font-bold">{copy.title}</h4>
                      <pre className="text-zinc-400 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                        {replacePlaceholders(copy.content, selectedProduct)}
                      </pre>
                    </div>
                  ))}
                  
                  <button 
                    onClick={() => handleGenerateCopies(selectedProduct)}
                    className="w-full py-4 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 hover:text-yellow-400 hover:border-yellow-400/50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <RefreshCw size={16} />
                    Regerar variações com IA
                  </button>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-zinc-800 bg-zinc-950/50">
              <button 
                onClick={() => setSelectedProduct(null)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-bold transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
