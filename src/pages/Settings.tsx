import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Settings as SettingsIcon, 
  Zap, 
  Smartphone, 
  Send, 
  Shield, 
  Database,
  Save,
  Check,
  AlertCircle,
  MessageCircle
} from '../components/Icons';

const SettingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'general';
  
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [settings, setSettings] = useState({
    admin_email: 'admin@afiliauto.pro',
    affiliate_cookies: '',
    shopee_affiliate_id: '',
    shopee_link_template: '{link}?aff_id={affiliate_id}',
    shopee_active: 'true',
    mercadolivre_affiliate_id: '',
    mercadolivre_link_template: '{link}?utm_source=affiliate&utm_medium=referral&utm_campaign={affiliate_id}',
    mercadolivre_active: 'true',
    amazon_affiliate_id: '',
    amazon_link_template: '{link}?tag={affiliate_id}',
    amazon_active: 'false',
    magalu_affiliate_id: '',
    magalu_link_template: 'https://www.magazinevoce.com.br/magazine{affiliate_id}/p/{link}',
    magalu_active: 'false',
    telegram_token: '',
    telegram_chat_id: '',
    whatsapp_active: 'false',
    whatsapp_chat_id: '',
    automation_interval: '2',
    automation_limit: '5',
    automation_start_time: '08:00',
    automation_end_time: '22:00',
    notify_telegram_success: 'false',
    notify_telegram_failure: 'false',
    notify_whatsapp_success: 'false',
    notify_whatsapp_failure: 'false',
    telegram_notification_chat_id: '',
    whatsapp_notification_chat_id: '',
    app_url: '',
    last_automation_run: '',
    automation_last_status: '',
    automation_last_error: '',
  });

  const [waStatus, setWaStatus] = useState<{ status: string, qr: string | null, error: string | null }>({ status: 'close', qr: null, error: null });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      }
    };
    fetchSettings();

    const fetchWaStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/status');
        const data = await res.json();
        setWaStatus(data);
      } catch (err) {
        console.error('Failed to fetch WA status:', err);
      }
    };
    fetchWaStatus();
    const interval = setInterval(fetchWaStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const connectWhatsApp = async () => {
    try {
      await fetch('/api/whatsapp/connect', { method: 'POST' });
    } catch (err) {
      console.error('Failed to connect WA:', err);
    }
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const resetWhatsApp = async () => {
    setIsResetting(true);
    try {
      await fetch('/api/whatsapp/reset', { method: 'POST' });
      setShowResetConfirm(false);
      // alert('Sessão resetada. Aguarde o novo QR Code.');
    } catch (err) {
      console.error('Failed to reset WA:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [waTestStatus, setWaTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const handleTestTelegram = async () => {
    if (!settings.telegram_token || !settings.telegram_chat_id) {
      // Removed alert as it's blocked in iframes
      return;
    }
    setTestStatus('testing');
    try {
      const res = await fetch('/api/settings/test-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: settings.telegram_token, chatId: settings.telegram_chat_id })
      });
      if (res.ok) {
        setTestStatus('success');
        setTimeout(() => setTestStatus('idle'), 3000);
      } else {
        setTestStatus('error');
        setTimeout(() => setTestStatus('idle'), 3000);
      }
    } catch (err) {
      console.error('Telegram test failed:', err);
      setTestStatus('error');
      setTimeout(() => setTestStatus('idle'), 3000);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!settings.whatsapp_chat_id) {
      // Removed alert as it's blocked in iframes
      return;
    }
    setWaTestStatus('testing');
    try {
      const res = await fetch('/api/whatsapp/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '✅ AFILIAUTO PRO: Teste de conexão WhatsApp bem-sucedido!' })
      });
      if (res.ok) {
        setWaTestStatus('success');
        setTimeout(() => setWaTestStatus('idle'), 3000);
      } else {
        setWaTestStatus('error');
        setTimeout(() => setWaTestStatus('idle'), 3000);
      }
    } catch (err) {
      console.error('WhatsApp test failed:', err);
      setWaTestStatus('error');
      setTimeout(() => setWaTestStatus('idle'), 3000);
    }
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSaveStatus('error');
    }
  };

  const tabs = [
    { id: 'general', label: 'Geral', icon: <SettingsIcon size={18} /> },
    { id: 'affiliate', label: 'Afiliado', icon: <Zap size={18} /> },
    { id: 'automation', label: 'Automação', icon: <Smartphone size={18} /> },
    { id: 'telegram', label: 'Telegram', icon: <Send size={18} /> },
    { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={18} /> },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Configurações</h2>
          <p className="text-zinc-400 text-sm sm:text-base">Ajuste os parâmetros do sistema e integrações.</p>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
        {/* Tabs Sidebar */}
        <div className="w-full lg:w-64 flex lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 gap-1 no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-zinc-900 text-yellow-400 border border-zinc-800' 
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
              }`}
            >
              {tab.icon}
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Shield className="text-yellow-400" size={20} />
                Segurança e Acesso
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase">E-mail do Administrador</label>
                  <input 
                    type="email" 
                    value={settings.admin_email || ''} 
                    onChange={e => setSettings({...settings, admin_email: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-yellow-400/50 transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase">Nova Senha</label>
                  <input type="password" placeholder="••••••••" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-yellow-400/50 transition-all" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-zinc-500 uppercase">URL da Aplicação (Obrigatório para Links)</label>
                    <button 
                      onClick={() => setSettings({...settings, app_url: window.location.origin})}
                      className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded-md transition-colors font-bold uppercase"
                    >
                      Auto-detectar
                    </button>
                  </div>
                  <input 
                    type="url" 
                    value={settings.app_url || ''} 
                    onChange={e => setSettings({...settings, app_url: e.target.value})}
                    placeholder="https://sua-app.run.app"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-yellow-400/50 transition-all" 
                  />
                  <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Essa URL é usada para gerar os links de rastreamento (Super Links) que abrem no WhatsApp.</p>
                  <p className="text-[10px] text-red-500/70 font-bold uppercase tracking-widest mt-1">
                    Nota: No ambiente de visualização do AI Studio, links externos podem retornar erro 403 (PolicyAgent) se você não estiver logado no navegador onde o link abrir. Use a URL de Compartilhamento (Shared App URL) para testes externos.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'affiliate' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Zap className="text-yellow-400" size={20} />
                Parâmetros de Afiliado
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase">Cookies Shopee / Mercado Livre</label>
                  <textarea 
                    rows={4} 
                    value={settings.affiliate_cookies || ''}
                    onChange={e => setSettings({...settings, affiliate_cookies: e.target.value})}
                    placeholder="Cole aqui os cookies da sua sessão para automação de links..." 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-yellow-400/50 transition-all font-mono text-xs"
                  ></textarea>
                  <p className="text-xs text-zinc-600">Esses cookies são usados pelo Puppeteer para gerar seus links de afiliado automaticamente.</p>
                </div>
                <div className="space-y-6">
                  {[
                    { id: 'shopee', name: 'Shopee', color: 'text-orange-500' },
                    { id: 'mercadolivre', name: 'Mercado Livre', color: 'text-yellow-400' },
                    { id: 'amazon', name: 'Amazon', color: 'text-blue-400' },
                    { id: 'magalu', name: 'Magalu', color: 'text-blue-600' }
                  ].map((platform) => (
                    <div key={platform.id} className="p-6 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full bg-current ${platform.color}`}></div>
                          <h4 className="font-bold text-white uppercase tracking-wider">{platform.name}</h4>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={(settings as any)[`${platform.id}_active`] === 'true'} 
                            onChange={e => setSettings({...settings, [`${platform.id}_active`]: e.target.checked ? 'true' : 'false'})}
                            className="accent-yellow-400 w-4 h-4" 
                          />
                          <span className="text-xs text-zinc-500 font-bold uppercase">Ativo</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase">
                            {platform.id === 'mercadolivre' ? 'ID de Afiliado (matt_tool)' : 'ID de Afiliado'}
                          </label>
                          <input 
                            type="text" 
                            value={(settings as any)[`${platform.id}_affiliate_id`] || ''}
                            onChange={e => setSettings({...settings, [`${platform.id}_affiliate_id`]: e.target.value})}
                            placeholder={platform.id === 'mercadolivre' ? 'Ex: 89115086' : 'Seu ID de afiliado'} 
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-yellow-400/50 transition-all text-sm" 
                          />
                        </div>
                        {platform.id === 'mercadolivre' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">ID de Afiliado 2 (matt_word)</label>
                            <input 
                              type="text" 
                              value={(settings as any)[`${platform.id}_affiliate_id_2`] || ''}
                              onChange={e => setSettings({...settings, [`${platform.id}_affiliate_id_2`]: e.target.value})}
                              placeholder="Ex: sagy2775064" 
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-yellow-400/50 transition-all text-sm" 
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Template de Link</label>
                            <button 
                              onClick={() => {
                                const template = (settings as any)[`${platform.id}_link_template`] || '';
                                const affId = (settings as any)[`${platform.id}_affiliate_id`] || 'ID_TESTE';
                                const affId2 = (settings as any)[`${platform.id}_affiliate_id_2`] || 'ID_TESTE_2';
                                const testUrl = platform.id === 'shopee' ? 'https://shopee.com.br/product/123/456' : 
                                               platform.id === 'mercadolivre' ? 'https://www.mercadolivre.com.br/p/MLB123' :
                                               platform.id === 'amazon' ? 'https://www.amazon.com.br/dp/B09B8V1LZ3' :
                                               'https://www.magazineluiza.com.br/p/123';
                                const result = template
                                  .replace(/{link}/g, testUrl)
                                  .replace(/{encoded_link}/g, encodeURIComponent(testUrl))
                                  .replace(/{full_link}/g, testUrl)
                                  .replace(/{encoded_full_link}/g, encodeURIComponent(testUrl))
                                  .replace(/{affiliate_id}/g, affId)
                                  .replace(/{affiliate_id_2}/g, affId2);
                                // Removed alert as it's blocked in iframes
                              }}
                              className="text-[10px] text-yellow-400 hover:underline font-bold uppercase"
                            >
                              Testar
                            </button>
                          </div>
                          <input 
                            type="text" 
                            value={(settings as any)[`${platform.id}_link_template`] || ''}
                            onChange={e => setSettings({...settings, [`${platform.id}_link_template`]: e.target.value})}
                            placeholder="{link}?aff_id={affiliate_id}" 
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-yellow-400/50 transition-all font-mono text-xs" 
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-6 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm">Testar Conversão de Link</h4>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">Simulador</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select 
                      id="test-platform-select"
                      className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white text-sm outline-none focus:border-yellow-400/50 transition-all"
                    >
                      <option value="shopee">Shopee</option>
                      <option value="mercadolivre">Mercado Livre</option>
                      <option value="amazon">Amazon</option>
                      <option value="magalu">Magalu</option>
                    </select>
                    <input 
                      type="text" 
                      placeholder="Cole um link original aqui..." 
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white text-sm outline-none focus:border-yellow-400/50 transition-all font-mono"
                      id="test-link-input"
                    />
                    <button 
                      onClick={() => {
                        const input = document.getElementById('test-link-input') as HTMLInputElement;
                        const platform = (document.getElementById('test-platform-select') as HTMLSelectElement).value;
                        if (!input.value) return;
                        const fullLink = input.value;
                        const cleanLink = input.value.split('?')[0];
                        const template = (settings as any)[`${platform}_link_template`];
                        const affId = (settings as any)[`${platform}_affiliate_id`];
                        
                        const result = template
                          .replace(/{link}/g, cleanLink)
                          .replace(/{encoded_link}/g, encodeURIComponent(cleanLink))
                          .replace(/{full_link}/g, fullLink)
                          .replace(/{encoded_full_link}/g, encodeURIComponent(fullLink))
                          .replace(/{affiliate_id}/g, affId)
                          .replace(/{affiliate_id_2}/g, (settings as any)[`${platform}_affiliate_id_2`] || '');
                        // Removed alert as it's blocked in iframes
                      }}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap"
                    >
                      Converter Link
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-600 italic">Este simulador usa o template configurado acima para a plataforma selecionada.</p>
                </div>

                <div className="p-6 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-4">
                  <h4 className="font-bold text-white text-sm uppercase tracking-wider">Variáveis Disponíveis</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <code className="text-[10px] text-yellow-400 font-bold">{"{link}"}</code>
                      <p className="text-[10px] text-zinc-500">URL original limpa (sem parâmetros).</p>
                    </div>
                    <div className="space-y-1">
                      <code className="text-[10px] text-yellow-400 font-bold">{"{encoded_link}"}</code>
                      <p className="text-[10px] text-zinc-500">URL original limpa e codificada para parâmetros.</p>
                    </div>
                    <div className="space-y-1">
                      <code className="text-[10px] text-yellow-400 font-bold">{"{full_link}"}</code>
                      <p className="text-[10px] text-zinc-500">URL original completa com parâmetros.</p>
                    </div>
                    <div className="space-y-1">
                      <code className="text-[10px] text-yellow-400 font-bold">{"{encoded_full_link}"}</code>
                      <p className="text-[10px] text-zinc-500">URL original completa e codificada.</p>
                    </div>
                    <div className="space-y-1">
                      <code className="text-[10px] text-yellow-400 font-bold">{"{affiliate_id}"}</code>
                      <p className="text-[10px] text-zinc-500">Seu ID de Afiliado principal.</p>
                    </div>
                    <div className="space-y-1">
                      <code className="text-[10px] text-yellow-400 font-bold">{"{affiliate_id_2}"}</code>
                      <p className="text-[10px] text-zinc-500">Seu segundo ID de Afiliado (ex: matt_word no ML).</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'automation' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Smartphone className="text-yellow-400" size={20} />
                Configurações de Automação
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase">Intervalo de Busca (Horas)</label>
                    <input 
                      type="number" 
                      value={settings.automation_interval || ''}
                      onChange={e => setSettings({...settings, automation_interval: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-yellow-400/50 transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase">Limite de Produtos por Busca</label>
                    <input 
                      type="number" 
                      value={settings.automation_limit || ''}
                      onChange={e => setSettings({...settings, automation_limit: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-yellow-400/50 transition-all" 
                    />
                  </div>
                </div>

                <div className="p-6 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-6">
                  <h4 className="font-bold text-white flex items-center gap-2">
                    <SettingsIcon size={16} className="text-yellow-400" />
                    Horário de Funcionamento
                  </h4>
                  <p className="text-xs text-zinc-500">Defina o período do dia em que a automação deve ser executada. Para 24/7, use 00:00 às 23:59.</p>
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-4">
                    <p className="text-[10px] text-emerald-500 font-bold uppercase">Automação em Nuvem</p>
                    <p className="text-[10px] text-zinc-400">O sistema roda no servidor. A automação continuará mesmo com seu computador desligado ou navegador fechado.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-500 uppercase">Horário de Início</label>
                      <input 
                        type="time" 
                        value={settings.automation_start_time || ''}
                        onChange={e => setSettings({...settings, automation_start_time: e.target.value})}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-yellow-400/50 transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-500 uppercase">Horário de Término</label>
                      <input 
                        type="time" 
                        value={settings.automation_end_time || ''}
                        onChange={e => setSettings({...settings, automation_end_time: e.target.value})}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-yellow-400/50 transition-all" 
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-6">
                  <h4 className="font-bold text-white flex items-center gap-2">
                    <AlertCircle size={16} className="text-yellow-400" />
                    Notificações de Status
                  </h4>
                  <p className="text-xs text-zinc-500">Receba alertas quando a automação for concluída ou encontrar erros.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Telegram Notifications */}
                    <div className="space-y-4">
                      <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Send size={14} /> Telegram
                      </h5>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl cursor-pointer hover:bg-zinc-900 transition-all">
                          <input 
                            type="checkbox" 
                            checked={settings.notify_telegram_success === 'true'}
                            onChange={e => setSettings({...settings, notify_telegram_success: e.target.checked ? 'true' : 'false'})}
                            className="accent-yellow-400 w-4 h-4" 
                          />
                          <span className="text-sm text-zinc-300">Notificar Sucesso</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl cursor-pointer hover:bg-zinc-900 transition-all">
                          <input 
                            type="checkbox" 
                            checked={settings.notify_telegram_failure === 'true'}
                            onChange={e => setSettings({...settings, notify_telegram_failure: e.target.checked ? 'true' : 'false'})}
                            className="accent-yellow-400 w-4 h-4" 
                          />
                          <span className="text-sm text-zinc-300">Notificar Falha</span>
                        </label>
                      </div>
                      <div className="space-y-2 mt-4">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Chat ID de Notificação</label>
                        <input 
                          type="text" 
                          value={settings.telegram_notification_chat_id || ''}
                          onChange={e => setSettings({...settings, telegram_notification_chat_id: e.target.value})}
                          placeholder="ID específico para avisos..." 
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:border-yellow-400/50 transition-all text-xs" 
                        />
                        <p className="text-[10px] text-zinc-600 italic">Se vazio, usará o chat ID principal.</p>
                      </div>
                    </div>

                    {/* WhatsApp Notifications */}
                    <div className="space-y-4">
                      <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <MessageCircle size={14} /> WhatsApp
                      </h5>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl cursor-pointer hover:bg-zinc-900 transition-all">
                          <input 
                            type="checkbox" 
                            checked={settings.notify_whatsapp_success === 'true'}
                            onChange={e => setSettings({...settings, notify_whatsapp_success: e.target.checked ? 'true' : 'false'})}
                            className="accent-emerald-500 w-4 h-4" 
                          />
                          <span className="text-sm text-zinc-300">Notificar Sucesso</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl cursor-pointer hover:bg-zinc-900 transition-all">
                          <input 
                            type="checkbox" 
                            checked={settings.notify_whatsapp_failure === 'true'}
                            onChange={e => setSettings({...settings, notify_whatsapp_failure: e.target.checked ? 'true' : 'false'})}
                            className="accent-emerald-500 w-4 h-4" 
                          />
                          <span className="text-sm text-zinc-300">Notificar Falha</span>
                        </label>
                      </div>
                      <div className="space-y-2 mt-4">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Chat ID de Notificação</label>
                        <input 
                          type="text" 
                          value={settings.whatsapp_notification_chat_id || ''}
                          onChange={e => setSettings({...settings, whatsapp_notification_chat_id: e.target.value})}
                          placeholder="ID/Número específico para avisos..." 
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:border-emerald-500/50 transition-all text-xs" 
                        />
                        <p className="text-[10px] text-zinc-600 italic">Se vazio, usará o chat ID principal.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-4">
                  <h4 className="font-bold text-white">Status do Sistema</h4>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Última execução:</span>
                    <span className="text-white font-mono">
                      {settings.last_automation_run ? new Date(settings.last_automation_run).toLocaleString('pt-BR') : 'Nunca'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Status:</span>
                    <span className={`font-bold uppercase text-[10px] ${
                      settings.automation_last_status === 'success' ? 'text-emerald-500' : 
                      settings.automation_last_status === 'error' ? 'text-rose-500' : 
                      'text-yellow-400'
                    }`}>
                      {settings.automation_last_status || 'Aguardando'}
                    </span>
                  </div>
                  {settings.automation_last_error && (
                    <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                      <p className="text-[10px] text-rose-500 font-mono break-all">{settings.automation_last_error}</p>
                    </div>
                  )}
                  <div className="pt-4 border-t border-zinc-800 flex gap-3">
                    <button 
                      onClick={() => {}}
                      className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Reiniciar Ciclo
                    </button>
                    <button 
                      onClick={async () => {
                        const res = await fetch('/api/automation/trigger', { method: 'POST' });
                        const data = await res.json();
                        // Removed alert as it's blocked in iframes
                      }}
                      className="flex-1 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-xl text-xs font-bold transition-all"
                    >
                      Executar Agora
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'telegram' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Send className="text-yellow-400" size={20} />
                Integração Telegram
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase">Bot Token (BotFather)</label>
                  <input 
                    type="password" 
                    value={settings.telegram_token || ''}
                    onChange={e => setSettings({...settings, telegram_token: e.target.value})}
                    placeholder="0000000000:AAAbbbCCCddd..." 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-yellow-400/50 transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase">Chat ID do Canal / Grupo</label>
                  <input 
                    type="text" 
                    value={settings.telegram_chat_id || ''}
                    onChange={e => setSettings({...settings, telegram_chat_id: e.target.value})}
                    placeholder="-100123456789" 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-yellow-400/50 transition-all" 
                  />
                </div>
                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${settings.telegram_token ? 'bg-emerald-500' : 'bg-zinc-700'}`}></div>
                    <span className="text-sm text-zinc-400">Status: {settings.telegram_token ? 'Configurado' : 'Desconectado'}</span>
                  </div>
                  <button 
                    onClick={handleTestTelegram}
                    disabled={testStatus === 'testing'}
                    className={`text-xs font-bold hover:underline ${
                      testStatus === 'success' ? 'text-emerald-500' : 
                      testStatus === 'error' ? 'text-rose-500' : 
                      'text-yellow-400'
                    }`}
                  >
                    {testStatus === 'testing' ? 'Testando...' : 
                     testStatus === 'success' ? 'Sucesso!' : 
                     testStatus === 'error' ? 'Erro!' : 
                     'Testar Conexão'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageCircle className="text-emerald-500" size={20} />
                Conexão WhatsApp Business
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                  <input 
                    type="checkbox" 
                    id="whatsapp_active"
                    checked={settings.whatsapp_active === 'true'} 
                    onChange={e => setSettings({...settings, whatsapp_active: e.target.checked ? 'true' : 'false'})}
                    className="accent-emerald-500 w-5 h-5" 
                  />
                  <label htmlFor="whatsapp_active" className="text-sm font-bold text-emerald-500 uppercase cursor-pointer">Ativar Envio Automático</label>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="p-6 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-zinc-500 uppercase">Status da Conexão</p>
                        <div className={`w-3 h-3 rounded-full ${waStatus.status === 'open' ? 'bg-emerald-500' : waStatus.status === 'qr' ? 'bg-yellow-400 animate-pulse' : 'bg-rose-500'}`}></div>
                      </div>
                      
                      {waStatus.status === 'open' ? (
                        <div className="space-y-2">
                          <p className="text-emerald-500 font-bold flex items-center gap-2">
                            <Check size={18} /> Conectado com Sucesso
                          </p>
                          <p className="text-xs text-zinc-500">O sistema está pronto para enviar mensagens para o grupo configurado.</p>
                        </div>
                      ) : (
                          <div className="space-y-4">
                            <p className="text-zinc-400 text-sm">Escaneie o QR Code ao lado para conectar seu WhatsApp Business diretamente, sem necessidade de APIs externas.</p>
                            
                            {waStatus.error && (
                              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2">
                                <AlertCircle className="text-rose-500 mt-0.5 flex-shrink-0" size={14} />
                                <p className="text-xs text-rose-500 font-medium">{waStatus.error}</p>
                              </div>
                            )}

                             <div className="flex gap-3 items-center">
                               {showResetConfirm ? (
                                 <div className="flex-1 flex items-center gap-2 bg-rose-500/10 p-1.5 rounded-xl border border-rose-500/20 animate-in fade-in zoom-in duration-200">
                                   <span className="text-[10px] text-rose-500 font-bold px-2">Resetar sessão?</span>
                                   <button
                                     onClick={resetWhatsApp}
                                     disabled={isResetting}
                                     className="bg-rose-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-rose-600 disabled:opacity-50 transition-all"
                                   >
                                     {isResetting ? '...' : 'Sim'}
                                   </button>
                                   <button
                                     onClick={() => setShowResetConfirm(false)}
                                     className="bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-zinc-700 transition-all"
                                   >
                                     Não
                                   </button>
                                 </div>
                               ) : (
                                 <>
                                   <button 
                                     onClick={connectWhatsApp}
                                     className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-bold transition-all text-sm"
                                   >
                                     Gerar Novo QR Code
                                   </button>
                                   <button 
                                     onClick={() => setShowResetConfirm(true)}
                                     className="px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 py-3 rounded-xl font-bold transition-all text-xs"
                                     title="Resetar Sessão"
                                   >
                                     Resetar
                                   </button>
                                 </>
                               )}
                             </div>
                          </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-500 uppercase">ID do Grupo / Número Destino</label>
                      <input 
                        type="text" 
                        value={settings.whatsapp_chat_id || ''}
                        onChange={e => setSettings({...settings, whatsapp_chat_id: e.target.value})}
                        placeholder="120363000000000000@g.us" 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-emerald-500/50 transition-all" 
                      />
                      <p className="text-[10px] text-zinc-600">Para grupos, use o formato `id@g.us`. Para números individuais, use `5511999999999`.</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center p-6 bg-zinc-950 rounded-2xl border border-zinc-800 min-h-[300px]">
                    {waStatus.status === 'qr' && waStatus.qr ? (
                      <div className="space-y-4 text-center">
                        <div className="bg-white p-4 rounded-2xl inline-block mx-auto">
                          <img src={waStatus.qr} alt="WhatsApp QR Code" className="w-48 h-48" />
                        </div>
                        <p className="text-xs text-zinc-500">Abra o WhatsApp {'>'} Aparelhos Conectados {'>'} Conectar um Aparelho</p>
                      </div>
                    ) : waStatus.status === 'open' ? (
                      <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                          <Smartphone size={40} className="text-emerald-500" />
                        </div>
                        <p className="text-zinc-400 text-sm">Aparelho conectado e ativo.</p>
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
                          <Smartphone size={40} className="text-zinc-700" />
                        </div>
                        <p className="text-zinc-500 text-sm">Aguardando solicitação de conexão...</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${waStatus.status === 'open' ? 'bg-emerald-500' : 'bg-zinc-700'}`}></div>
                    <span className="text-sm text-zinc-400">Status: {waStatus.status === 'open' ? 'Ativo' : 'Desconectado'}</span>
                  </div>
                  <button 
                    onClick={handleTestWhatsApp}
                    disabled={waTestStatus === 'testing' || waStatus.status !== 'open'}
                    className={`text-xs font-bold hover:underline disabled:text-zinc-700 ${
                      waTestStatus === 'success' ? 'text-emerald-500' : 
                      waTestStatus === 'error' ? 'text-rose-500' : 
                      'text-emerald-500'
                    }`}
                  >
                    {waTestStatus === 'testing' ? 'Testando...' : 
                     waTestStatus === 'success' ? 'Sucesso!' : 
                     waTestStatus === 'error' ? 'Erro!' : 
                     'Enviar Mensagem de Teste'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-12 pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {saveStatus === 'success' && (
                <span className="text-emerald-500 text-sm font-bold flex items-center gap-1">
                  <Check size={16} /> Configurações salvas com sucesso!
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-rose-500 text-sm font-bold flex items-center gap-1">
                  <AlertCircle size={16} /> Erro ao salvar configurações.
                </span>
              )}
            </div>
            <button 
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-black px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-400/10"
            >
              {saveStatus === 'saving' ? (
                <Database className="animate-spin" size={20} />
              ) : (
                <Save size={20} />
              )}
              {saveStatus === 'saving' ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;