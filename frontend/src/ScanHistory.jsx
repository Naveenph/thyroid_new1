import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Trash2, Clock } from 'lucide-react';
import axios from 'axios';

export async function saveScanToHistory(result, fileName) {
  // Handled automatically on the backend during the predict endpoint.
}

export async function clearScanHistory() {
  const token = localStorage.getItem('token');
  try {
    await axios.delete('http://127.0.0.1:8000/api/history', {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (err) {
    console.error("Failed to clear database scan history", err);
  }
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ScanHistory() {
  const [history, setHistory] = useState([]);
  const [expanded, setExpanded] = useState(true);

  const loadHistory = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const formatted = response.data.map(item => ({
        id: item.id,
        timestamp: item.created_at,
        fileName: item.filename,
        prediction: item.prediction,
        confidence: item.confidence,
        level: item.level,
      }));
      setHistory(formatted);
    } catch (err) {
      console.error("Failed to load history from database", err);
    }
  };

  useEffect(() => {
    loadHistory();
    window.addEventListener('scan_saved', loadHistory);
    return () => {
      window.removeEventListener('scan_saved', loadHistory);
    };
  }, []);

  const handleClear = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete('http://127.0.0.1:8000/api/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory([]);
    } catch (err) {
      console.error("Failed to clear history", err);
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://127.0.0.1:8000/api/history/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(prev => prev.filter(entry => entry.id !== id));
    } catch (err) {
      console.error(`Failed to delete scan entry ${id}`, err);
    }
  };

  return (
    <div className="w-full max-w-6xl z-10 mt-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.4)]"
      >
        {/* Header */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
              <History className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-white font-bold">Scan History</span>
            {history.length > 0 && (
              <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full font-semibold">
                {history.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Clear All
              </motion.button>
            )}
            {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-5">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-slate-500">
                    <Clock className="w-10 h-10 mb-3 text-slate-700" />
                    <p className="text-sm">No scans recorded yet.</p>
                    <p className="text-xs text-slate-600 mt-1">Your analysis history will appear here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                    {history.map((entry, idx) => {
                      const isAbnormal = entry.prediction?.toLowerCase().includes('abnormal');
                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`p-4 rounded-2xl border transition-colors relative ${
                            isAbnormal
                              ? 'bg-red-950/30 border-red-500/20 hover:border-red-500/40'
                              : 'bg-emerald-950/30 border-emerald-500/20 hover:border-emerald-500/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              {isAbnormal
                                ? <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                                : <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                              }
                              <span className={`text-xs font-bold truncate ${isAbnormal ? 'text-red-400' : 'text-emerald-400'}`}>
                                {isAbnormal ? 'Abnormal' : 'Normal'}
                              </span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                              className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-white/5 transition-colors shrink-0"
                              title="Delete Scan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-white font-bold text-lg mb-0.5">{entry.confidence}%</p>
                          {entry.level && entry.level !== "None" && <p className="text-xs text-slate-400 mb-1">{entry.level}</p>}
                          <p className="text-xs text-slate-500 truncate" title={entry.fileName}>{entry.fileName}</p>
                          <p className="text-xs text-slate-650 mt-1">{formatDate(entry.timestamp)}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
