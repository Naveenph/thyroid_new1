import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';

const DEFAULT_TIPS = [
  {
    id: 1,
    emoji: '🥗',
    title: 'Iodine-Rich Diet',
    body: 'Include seafood, dairy, and iodized salt in your meals. Iodine is essential for proper thyroid hormone production and a stable metabolism.',
  },
  {
    id: 2,
    emoji: '🏃',
    title: 'Stay Active',
    body: 'Regular aerobic exercise like walking or cycling helps maintain thyroid hormone balance and boosts overall metabolic efficiency.',
  },
  {
    id: 3,
    emoji: '😴',
    title: 'Prioritize Sleep',
    body: 'Poor sleep disrupts cortisol and thyroid hormone rhythms. Aim for 7–9 hours of quality sleep every night to support glandular health.',
  },
  {
    id: 4,
    emoji: '☕',
    title: 'Limit Caffeine',
    body: 'Excess caffeine may interfere with thyroid hormone absorption. Take medications at least 60 minutes before consuming coffee.',
  },
  {
    id: 5,
    emoji: '🧘',
    title: 'Manage Stress',
    body: 'Chronic stress raises cortisol levels that suppress thyroid function. Mindfulness and deep breathing exercises can help regulate hormonal balance.',
  },
  {
    id: 6,
    emoji: '🩺',
    title: 'Regular Checkups',
    body: 'Annual TSH blood tests are recommended for early detection. If you have a family history of thyroid conditions, start screenings earlier.',
  },
  {
    id: 7,
    emoji: '💊',
    title: 'Medication Timing',
    body: 'Thyroid medications like levothyroxine are most effective on an empty stomach, 30–60 minutes before breakfast.',
  },
  {
    id: 8,
    emoji: '🌿',
    title: 'Watch Goitrogens',
    body: 'Foods like raw cabbage, broccoli, and soy may interfere with thyroid function in large amounts. Cooking reduces this effect.',
  },
];

export default function HealthTips() {
  const [tips, setTips] = useState(DEFAULT_TIPS);
  const [current, setCurrent] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  const fetchTips = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/tips');
      if (res.data && res.data.length > 0) {
        // Map backend response structures (id, title, description) to emoji-enhanced frontend layouts
        const emojis = ['🥗', '🏃', '😴', '☕', '🧘', '🩺', '💊', '🌿', '🍎', '💧'];
        const mappedTips = res.data.map((item, idx) => ({
          id: item.id,
          emoji: emojis[idx % emojis.length],
          title: item.title,
          body: item.description
        }));
        setTips(mappedTips);
      }
    } catch (err) {
      console.warn("Failed to load health tips from backend API. Using local fallback.");
    }
  };

  useEffect(() => {
    fetchTips();
  }, []);

  useEffect(() => {
    if (!autoplay || tips.length === 0) return;
    const timer = setInterval(() => {
      setCurrent(c => (c + 1) % tips.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [autoplay, tips.length]);

  const prev = () => { setAutoplay(false); setCurrent(c => (c - 1 + tips.length) % tips.length); };
  const next = () => { setAutoplay(false); setCurrent(c => (c + 1) % tips.length); };

  if (tips.length === 0) return null;
  const tip = tips[current];

  return (
    <div className="w-full max-w-6xl z-10 mt-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-slate-900/60 backdrop-blur-xl border border-amber-500/20 rounded-3xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.4)]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <Lightbulb className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-white font-bold">Thyroid Health Tips</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500 font-mono w-12 text-center">
              {current + 1} / {tips.length}
            </span>
            <button
              onClick={next}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden min-h-[100px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="flex items-center gap-5 px-6 py-5"
            >
              <span className="text-4xl shrink-0">{tip.emoji}</span>
              <div>
                <h4 className="text-amber-300 font-bold mb-1">{tip.title}</h4>
                <p className="text-slate-300 text-sm leading-relaxed">{tip.body}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 pb-4">
          {tips.map((_, i) => (
            <button
              key={i}
              onClick={() => { setAutoplay(false); setCurrent(i); }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-amber-400 w-4' : 'bg-slate-700 hover:bg-slate-500'}`}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
