import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { FlowItem, FlowAssetCategory } from '../types/forex';
import { addJournalEntry } from '../services/firebase';
import { X, BookOpen, Check, TrendingUp, TrendingDown } from 'lucide-react';

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onOpenAuth: () => void;
  item: FlowItem | null;
  category: FlowAssetCategory;
}

export const JournalModal: React.FC<JournalModalProps> = ({
  isOpen,
  onClose,
  user,
  onOpenAuth,
  item,
  category,
}) => {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    setIsSubmitting(true);
    try {
      await addJournalEntry({
        userId: user.uid,
        pair: item.pair,
        category,
        dir: item.dir,
        roc: item.pct,
        price: item.price,
        notes: notes.trim(),
        timestamp: Date.now(),
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setNotes('');
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to save journal entry:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBull = item.dir === 'LONG' || item.pct >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0b101d] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Catat Setup ke Jurnal Trading</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Asset Summary Pill */}
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-extrabold text-white font-mono">{item.pair}</div>
              <div className="text-[11px] text-slate-400 font-mono">
                Harga: {item.price ? item.price.toLocaleString() : '-'} | ROC: {item.pct}%
              </div>
            </div>
            <div
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 ${
                isBull ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {isBull ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{item.dir}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Catatan Setup & Rencana Trading:
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Konfluensi 15m valid, breakout resistance, target TP 1:2..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {!user && (
            <div className="bg-amber-950/30 border border-amber-500/30 p-3 rounded-xl text-xs text-amber-300">
              Perlu login dengan Google untuk menyimpan jurnal ke Firestore Cloud Database.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isSuccess}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"
            >
              {isSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Tersimpan!</span>
                </>
              ) : isSubmitting ? (
                <span>Menyimpan...</span>
              ) : (
                <span>{user ? 'Simpan Catatan' : 'Login & Simpan'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
