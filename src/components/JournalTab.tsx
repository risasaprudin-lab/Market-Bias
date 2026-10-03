import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { JournalEntry, subscribeJournal, deleteJournalEntry } from '../services/firebase';
import {
  BookOpen,
  Trash2,
  TrendingUp,
  TrendingDown,
  Clock,
  LogIn,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface JournalTabProps {
  user: User | null;
  onOpenAuth: () => void;
}

export const JournalTab: React.FC<JournalTabProps> = ({ user, onOpenAuth }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setEntries([]);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeJournal(
      user.uid,
      (data) => {
        setEntries(data);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteJournalEntry(user.uid, id);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  if (!user) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
          <BookOpen className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white mb-1.5">Jurnal Trading & Cloud Sync</h3>
        <p className="text-xs text-slate-400 mb-6">
          Masuk dengan akun Google Anda untuk menyimpan catatan rencana trading, snapshot momentum aset, dan riwayat alert secara aman di Firebase Firestore.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 mx-auto"
        >
          <LogIn className="w-4 h-4" />
          <span>Masuk dengan Google</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Catatan Jurnal Trading Saya</h3>
            <p className="text-[11px] text-slate-400">
              Disinkronisasi secara real-time via Firebase Firestore
            </p>
          </div>
        </div>
        <div className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-xl flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{entries.length} Catatan Tersimpan</span>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-400 text-xs">
          Belum ada catatan jurnal. Buka tab <strong>Flow Monitor</strong> atau <strong>Currency Strength</strong> dan klik ikon buku catatan pada aset pilihan Anda untuk mencatat setup trading.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry) => {
            const isBull = entry.dir === 'LONG';
            const dateStr = new Date(entry.timestamp).toLocaleString('id-ID', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={entry.id}
                className="bg-[#0d1322] border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white font-mono">
                          {entry.pair}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                            isBull
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isBull ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          <span>{entry.dir}</span>
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Harga: {entry.price ? entry.price.toLocaleString() : '-'} | ROC: {entry.roc !== undefined ? `${entry.roc}%` : '-'}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(entry.id)}
                      title="Hapus catatan"
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {entry.notes && (
                    <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 my-3 whitespace-pre-wrap">
                      {entry.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800 font-mono">
                  <span className="uppercase">{entry.category}</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{dateStr}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
