import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  MessageSquare, 
  Copy, 
  Check, 
  RefreshCw,
  Zap,
  Send,
  Smartphone
} from '../components/Icons';

const CopiesPage = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tempCopies, setTempCopies] = useState<any[]>([]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const startEditing = async (productId: number) => {
    setEditingId(productId);
    try {
      const res = await fetch(`/api/products/${productId}/copies`);
      const data = await res.json();
      setTempCopies(data.length > 0 ? data : [{ title: 'Variação 1', content: '' }]);
    } catch (err) {
      setTempCopies([{ title: 'Variação 1', content: '' }]);
    }
  };

  const addVariation = () => {
    setTempCopies([...tempCopies, { title: `Variação ${tempCopies.length + 1}`, content: '' }]);
  };

  const updateVariation = (index: number, content: string) => {
    const newCopies = [...tempCopies];
    newCopies[index].content = content;
    setTempCopies(newCopies);
  };

  const removeVariation = (index: number) => {
    setTempCopies(tempCopies.filter((_, i) => i !== index));
  };

  const saveCopies = async () => {
    if (editingId === null) return;
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/products/${editingId}/copies`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tempCopies)
      });
      if (res.ok) {
        setSaveStatus('success');
        setTimeout(() => {
          setSaveStatus(null);
          setEditingId(null);
        }, 2000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      setSaveStatus('error');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Copies & Criativos</h2>
          <p className="text-zinc-400 text-sm sm:text-base">Gerencie as variações de texto para cada produto.</p>
        </div>
        <button 
          onClick={fetchProducts}
          className="bg-zinc-900 hover:bg-zinc-800 text-white p-3 rounded-xl border border-zinc-800 transition-all self-end sm:self-auto"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw className="animate-spin text-yellow-400" size={32} />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 sm:p-12 text-center">
          <MessageSquare className="mx-auto text-zinc-700 mb-4" size={48} />
          <p className="text-zinc-500">Nenhum produto encontrado. Busque produtos primeiro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
              <div className="p-6 flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-48 h-48 bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 flex-shrink-0">
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-white">{product.name}</h3>
                      <p className="text-yellow-400 font-bold">R$ {product.discount_price.toFixed(2)}</p>
                    </div>
                    <button 
                      onClick={() => editingId === product.id ? setEditingId(null) : startEditing(product.id)}
                      className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${editingId === product.id ? 'bg-zinc-800 text-white' : 'bg-yellow-400 text-black'}`}
                    >
                      {editingId === product.id ? 'Cancelar' : 'Gerenciar Copies'}
                    </button>
                  </div>

                  {editingId === product.id ? (
                    <div className="space-y-6 mt-4 pt-4 border-t border-zinc-800">
                      {tempCopies.map((copy, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Variação {idx + 1}</label>
                            <button onClick={() => removeVariation(idx)} className="text-rose-500 hover:text-rose-400 text-[10px] font-bold uppercase">Remover</button>
                          </div>
                          <textarea 
                            value={copy.content}
                            onChange={(e) => updateVariation(idx, e.target.value)}
                            placeholder="Digite a copy aqui... Use {name}, {price} e {link} como variáveis."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-zinc-300 text-sm h-32 outline-none focus:border-yellow-400/50 transition-all font-mono"
                          />
                        </div>
                      ))}
                      <div className="flex gap-4">
                        <button 
                          onClick={addVariation}
                          className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-sm transition-all"
                        >
                          + Adicionar Variação
                        </button>
                        <button 
                          onClick={saveCopies}
                          disabled={saveStatus === 'saving'}
                          className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                        >
                          {saveStatus === 'saving' ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                          {saveStatus === 'saving' ? 'Salvando...' : saveStatus === 'success' ? 'Salvo!' : 'Salvar Todas'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                      <p className="text-xs text-zinc-500 italic">Clique em "Gerenciar Copies" para adicionar variações de texto para este produto.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CopiesPage;
