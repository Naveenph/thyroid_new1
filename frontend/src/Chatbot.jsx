import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Trash2 } from 'lucide-react';
import axios from 'axios';

const SUGGESTIONS = [
  "What is a thyroid nodule?",
  "What does 'Abnormal' result mean?",
  "How to prepare for an ultrasound?",
  "What foods help thyroid health?",
  "When should I see a doctor?",
  "What is TSH level?",
];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! I am your Thyroid Disease Prediction assistant. Ask me anything about thyroid health, your results, or next steps. 🩺' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const sendMessage = async (text) => {
    const userMsg = (text || input).trim();
    if (!userMsg) return;
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await axios.post('http://127.0.0.1:8000/chat', { message: userMsg });
      setMessages(prev => [...prev, { sender: 'bot', text: res.data.reply }]);
    } catch {
      setMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I am having trouble connecting to the server. Please ensure the backend is running.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ sender: 'bot', text: 'Chat cleared! How can I help you? 😊' }]);
  };

  // Show suggestions only if there's only 1 message (the initial greeting)
  const showSuggestions = messages.length === 1 && !isLoading;

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.5)] z-50 hover:shadow-[0_0_30px_rgba(37,99,235,0.8)] transition-all"
          >
            <MessageSquare className="text-white w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 w-80 sm:w-[420px] max-h-[85vh] bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-800/80 p-4 flex justify-between items-center border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <Bot className="text-blue-400 w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Thyroid Health Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-slate-400 text-xs">AI Powered • Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearChat}
                  title="Clear chat"
                  className="text-slate-400 hover:text-red-400 transition-colors bg-white/5 hover:bg-red-500/10 p-1.5 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 min-h-0">
              {messages.map((msg, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'bot' && (
                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center mr-2 mt-auto border border-slate-700 shrink-0">
                      <Bot className="w-3 h-3 text-blue-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] p-3 text-[13.5px] leading-relaxed shadow-md ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-br-sm'
                        : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-2xl rounded-bl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.sender === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-blue-600/30 flex items-center justify-center ml-2 mt-auto border border-blue-500/30 shrink-0">
                      <User className="w-3 h-3 text-blue-300" />
                    </div>
                  )}
                </motion.div>
              ))}

              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start items-end">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center mr-2 border border-slate-700 shrink-0">
                    <Bot className="w-3 h-3 text-blue-400" />
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700/50 p-4 rounded-2xl rounded-bl-sm flex gap-1.5 h-[42px] items-center">
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  </div>
                </motion.div>
              )}

              {/* Quick Suggestion Chips */}
              <AnimatePresence>
                {showSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex flex-wrap gap-2 mt-2"
                  >
                    {SUGGESTIONS.map((s, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.06 }}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => sendMessage(s)}
                        className="text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 hover:border-blue-500/40 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                      >
                        {s}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-slate-900 border-t border-white/5 shrink-0">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !isLoading && sendMessage()}
                  placeholder="Ask a thyroid health question..."
                  className="w-full bg-slate-800/50 text-white text-sm rounded-xl pl-4 pr-12 py-3 border border-slate-700 focus:outline-none focus:border-blue-500 focus:bg-slate-800 transition-all placeholder:text-slate-500"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
