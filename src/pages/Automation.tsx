import React, { useState, useEffect } from 'react';
import { 
  Play, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Database,
  Zap,
  Smartphone
} from '../components/Icons';

const AutomationPage = () => {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [autoStatus, setAutoStatus] = useState({ 
    last_run: '', 
    interval: '2', 
    whatsapp_active: 'false',
    started_at: '',
    last_status: 'idle',
    last_error: '',
    start_time: '08:00',
    end_time: '22:00',
    app_url: ''
  });
  const [waStatus, setWaStatus] = useState<{ status: string, qr: string | null, error: string | null }>({ status: 'close', qr: null, error: null });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/automation/status');
        const data = await res.json();
          setAutoStatus({
            last_run: data.last_automation_run || '',
            interval: data.automation_interval || '2',
            whatsapp_active: data.whatsapp_active || 'false',
            started_at: data.automation_started_at || '',
            last_status: data.automation_last_status || 'idle',
            last_error: data.automation_last_error || '',
            start_time: data.automation_start_time || '08:00',
            end_time: data.automation_end_time || '22:00',
            app_url: data.app_url || ''
          });

        const waRes = await fetch('/api/whatsapp/status');
        const waData = await waRes.json();
        setWaStatus(waData);
      } catch (err) {
        console.error('Failed to fetch automation status:', err);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const connectWhatsApp = async () => {
    try {
      await fetch('/api/whatsapp/connect', { method: 'POST' });
      addLog('Iniciando conexão com WhatsApp...');
    } catch (err) {
      addLog('Erro ao conectar WhatsApp');
    }
  };

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const clearDatabase = async () => {
    setIsClearing(true);
    try {
      const res = await fetch('/api/products', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        addLog('Banco de dados limpo com sucesso!');
        setShowClearConfirm(false);
      }
    } catch (err) {
      addLog('Erro ao limpar banco de dados');
    } finally {
      setIsClearing(false);
    }
  };

  const triggerAutomation = async () => {
    setStatus('running');
    addLog('Iniciando busca manual de produtos...');
    try {
      const res = await fetch('/api/automation/trigger', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        addLog(`Sucesso: ${data.message}`);
        setTimeout(() => setStatus('idle'), 5000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Erro desconhecido');
        addLog(`Erro: ${data.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      console.error('Automation trigger failed:', err);
      setStatus('error');
      setMessage('Falha na conexão com o servidor');
      addLog('Erro: Falha na conexão com o servidor');
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-white tracking-tight">Automação</h2>
        <p className="text-zinc-400">Gerencie o motor de busca e processamento automático.</p>
      </header>

      {!autoStatus.app_url && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-4 text-rose-500">
          <AlertCircle size={24} />
          <div>
            <p className="font-bold">Configuração Necessária</p>
            <p className="text-sm">A URL da aplicação não está configurada. Os links de rastreamento não funcionarão corretamente até que você defina a URL nas <a href="/settings" className="underline font-bold">Configurações</a>.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Control Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Smartphone size={20} className="text-emerald-500" />
                WhatsApp
              </h3>
              <div className={`w-3 h-3 rounded-full ${waStatus.status === 'open' ? 'bg-emerald-500' : waStatus.status === 'qr' ? 'bg-yellow-400 animate-pulse' : 'bg-rose-500'}`}></div>
            </div>

            <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 mb-4">
              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Status da Conexão</p>
              <p className="text-xs text-zinc-400 leading-relaxed italic">
                A conexão é mantida no servidor 24/7. Uma vez conectado, você pode fechar o navegador e a automação continuará funcionando.
              </p>
            </div>

            {waStatus.status === 'open' ? (
              <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-2">
                <CheckCircle size={32} className="mx-auto text-emerald-500" />
                <p className="text-emerald-500 font-bold">Conectado!</p>
                <p className="text-xs text-zinc-500">Pronto para enviar mensagens automáticas.</p>
              </div>
            ) : waStatus.status === 'qr' && waStatus.qr ? (
              <div className="space-y-4 text-center">
                <div className="bg-white p-4 rounded-2xl inline-block mx-auto">
                  <img src={waStatus.qr} alt="WhatsApp QR Code" className="w-48 h-48" />
                </div>
                <p className="text-sm text-zinc-400">Escaneie o QR Code com seu WhatsApp para conectar.</p>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="p-6 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <Smartphone size={32} className="mx-auto text-zinc-700 mb-2" />
                  <p className="text-zinc-500 text-sm">WhatsApp desconectado.</p>
                  {waStatus.error && (
                    <p className="text-[10px] text-rose-500 mt-2 font-medium">{waStatus.error}</p>
                  )}
                </div>
                <button 
                  onClick={connectWhatsApp}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-bold transition-all"
                >
                  Conectar Agora
                </button>
              </div>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Controle</h3>
              <div className={`w-3 h-3 rounded-full ${autoStatus.last_status === 'running' || status === 'running' ? 'bg-yellow-400 animate-pulse' : autoStatus.last_status === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                <p className="text-xs font-bold text-zinc-500 uppercase mb-1">Início da Automação</p>
                <p className="text-white font-medium">
                  {autoStatus.started_at ? new Date(autoStatus.started_at).toLocaleString() : 'Não iniciada'}
                </p>
              </div>

              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                <p className="text-xs font-bold text-zinc-500 uppercase mb-1">Última Execução</p>
                <p className="text-white font-medium">
                  {autoStatus.last_run ? new Date(autoStatus.last_run).toLocaleString() : 'Nunca executado'}
                </p>
              </div>
              
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                <p className="text-xs font-bold text-zinc-500 uppercase mb-1">Intervalo Configurado</p>
                <p className="text-white font-medium">{autoStatus.interval} horas</p>
              </div>

              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                <p className="text-xs font-bold text-zinc-500 uppercase mb-1">Janela de Funcionamento</p>
                <p className="text-white font-medium">{autoStatus.start_time} às {autoStatus.end_time}</p>
              </div>

              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                <p className="text-xs font-bold text-zinc-500 uppercase mb-1">Status Atual</p>
                <div className="flex items-center gap-2">
                  <p className={`font-medium ${autoStatus.last_status === 'success' ? 'text-emerald-500' : autoStatus.last_status === 'error' ? 'text-rose-500' : 'text-yellow-400'}`}>
                    {autoStatus.last_status === 'success' ? 'Sucesso' : autoStatus.last_status === 'error' ? 'Erro' : autoStatus.last_status === 'running' ? 'Executando...' : 'Aguardando'}
                  </p>
                </div>
                {autoStatus.last_status === 'error' && autoStatus.last_error && (
                  <p className="text-[10px] text-rose-400 mt-1 line-clamp-2">{autoStatus.last_error}</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex flex-col gap-3">
              <button 
                onClick={triggerAutomation}
                disabled={status === 'running'}
                className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-400/20"
              >
                {status === 'running' ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : (
                  <Play size={20} fill="currentColor" />
                )}
                {status === 'running' ? 'Executando...' : 'Forçar Busca Agora'}
              </button>

              {showClearConfirm ? (
                <div className="flex flex-col gap-2 bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20 animate-in fade-in zoom-in duration-200">
                  <p className="text-xs text-rose-500 font-bold text-center">Tem certeza? Isso apagará TUDO.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={clearDatabase}
                      disabled={isClearing}
                      className="flex-1 bg-rose-500 text-white py-2 rounded-xl text-xs font-bold hover:bg-rose-600 disabled:opacity-50 transition-all"
                    >
                      {isClearing ? 'Limpando...' : 'Sim, apagar'}
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="flex-1 bg-zinc-800 text-zinc-300 py-2 rounded-xl text-xs font-bold hover:bg-zinc-700 transition-all"
                    >
                      Não
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 py-3 rounded-2xl font-bold text-xs transition-all"
                >
                  Limpar Banco de Dados
                </button>
              )}
            </div>

            {status === 'success' && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-500 text-sm">
                <CheckCircle size={18} />
                {message}
              </div>
            )}

            {status === 'error' && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-sm">
                <AlertCircle size={18} />
                {message}
              </div>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-4">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Zap size={18} className="text-yellow-400" />
              Dica de Performance
            </h4>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Mantenha seus cookies atualizados na aba de configurações para garantir que a conversão de links funcione sem interrupções.
            </p>
          </div>
        </div>

        {/* Logs Panel */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Database size={20} className="text-yellow-400" />
              Logs de Atividade
            </h3>
            <button 
              onClick={() => setLogs([])}
              className="text-xs text-zinc-500 hover:text-white transition-colors"
            >
              Limpar Logs
            </button>
          </div>

          <div className="flex-1 bg-zinc-950 rounded-2xl border border-zinc-800 p-4 font-mono text-xs overflow-y-auto space-y-2 no-scrollbar">
            {logs.length === 0 ? (
              <p className="text-zinc-700 italic">Nenhuma atividade registrada ainda...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-zinc-400 border-l-2 border-zinc-800 pl-3 py-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationPage;
