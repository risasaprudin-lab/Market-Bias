import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Zap,
  Server,
  Activity,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Code2,
} from 'lucide-react';
import { testWorkerConnection } from '../services/flowMonitorEngine';

interface WebhookSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerUrl: string;
  onSaveWorkerUrl: (url: string) => void;
}

export const WebhookSetupModal: React.FC<WebhookSetupModalProps> = ({
  isOpen,
  onClose,
  workerUrl,
  onSaveWorkerUrl,
}) => {
  const [urlInput, setUrlInput] = useState(workerUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    endpointUsed?: string;
    latencyMs?: number;
    details?: any;
    error?: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTest = async () => {
    if (!urlInput.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testWorkerConnection(urlInput.trim());
      setTestResult(res);
      if (res.ok) {
        onSaveWorkerUrl(urlInput.trim());
      }
    } catch (err: any) {
      setTestResult({ ok: false, error: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0b101d] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-[#0b101d]/95 backdrop-blur-md z-10">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Integrasi Pine Script & Cloudflare Worker
              </h3>
              <p className="text-xs text-slate-400">
                Hubungkan feed data live dari TradingView Pine Script v6 ke aplikasi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Section 1: Cloudflare Worker Setup */}
          <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>URL Cloudflare Worker Anda</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                Contoh: https://kael-dashboard.namakamu.workers.dev
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://YOUR-WORKER.workers.dev"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleTest}
                disabled={isTesting || !urlInput.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 shrink-0"
              >
                {isTesting ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>Test & Simpan</span>
              </button>
            </div>

            {/* Test Connection Output */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2 ${
                  testResult.ok
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}
              >
                {testResult.ok ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">
                    {testResult.ok ? 'Koneksi Berhasil!' : 'Koneksi Gagal'}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {testResult.ok
                      ? `Latensi: ${testResult.latencyMs}ms | Endpoint: ${testResult.endpointUsed}`
                      : testResult.error}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Panduan Setup TradingView Alert */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>📋 Langkah Membuat Alert di TradingView</span>
            </h4>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2.5 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                  1
                </span>
                <div>
                  <span className="font-semibold text-white">Pasang Pine Script v6</span> di tab Pine Editor TradingView, lalu klik <strong>"Add to chart"</strong>.
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                  2
                </span>
                <div>
                  Klik ikon jam alarm <strong>"Create Alert"</strong> di TradingView. Pilih Condition: <strong>Flow Monitor 20 Prime</strong> &rarr; <code>Any alert() function call</code>.
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                  3
                </span>
                <div className="w-full">
                  <div>
                    Pilih Trigger: <strong>"Once Per Bar Close"</strong>. Centang <strong>"Webhook URL"</strong> dan masukkan:
                  </div>
                  <div className="mt-1.5 flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono text-[11px] text-cyan-300">
                    <span className="truncate">
                      {urlInput ? `${urlInput.replace(/\/+$/, '')}/fm?key=YOUR_API_KEY` : 'https://YOUR-WORKER.workers.dev/fm?key=YOUR_API_KEY'}
                    </span>
                    <button
                      onClick={() =>
                        handleCopy(
                          urlInput
                            ? `${urlInput.replace(/\/+$/, '')}/fm?key=YOUR_API_KEY`
                            : 'https://YOUR-WORKER.workers.dev/fm?key=YOUR_API_KEY',
                          'webhook_url'
                        )
                      }
                      className="ml-2 p-1 text-slate-400 hover:text-white"
                    >
                      {copiedKey === 'webhook_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                  4
                </span>
                <div>
                  Kosongkan kotak pesan <strong>Message</strong> karena Pine Script akan otomatis mengirim payload JSON terstruktur (OHLC, ROC %, Volume, EMA20) untuk 5 Indeks, 5 Komoditas, & 10 Crypto.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-[#0b101d] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
