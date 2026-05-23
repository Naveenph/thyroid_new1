import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { 
  UploadCloud, CheckCircle, AlertTriangle, Activity, Scan, FileImage, LogOut, HeartPulse, 
  ArrowRight, Stethoscope, Phone, ShieldAlert, MapPin, Download, RefreshCw, 
  Users, Layers, Settings, FileText, Send, HelpCircle, User, Plus, Edit2, Trash2, Check, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NeuralBackground from './NeuralBackground';
import Chatbot from './Chatbot';
import { useToast } from './Toast';
import ScanHistory from './ScanHistory';
import HealthTips from './HealthTips';

function Dashboard() {
  const navigate = useNavigate();
  const addToast = useToast();
  
  // Auth details
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

  // Navigation / View modes
  const [viewMode, setViewMode] = useState(storedUser?.role === 'admin' ? 'admin' : 'user'); // 'user' or 'admin'
  const [activeAdminTab, setActiveAdminTab] = useState('dashboard'); // 'dashboard', 'users', 'predictions', 'tips', 'queries'

  // User States (Image Upload & Prediction)
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [result, setResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // User Queries State
  const [userQueries, setUserQueries] = useState([]);
  const [newQueryText, setNewQueryText] = useState('');
  const [isQuerySubmitting, setIsQuerySubmitting] = useState(false);

  // Admin Portal States
  const [adminStats, setAdminStats] = useState({
    total_users: 0,
    total_predictions: 0,
    total_images: 0,
    pending_queries: 0
  });
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminPredictions, setAdminPredictions] = useState([]);
  const [adminTips, setAdminTips] = useState([]);
  const [adminQueries, setAdminQueries] = useState([]);

  // Admin Forms / Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'user' });

  const [showAddTipModal, setShowAddTipModal] = useState(false);
  const [editingTip, setEditingTip] = useState(null);
  const [tipForm, setTipForm] = useState({ title: '', description: '' });

  const [replyTextMap, setReplyTextMap] = useState({});

  const fileInputRef = useRef(null);

  // Mouse tracking logic for dynamic parallax effects
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { damping: 50, stiffness: 400 });
  const smoothMouseY = useSpring(mouseY, { damping: 50, stiffness: 400 });
  const bgShiftX = useTransform(smoothMouseX, [-0.5, 0.5], [-30, 30]);
  const bgShiftY = useTransform(smoothMouseY, [-0.5, 0.5], [-30, 30]);
  const cardTiltX = useTransform(smoothMouseY, [-0.5, 0.5], [5, -5]);
  const cardTiltY = useTransform(smoothMouseX, [-0.5, 0.5], [-5, 5]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      mouseX.set(e.clientX / innerWidth - 0.5);
      mouseY.set(e.clientY / innerHeight - 0.5);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  // Authorization Check
  useEffect(() => {
    if (!token || !storedUser) {
      addToast({ type: 'error', title: 'Session Expired', message: 'Please sign in to access details.' });
      navigate('/');
    } else {
      // Configure default auth header for Axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserQueries();
    }
  }, [token]);

  // Handle data fetching for admin views
  useEffect(() => {
    if (storedUser?.role === 'admin' && viewMode === 'admin') {
      if (activeAdminTab === 'dashboard') fetchAdminStats();
      else if (activeAdminTab === 'users') fetchAdminUsers();
      else if (activeAdminTab === 'predictions') fetchAdminPredictions();
      else if (activeAdminTab === 'tips') fetchAdminTips();
      else if (activeAdminTab === 'queries') fetchAdminQueries();
    }
  }, [viewMode, activeAdminTab]);

  // ------------------ API FETCHERS ------------------

  const fetchUserQueries = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/queries');
      setUserQueries(res.data);
    } catch (err) {
      console.error("Error fetching user queries", err);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/admin/dashboard');
      setAdminStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/admin/users');
      setAdminUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminPredictions = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/admin/predictions');
      setAdminPredictions(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminTips = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/admin/tips');
      setAdminTips(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminQueries = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/admin/queries');
      setAdminQueries(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ------------------ ANALYZER STEPPER ------------------

  const steps = [
    "Waking up Deep Learning Model...",
    "Enhancing Ultrasound Contrast...",
    "Scanning for Nodules...",
    "Running EfficientNetB3 AI...",
    "Finalizing Health Report..."
  ];

  useEffect(() => {
    let timer;
    if (isAnalyzing && analysisStep < steps.length - 1) {
      timer = setTimeout(() => {
        setAnalysisStep(prev => prev + 1);
      }, 700);
    }
    return () => clearTimeout(timer);
  }, [isAnalyzing, analysisStep]);

  // ------------------ USER ACTIONS ------------------

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setAnalysisStep(0);
      addToast({ type: 'info', title: 'Image Selected', message: `${file.name} is ready for analysis.` });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isAnalyzing) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (isAnalyzing) return;
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setAnalysisStep(0);
      addToast({ type: 'info', title: 'Image Uploaded', message: `${file.name} is ready for analysis.` });
    } else {
      addToast({ type: 'error', title: 'Invalid File', message: 'Please drop a valid image file.' });
    }
  };

  const loadSampleImage = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 500; canvas.height = 500;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createRadialGradient(250, 250, 50, 250, 250, 250);
    gradient.addColorStop(0, '#475569');
    gradient.addColorStop(1, '#020617');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 500, 500);
    
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(250, 250, 85, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Demo Ultrasound Scan', 250, 50);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], "sample_ultrasound.jpg", { type: "image/jpeg" });
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setAnalysisStep(0);
      addToast({ type: 'info', title: 'Sample Loaded', message: 'Demo scan loaded successfully.' });
    }, 'image/jpeg');
  };

  const analyzeImage = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setAnalysisStep(0);
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await new Promise(r => setTimeout(r, 1500));
      const response = await axios.post('http://127.0.0.1:8000/api/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data);
      window.dispatchEvent(new Event('scan_saved'));
      
      addToast({ 
        type: response.data.prediction.toLowerCase().includes('abnormal') ? 'error' : 'success', 
        title: 'Analysis Complete', 
        message: `Prediction: ${response.data.category}` 
      });
    } catch (error) {
      setResult({
        prediction: "Connection Error",
        confidence: 0,
        message: "Failed to connect to Flask API server."
      });
      addToast({ type: 'error', title: 'Analysis Failed', message: 'Could not connect to the diagnostic server.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetScan = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setAnalysisStep(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    addToast({ type: 'info', title: 'Uploader Reset', message: 'Ready for new scan.' });
  };

  const downloadReport = () => {
    if (!result) return;
    const content = `Thyroid Ultrasound Analysis Report
----------------------------------
Date: ${new Date().toLocaleString()}
Prediction: ${result.prediction}
Category: ${result.category}
Confidence: ${result.confidence}%
Level: ${result.level || 'N/A'}

AI Insights:
${result.message}

Recommended Consultations:
${result.doctors?.length ? result.doctors.map(d => `- ${d.name} | ${d.hospital} | Phone: ${d.phone}`).join('\n') : 'None'}
`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Thyroid_AI_Report_${new Date().getTime()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', title: 'Report Saved', message: 'Diagnostic report saved as text file.' });
  };

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    if (!newQueryText.trim()) return;
    setIsQuerySubmitting(true);

    try {
      await axios.post('http://127.0.0.1:8000/api/queries', { question: newQueryText });
      setNewQueryText('');
      fetchUserQueries();
      addToast({ type: 'success', title: 'Query Submitted', message: 'Your support ticket has been sent to the admin.' });
    } catch (err) {
      addToast({ type: 'error', title: 'Submission Failed', message: 'Unable to send query.' });
    } finally {
      setIsQuerySubmitting(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    addToast({ type: 'info', title: 'Logged Out', message: 'Session closed.' });
    navigate('/');
  };

  // ------------------ ADMIN ACTIONS ------------------

  const handleUserFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`http://127.0.0.1:8000/api/admin/users/${editingUser.id}`, userForm);
        addToast({ type: 'success', title: 'User Updated', message: 'Account details saved.' });
      } else {
        await axios.post('http://127.0.0.1:8000/api/admin/users', userForm);
        addToast({ type: 'success', title: 'User Created', message: 'New user added successfully.' });
      }
      setShowAddUserModal(false);
      setEditingUser(null);
      setUserForm({ name: '', email: '', password: '', role: 'user' });
      fetchAdminUsers();
    } catch (err) {
      addToast({ type: 'error', title: 'Action Failed', message: err.response?.data?.message || 'Error processing user form.' });
    }
  };

  const handleEditUserClick = (u) => {
    setEditingUser(u);
    setUserForm({ name: u.name, email: u.email, password: '', role: u.role });
    setShowAddUserModal(true);
  };

  const handleDeleteUser = async (uid) => {
    if (confirm("Are you sure you want to delete this user? All their data will be wiped.")) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/admin/users/${uid}`);
        addToast({ type: 'success', title: 'User Deleted', message: 'Account removed.' });
        fetchAdminUsers();
      } catch (err) {
        addToast({ type: 'error', title: 'Delete Failed', message: err.response?.data?.message || 'Error deleting user.' });
      }
    }
  };

  const handleTipFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTip) {
        await axios.put(`http://127.0.0.1:8000/api/admin/tips/${editingTip.id}`, tipForm);
        addToast({ type: 'success', title: 'Health Tip Updated', message: 'Tip successfully modified.' });
      } else {
        await axios.post('http://127.0.0.1:8000/api/admin/tips', tipForm);
        addToast({ type: 'success', title: 'Health Tip Added', message: 'Tip successfully added.' });
      }
      setShowAddTipModal(false);
      setEditingTip(null);
      setTipForm({ title: '', description: '' });
      fetchAdminTips();
    } catch (err) {
      addToast({ type: 'error', title: 'Action Failed', message: 'Error processing health tip form.' });
    }
  };

  const handleEditTipClick = (tip) => {
    setEditingTip(tip);
    setTipForm({ title: tip.title, description: tip.description });
    setShowAddTipModal(true);
  };

  const handleDeleteTip = async (tid) => {
    if (confirm("Are you sure you want to delete this health tip?")) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/admin/tips/${tid}`);
        addToast({ type: 'success', title: 'Health Tip Deleted', message: 'Tip removed.' });
        fetchAdminTips();
      } catch (err) {
        addToast({ type: 'error', title: 'Delete Failed', message: 'Error deleting health tip.' });
      }
    }
  };

  const handleReplySubmit = async (qid) => {
    const text = replyTextMap[qid]?.trim();
    if (!text) return;

    try {
      await axios.post(`http://127.0.0.1:8000/api/admin/queries/${qid}/respond`, { response: text });
      addToast({ type: 'success', title: 'Reply Submitted', message: 'Response saved and sent.' });
      setReplyTextMap(prev => ({ ...prev, [qid]: '' }));
      fetchAdminQueries();
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to Send', message: 'Could not submit response.' });
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col items-center py-6 px-4 sm:px-6 lg:px-8 overflow-x-hidden overflow-y-auto relative font-sans perspective-1000">
      
      {/* Dynamic Parallax Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <NeuralBackground />
        <motion.div 
          style={{ x: bgShiftX, y: bgShiftY }}
          className="absolute inset-0 w-full h-full"
        >
          <motion.div 
            animate={{ scale: [1, 1.2, 1], borderRadius: ["30%", "50%", "30%"] }} 
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-blue-600/10 blur-[120px] mix-blend-screen"
          />
          <motion.div 
            animate={{ scale: [1, 1.4, 1], borderRadius: ["50%", "30%", "50%"] }} 
            transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-purple-600/10 blur-[120px] mix-blend-screen"
          />
        </motion.div>
      </div>

      {/* Top Navbar */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{ rotateX: cardTiltX, rotateY: cardTiltY }}
        className="w-full max-w-6xl flex justify-between items-center mb-6 z-20 bg-white/5 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 shadow-lg"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-white block leading-none">Thyroid Disease Prediction</span>
            <span className="text-[10px] text-slate-400 font-medium">Hello, {storedUser?.name || 'Doctor'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {storedUser?.role === 'admin' && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setViewMode(viewMode === 'user' ? 'admin' : 'user')}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-300 hover:from-blue-600/30 hover:to-purple-600/30 px-4 py-2 rounded-xl border border-blue-500/30 text-xs font-bold transition-all"
            >
              {viewMode === 'user' ? (
                <><Settings className="w-3.5 h-3.5" /> Go Admin Console</>
              ) : (
                <><Layers className="w-3.5 h-3.5" /> Back to Workspace</>
              )}
            </motion.button>
          )}

          <motion.button 
            whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSignOut}
            className="flex items-center gap-2 bg-white/5 text-slate-300 px-3 py-2 rounded-xl border border-white/10 text-xs transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="font-medium hidden sm:inline">Sign Out</span>
          </motion.button>
        </div>
      </motion.div>

      {/* -------------------- USER WORKSPACE VIEW -------------------- */}
      {viewMode === 'user' && (
        <div className="w-full max-w-6xl flex flex-col items-center">
          
          {/* Diagnostic Panel */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ rotateX: cardTiltX, rotateY: cardTiltY, transformStyle: "preserve-3d" }}
            transition={{ type: "spring", bounce: 0.2 }}
            className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 relative"
          >
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-xl pointer-events-none"></div>
            
            {/* Left Column: Image Input */}
            <div className="flex flex-col h-full bg-slate-950/40 rounded-2xl p-5 border border-white/5 m-5 lg:mr-0 z-20">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileImage className="text-blue-400 w-4.5 h-4.5" /> Image Input
                 </h2>
                 <div className="flex gap-2">
                   {previewUrl && (
                     <button 
                       onClick={resetScan} 
                       className="text-[10px] font-bold bg-slate-500/10 text-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-500/20 hover:bg-slate-500/20 hover:text-white transition-colors flex items-center gap-1"
                     >
                       <RefreshCw className="w-3 h-3" /> Reset
                     </button>
                   )}
                   <button 
                     onClick={loadSampleImage} 
                     className="text-[10px] font-bold bg-blue-500/10 text-blue-400 px-2.5 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                   >
                     Demo Scan
                   </button>
                 </div>
              </div>
              
              <div 
                onClick={() => !isAnalyzing && fileInputRef.current.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative flex-1 rounded-[1.5rem] flex flex-col items-center justify-center p-2 min-h-[300px] transition-all duration-300 overflow-hidden group ${
                  isAnalyzing ? 'cursor-not-allowed border-2 border-blue-500/30 bg-blue-900/10' :
                  isDragging ? 'bg-blue-900/20 border-2 border-dashed border-blue-500 scale-[1.01]' :
                  previewUrl ? 'bg-black/50 cursor-pointer border-2 border-transparent hover:border-white/10' : 
                  'border-2 border-dashed border-slate-700 bg-slate-900/50 cursor-pointer hover:border-blue-500/50 hover:bg-slate-800/50'
                }`}
              >
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} disabled={isAnalyzing} />
                
                {previewUrl ? (
                  <div className="relative w-full h-full min-h-[280px] flex items-center justify-center rounded-[1.25rem] overflow-hidden">
                    <img 
                      src={previewUrl} alt="Preview" className="max-h-[350px] object-contain rounded-xl z-10" 
                    />
                    
                    <AnimatePresence>
                      {isAnalyzing && (
                        <>
                          <motion.div 
                            initial={{ top: "-10%" }} animate={{ top: "110%" }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute left-0 right-0 h-1 bg-cyan-400 shadow-[0_0_30px_rgba(34,211,238,1)] z-20"
                          />
                          <div className="absolute inset-0 bg-blue-500/10 mix-blend-overlay z-10 animate-pulse"></div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-16 px-6 text-center pointer-events-none">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 border bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50 group-hover:border-blue-500/30">
                      <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <p className="text-white font-bold text-lg mb-1">Drop Thyroid Ultrasound</p>
                    <p className="text-slate-500 text-xs">JPG or PNG • High Contrast</p>
                  </div>
                )}
              </div>

              <motion.button 
                whileHover={(!selectedFile || isAnalyzing) ? {} : { scale: 1.02 }}
                whileTap={(!selectedFile || isAnalyzing) ? {} : { scale: 0.98 }}
                onClick={analyzeImage}
                disabled={!selectedFile || isAnalyzing}
                className={`mt-4 w-full py-3.5 rounded-[1rem] font-bold text-base transition-all flex items-center justify-center space-x-3 relative overflow-hidden ${
                  !selectedFile 
                    ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700/50' 
                    : isAnalyzing
                    ? 'bg-blue-600/80 text-white cursor-wait'
                    : 'bg-white text-slate-900 hover:bg-slate-100 shadow-[0_0_30px_rgba(255,255,255,0.15)]'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <Scan className="w-5 h-5 animate-spin" />
                    <span className="tracking-wide">AI Core Scanning...</span>
                  </>
                ) : (
                  <span className="tracking-wide flex items-center gap-2">Execute CNN Prediction <ArrowRight className="w-4 h-4"/></span>
                )}
              </motion.button>
            </div>

            {/* Right Column: Dynamic Results Panel */}
            <div className="flex flex-col h-full bg-slate-950/40 rounded-2xl p-5 border border-white/5 m-5 lg:ml-0 z-20 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="text-purple-400 w-4.5 h-4.5" /> Diagnosis Board
                </h2>
                {result && !isAnalyzing && (
                  <button
                    onClick={downloadReport}
                    className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Save Report
                  </button>
                )}
              </div>
              
              {!result && !isAnalyzing && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-16">
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-700/50 flex items-center justify-center mb-4">
                    <HeartPulse className="w-10 h-10 text-slate-600 stroke-[1.5]" />
                  </div>
                  <p className="font-semibold text-base">Awaiting Ultrasound Image</p>
                  <p className="text-xs text-slate-600 mt-1 max-w-xs text-center">Execute deep learning classification above to render report.</p>
                </div>
              )}

              {isAnalyzing && (
                <div className="flex-1 flex flex-col justify-center max-w-xs mx-auto w-full py-6">
                  <div className="flex justify-center mb-8">
                    <div className="relative w-20 h-20">
                      <motion.div animate={{ scale: [1, 1.4], opacity: [1, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 rounded-full border border-blue-500/50" />
                      <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 backdrop-blur-sm flex items-center justify-center bg-blue-500/5">
                        <Activity className="w-8 h-8 text-blue-400" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {steps.map((step, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="relative">
                          {index < analysisStep ? (
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                          ) : index === analysisStep ? (
                            <div className="w-6 h-6 rounded-full border-2 border-blue-400 flex items-center justify-center bg-blue-900/30">
                              <motion.div animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-2 h-2 bg-blue-400 rounded-full" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-slate-700 bg-slate-800/50 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-slate-600 rounded-full" />
                            </div>
                          )}
                          {index < steps.length - 1 && (
                            <div className={`absolute top-6 left-[11px] w-0.5 h-4 ${index < analysisStep ? 'bg-blue-500' : 'bg-slate-700'}`}></div>
                          )}
                        </div>
                        <span className={`text-xs font-semibold transition-colors duration-350 ${index < analysisStep ? 'text-slate-300' : index === analysisStep ? 'text-white' : 'text-slate-600'}`}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <AnimatePresence>
                {result && !isAnalyzing && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col h-full justify-between relative">
                    <div>
                      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 blur-[60px] rounded-full pointer-events-none ${result.prediction.toLowerCase().includes('abnormal') ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}></div>

                      <div className={`p-6 rounded-2xl flex flex-col items-center text-center space-y-3 mb-4 relative backdrop-blur-xl border ${result.prediction.toLowerCase().includes('abnormal') ? 'bg-red-950/20 border-red-500/30' : 'bg-emerald-950/20 border-emerald-500/30'}`}>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${result.prediction.toLowerCase().includes('abnormal') ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                          {result.prediction.toLowerCase().includes('abnormal') ? <AlertTriangle className="w-8 h-8" /> : <CheckCircle className="w-8 h-8" />}
                        </div>
                        <div>
                          <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">TI-RADS Prediction</p>
                          <h3 className={`text-2xl font-black ${result.prediction.toLowerCase().includes('abnormal') ? 'text-red-400' : 'text-emerald-400'}`}>{result.category}</h3>
                          <p className="text-xs text-slate-300 mt-1 font-semibold">Diagnosis: {result.prediction}</p>
                          {result.level && result.level !== "None" && (
                            <div className="mt-2.5 inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-xl text-red-400 text-xs font-bold">
                              <ShieldAlert className="w-4 h-4" /> Severity: {result.level}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 mb-4">
                        <h4 className="text-white font-bold text-sm mb-1.5 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-blue-400" /> AI Diagnostic insights</h4>
                        <p className="text-slate-300 text-xs leading-relaxed">{result.message}</p>
                      </div>

                      {result.doctors && result.doctors.length > 0 && (
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 mb-4">
                          <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5 text-purple-400" /> Recommended Endocrinology Consultations</h4>
                          <div className="space-y-3">
                            {result.doctors.map((doctor, idx) => (
                              <div key={idx} className="bg-slate-800/40 p-3 rounded-xl border border-white/5 flex flex-col gap-1 hover:bg-slate-850 transition-colors">
                                <span className="text-white font-bold text-sm">{doctor.name}</span>
                                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                                  <MapPin className="w-3.5 h-3.5" /> <span>{doctor.hospital}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-blue-450 text-xs font-semibold">
                                  <Phone className="w-3.5 h-3.5" /> <span>{doctor.phone}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {result.confidence > 0 && (
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                        <div className="flex justify-between mb-2 items-end">
                          <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Classification Confidence</span>
                          <span className="font-black text-white text-xl">{result.confidence}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${result.confidence}%` }} transition={{ duration: 1.5 }} className={`h-full rounded-full ${result.prediction.toLowerCase().includes('abnormal') ? 'bg-gradient-to-r from-red-650 to-pink-500' : 'bg-gradient-to-r from-emerald-650 to-teal-500'}`} />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* User Support Ticketing Section */}
          <div className="w-full max-w-6xl z-10 mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-lg p-6"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <HelpCircle className="text-blue-400 w-5 h-5" /> Support & Clinical Query Desk
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left side: Submit ticket */}
                <form onSubmit={handleQuerySubmit} className="space-y-3 lg:border-r lg:border-white/5 lg:pr-6">
                  <span className="text-xs text-slate-400 font-medium">Submit a clinical or system query to our specialists. We will answer shortly.</span>
                  <textarea
                    rows={4}
                    value={newQueryText}
                    onChange={e => setNewQueryText(e.target.value)}
                    required
                    placeholder="Enter your question here (e.g. details on TI-RADS risk guidelines, patient symptoms monitoring, database records correction)..."
                    className="w-full bg-slate-950/50 border border-slate-700/50 text-white rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-slate-900 transition-all placeholder:text-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={isQuerySubmitting}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" /> {isQuerySubmitting ? 'Sending...' : 'Send Query Ticket'}
                  </button>
                </form>

                {/* Right side: List submitted tickets */}
                <div className="lg:col-span-2 space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  <h4 className="text-sm font-bold text-slate-350">My Ticket Inbox</h4>
                  
                  {userQueries.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-8">No tickets submitted. Ask your questions on the left.</p>
                  ) : (
                    userQueries.map(q => (
                      <div key={q.id} className="bg-slate-950/40 p-4 rounded-xl border border-white/5 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-xs text-slate-200 font-semibold">{q.question}</p>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 border ${
                            q.status === 'answered' 
                              ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-450 border-amber-500/20'
                          }`}>
                            {q.status}
                          </span>
                        </div>
                        {q.response ? (
                          <div className="bg-blue-950/10 border-l-2 border-blue-500 p-2 text-xs text-slate-350">
                            <span className="font-bold text-blue-400 block text-[10px] uppercase mb-0.5">Admin Response:</span>
                            {q.response}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500 italic">Awaiting response from clinical admin.</p>
                        )}
                        <span className="text-[9px] text-slate-600 block text-right">
                          {new Date(q.created_at).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </motion.div>
          </div>

          <ScanHistory />
          <HealthTips />
        </div>
      )}

      {/* -------------------- ADMIN CONSOLE VIEW -------------------- */}
      {viewMode === 'admin' && storedUser?.role === 'admin' && (
        <div className="w-full max-w-6xl z-10 flex flex-col items-center">
          
          {/* Admin Navigation Header */}
          <div className="w-full bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-2 mb-6 flex flex-wrap gap-1">
            {[
              { id: 'dashboard', label: 'Stats Panel', icon: Activity },
              { id: 'users', label: 'User Control', icon: Users },
              { id: 'predictions', label: 'Scans & Predictions Audit', icon: Layers },
              { id: 'tips', label: 'Health Tips Manager', icon: Stethoscope },
              { id: 'queries', label: 'Support & Help Desk Tickets', icon: HelpCircle },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveAdminTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeAdminTab === tab.id 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Admin Tab Contents */}
          <div className="w-full bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 shadow-xl relative min-h-[400px]">
            
            {/* 1. Stats Dashboard */}
            {activeAdminTab === 'dashboard' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2">System Analytics & Monitoring Dashboard</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { title: "Total User Accounts", value: adminStats.total_users, desc: "Total registered clinician & user profiles", color: "from-blue-500 to-cyan-500" },
                    { title: "Ultrasound Scans Audited", value: adminStats.total_images, desc: "Total ultrasound files uploaded and processed", color: "from-purple-500 to-pink-500" },
                    { title: "System Predictions Made", value: adminStats.total_predictions, desc: "Successful TI-RADS neural classifications", color: "from-emerald-500 to-teal-500" },
                    { title: "Pending Help Tickets", value: adminStats.pending_queries, desc: "Clinical or general support queries awaiting reply", color: "from-amber-500 to-orange-500", highlight: adminStats.pending_queries > 0 },
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-950/40 p-5 rounded-2xl border border-white/5 flex flex-col justify-between relative overflow-hidden group">
                      {stat.highlight && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                      )}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-2">{stat.title}</span>
                        <span className="text-3xl font-black text-white">{stat.value}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-4 leading-normal">{stat.desc}</span>
                      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.color} opacity-70 group-hover:h-1.5 transition-all`}></div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-950/30 p-5 rounded-2xl border border-white/5">
                  <h4 className="text-sm font-bold text-white mb-2">Diagnostic Core Engine Status</h4>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/5">
                      <span className="text-slate-400">Database Connection</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Stable (MySQL Engine Active)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/5">
                      <span className="text-slate-400">AI Model Framework</span>
                      <span className="text-blue-400 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> TensorFlow Serving Interface Pre-trained</span>
                    </div>
                    <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/5">
                      <span className="text-slate-400">Upload Storage Directories</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Local Static File Storage Mounted</span>
                    </div>
                    <div className="flex items-center justify-between text-xs py-1.5">
                      <span className="text-slate-400">HIPAA Compliance Filter</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Metadata Masking Enabled</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. User Control */}
            {activeAdminTab === 'users' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h3 className="text-lg font-bold text-white">Clinician & User Account Registry</h3>
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setUserForm({ name: '', email: '', password: '', role: 'user' });
                      setShowAddUserModal(true);
                    }}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add User Profile
                  </button>
                </div>

                {showAddUserModal && (
                  <form onSubmit={handleUserFormSubmit} className="bg-slate-950/60 p-5 rounded-2xl border border-blue-500/20 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-white">{editingUser ? 'Edit User Credentials' : 'Add New User Profile'}</span>
                      <button type="button" onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Full Name</label>
                        <input
                          type="text"
                          required
                          value={userForm.name}
                          onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700/50 text-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-blue-500"
                          placeholder="Dr. Smith"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Email</label>
                        <input
                          type="email"
                          required
                          value={userForm.email}
                          onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700/50 text-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-blue-500"
                          placeholder="doctor@hosp.org"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Password {editingUser && '(leave blank to keep current)'}</label>
                        <input
                          type="password"
                          required={!editingUser}
                          value={userForm.password}
                          onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700/50 text-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-blue-500"
                          placeholder="••••••••"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Security Role</label>
                        <select
                          value={userForm.role}
                          onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700/50 text-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-blue-500"
                        >
                          <option value="user">User (Clinician Workspace)</option>
                          <option value="admin">Administrator (Full Access)</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddUserModal(false)}
                        className="bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                      >
                        {editingUser ? 'Save Changes' : 'Create Account'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400">
                        <th className="py-2.5 font-bold">User ID</th>
                        <th className="py-2.5 font-bold">Name</th>
                        <th className="py-2.5 font-bold">Email</th>
                        <th className="py-2.5 font-bold">Role</th>
                        <th className="py-2.5 font-bold">Created At</th>
                        <th className="py-2.5 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map(u => (
                        <tr key={u.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                          <td className="py-3 text-slate-500">#{u.id}</td>
                          <td className="py-3 text-white font-bold">{u.name}</td>
                          <td className="py-3 text-slate-300">{u.email}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              u.role === 'admin' 
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 text-slate-450">{new Date(u.created_at).toLocaleDateString()}</td>
                          <td className="py-3 text-right space-x-1.5">
                            <button onClick={() => handleEditUserClick(u)} className="text-blue-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeleteUser(u.id)} disabled={u.id === storedUser?.id} className="text-red-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-30"><Trash2 className="w-3.5 h-3.5" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* 3. Audit Monitor (Predictions) */}
            {activeAdminTab === 'predictions' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2">Uploaded Scans & System Predictions Audit Logs</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400">
                        <th className="py-2.5 font-bold">ID</th>
                        <th className="py-2.5 font-bold">Uploaded File</th>
                        <th className="py-2.5 font-bold">Uploaded By</th>
                        <th className="py-2.5 font-bold">Classification</th>
                        <th className="py-2.5 font-bold">TI-RADS Category</th>
                        <th className="py-2.5 font-bold">Auditing Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminPredictions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-500">No predictions recorded in system database.</td>
                        </tr>
                      ) : (
                        adminPredictions.map(pred => (
                          <tr key={pred.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                            <td className="py-3 text-slate-500">#{pred.id}</td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <img
                                  src={`http://127.0.0.1:8000/uploads/${pred.filename}`}
                                  alt="scan"
                                  className="w-10 h-10 object-cover rounded-lg border border-white/10"
                                  onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=100&auto=format&fit=crop"; }}
                                />
                                <span className="font-mono text-slate-300 text-[11px] max-w-[120px] truncate" title={pred.filename}>{pred.filename}</span>
                              </div>
                            </td>
                            <td className="py-3 text-white">
                              <div className="font-bold">{pred.user_name}</div>
                              <div className="text-[10px] text-slate-500">{pred.user_email}</div>
                            </td>
                            <td className="py-3">
                              <span className={`font-semibold ${pred.prediction.toLowerCase().includes('abnormal') ? 'text-red-400' : 'text-emerald-400'}`}>
                                {pred.prediction}
                              </span>
                            </td>
                            <td className="py-3 text-white font-bold">{pred.category}</td>
                            <td className="py-3 text-slate-500">{new Date(pred.created_at).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* 4. Health Tips Manager */}
            {activeAdminTab === 'tips' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h3 className="text-lg font-bold text-white">Health Tips Content Editor</h3>
                  <button
                    onClick={() => {
                      setEditingTip(null);
                      setTipForm({ title: '', description: '' });
                      setShowAddTipModal(true);
                    }}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Health Tip
                  </button>
                </div>

                {showAddTipModal && (
                  <form onSubmit={handleTipFormSubmit} className="bg-slate-950/60 p-5 rounded-2xl border border-blue-500/20 space-y-4 max-w-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-white">{editingTip ? 'Edit Health Tip Content' : 'Create New Health Tip'}</span>
                      <button type="button" onClick={() => setShowAddTipModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Tip Title</label>
                        <input
                          type="text"
                          required
                          value={tipForm.title}
                          onChange={e => setTipForm({ ...tipForm, title: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700/50 text-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-blue-500"
                          placeholder="e.g. Levothyroxine absorption"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Tip Description</label>
                        <textarea
                          rows={3}
                          required
                          value={tipForm.description}
                          onChange={e => setTipForm({ ...tipForm, description: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700/50 text-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-blue-500"
                          placeholder="Provide description guidelines or clinical advice..."
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddTipModal(false)}
                        className="bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white px-4 py-2 rounded-xl text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold"
                      >
                        {editingTip ? 'Save' : 'Publish Tip'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {adminTips.map(tip => (
                    <div key={tip.id} className="bg-slate-950/40 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-amber-300 text-sm mb-1">{tip.title}</h4>
                        <p className="text-slate-350 text-xs leading-relaxed">{tip.description}</p>
                      </div>
                      <div className="flex justify-end gap-2 border-t border-white/5 mt-3 pt-2">
                        <button onClick={() => handleEditTipClick(tip)} className="text-blue-400 hover:text-white p-1.5 hover:bg-white/5 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteTip(tip.id)} className="text-red-400 hover:text-white p-1.5 hover:bg-white/5 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 5. Queries Support Desk */}
            {activeAdminTab === 'queries' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2">Support & Clinical Help Desk Tickets</h3>
                
                <div className="space-y-4">
                  {adminQueries.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-8">No help desk tickets registered in system.</p>
                  ) : (
                    adminQueries.map(q => (
                      <div key={q.id} className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-3">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <div>
                            <span className="text-[10px] text-slate-500 block">From: <strong className="text-slate-300">{q.user_name}</strong> ({q.user_email})</span>
                            <span className="text-[9px] text-slate-500">{new Date(q.created_at).toLocaleString()}</span>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            q.status === 'answered' 
                              ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-450 border-amber-500/20 animate-pulse'
                          }`}>
                            {q.status === 'answered' ? 'Answered' : 'Awaiting Reply'}
                          </span>
                        </div>
                        
                        <p className="text-xs text-white font-bold bg-slate-900/60 p-3 rounded-lg border border-white/5">
                          Query: "{q.question}"
                        </p>

                        {q.response ? (
                          <div className="bg-blue-950/15 border-l-2 border-blue-500 p-3 text-xs text-slate-300">
                            <span className="font-bold text-blue-400 block text-[10px] uppercase mb-0.5">Admin Response:</span>
                            {q.response}
                          </div>
                        ) : (
                          <div className="space-y-2 border-t border-white/5 pt-3">
                            <textarea
                              rows={2}
                              value={replyTextMap[q.id] || ''}
                              onChange={e => setReplyTextMap({ ...replyTextMap, [q.id]: e.target.value })}
                              placeholder="Type respond message and click send..."
                              className="w-full bg-slate-900 border border-slate-700/50 text-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-blue-500"
                            />
                            <div className="flex justify-end">
                              <button
                                onClick={() => handleReplySubmit(q.id)}
                                disabled={!replyTextMap[q.id]?.trim()}
                                className="bg-blue-600 hover:bg-blue-550 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all"
                              >
                                Submit Response
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

          </div>

        </div>
      )}

      {/* Floating Chatbot */}
      <Chatbot />
    </div>
  );
}

export default Dashboard;
