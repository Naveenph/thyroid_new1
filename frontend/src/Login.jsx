import { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Lock, User, ArrowRight, Activity, ShieldCheck, Zap, Scan, Mail, UserPlus, LogIn, ShieldAlert, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NeuralBackground from './NeuralBackground';
import { useToast } from './Toast';

function Login() {
  const [loginRole, setLoginRole] = useState('user'); // 'user' (Patient) or 'admin' (Administrator)
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 2FA states
  const [show2FA, setShow2FA] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');

  const navigate = useNavigate();
  const addToast = useToast();

  // Mouse tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth out the mouse movement for the 3D tilt
  const smoothMouseX = useSpring(mouseX, { damping: 50, stiffness: 400 });
  const smoothMouseY = useSpring(mouseY, { damping: 50, stiffness: 400 });

  // Transform mouse position to rotation angles (tilt effect)
  const rotateX = useTransform(smoothMouseY, [-0.5, 0.5], [15, -15]);
  const rotateY = useTransform(smoothMouseX, [-0.5, 0.5], [-15, 15]);

  // Spotlight position
  const spotlightX = useTransform(smoothMouseX, [-0.5, 0.5], ['0%', '100%']);
  const spotlightY = useTransform(smoothMouseY, [-0.5, 0.5], ['0%', '100%']);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      mouseX.set(e.clientX / innerWidth - 0.5);
      mouseY.set(e.clientY / innerHeight - 0.5);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (isRegister) {
      if (password !== confirmPassword) {
        addToast({
          type: 'error',
          title: 'Validation Error',
          message: 'Passwords do not match.'
        });
        setIsLoading(false);
        return;
      }

      if (loginRole === 'admin') {
        // Admin registration
        try {
          const res = await axios.post('http://127.0.0.1:8000/api/admin/register', {
            name,
            email,
            password
          });
          
          addToast({
            type: 'success',
            title: 'Admin Registered',
            message: res.data.message
          });
          
          setIsRegister(false);
          setPassword('');
          setConfirmPassword('');
        } catch (err) {
          addToast({
            type: 'error',
            title: 'Registration Failed',
            message: err.response?.data?.message || 'Could not complete admin registration.'
          });
        }
      } else {
        // Patient/User registration
        try {
          const res = await axios.post('http://127.0.0.1:8000/api/register', {
            name,
            email,
            password
          });
          
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data.user));
          
          addToast({
            type: 'success',
            title: 'Registration Successful',
            message: `Welcome, ${res.data.user.name}!`
          });
          
          navigate('/dashboard');
        } catch (err) {
          addToast({
            type: 'error',
            title: 'Registration Failed',
            message: err.response?.data?.message || 'Could not complete registration.'
          });
        }
      }
    } else {
      // Login flow
      try {
        const res = await axios.post('http://127.0.0.1:8000/api/login', {
          email,
          password,
          required_role: loginRole
        });
        
        if (res.data.status === '2fa_required') {
          // Trigger 2FA view for admin
          setVerificationEmail(res.data.email);
          setShow2FA(true);
          console.log("Admin 2FA Security Code:", res.data.code);
          addToast({
            type: 'info',
            title: 'Security Code Generated',
            message: res.data.message
          });
        } else {
          // Standard login success (patient)
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data.user));
          
          addToast({
            type: 'success',
            title: 'Access Granted',
            message: `Welcome, ${res.data.user.name}!`
          });
          
          navigate('/dashboard');
        }
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Authentication Denied',
          message: err.response?.data?.message || 'Invalid email or password.'
        });
      }
    }
    
    setIsLoading(false);
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await axios.post('http://127.0.0.1:8000/api/login/verify-2fa', {
        email: verificationEmail,
        code: verificationCode
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      addToast({
        type: 'success',
        title: 'Admin Access Granted',
        message: `Welcome, ${res.data.user.name}!`
      });

      setShow2FA(false);
      setVerificationCode('');
      navigate('/dashboard');
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Verification Failed',
        message: err.response?.data?.message || 'Invalid or expired security code.'
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center relative overflow-hidden font-sans perspective-1000">
      
      {/* Interactive Spotlight following cursor */}
      <motion.div 
        className="absolute w-[800px] h-[800px] bg-blue-500/15 rounded-full blur-[150px] pointer-events-none z-0 mix-blend-screen"
        style={{
          left: spotlightX,
          top: spotlightY,
          translateX: '-50%',
          translateY: '-50%'
        }}
      />

      {/* Dynamic Backgrounds that shift with mouse */}
      <div className="absolute inset-0 z-0">
        <NeuralBackground />
        <motion.div 
          style={{ x: useTransform(smoothMouseX, [-0.5, 0.5], [-50, 50]), y: useTransform(smoothMouseY, [-0.5, 0.5], [-50, 50]) }}
          animate={{ scale: [1, 1.3, 1], borderRadius: ["40%", "60%", "40%"] }} 
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-gradient-to-r from-blue-600/20 to-cyan-500/20 blur-[100px] pointer-events-none mix-blend-screen"
        />
        <motion.div 
          style={{ x: useTransform(smoothMouseX, [-0.5, 0.5], [50, -50]), y: useTransform(smoothMouseY, [-0.5, 0.5], [50, -50]) }}
          animate={{ scale: [1, 1.5, 1], borderRadius: ["60%", "40%", "60%"] }} 
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-gradient-to-r from-purple-600/20 to-pink-500/20 blur-[120px] pointer-events-none mix-blend-screen"
        />
      </div>

      <div className="w-full max-w-7xl z-10 mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-12 lg:py-0">
        
        {/* Left Side: Futuristic Branding & Info */}
        <div className="flex flex-col justify-center space-y-8 lg:pr-10 relative">
          
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-sm mb-6 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              Diagnostic Core v2.0 Online
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 leading-tight">
              Thyroid Disease <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                Prediction System
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-md leading-relaxed font-medium">
              Empowering clinics with real-time, high-precision nodule detection using state-of-the-art EfficientNet deep learning models.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors shadow-lg"
            >
              <Zap className="w-8 h-8 text-amber-400 mb-4 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
              <h3 className="font-bold text-white text-lg">Instant Analysis</h3>
              <p className="text-slate-400 text-sm mt-1">Results delivered in under 2 seconds from upload.</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors shadow-lg"
            >
              <ShieldCheck className="w-8 h-8 text-emerald-400 mb-4 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
              <h3 className="font-bold text-white text-lg">Clinical Accuracy</h3>
              <p className="text-slate-400 text-sm mt-1">Trained on thousands of certified real cases.</p>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="hidden lg:flex items-center gap-4 mt-8 pt-8 border-t border-white/10"
          >
            <div className="flex -space-x-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`w-12 h-12 rounded-full border-2 border-[#020617] flex items-center justify-center bg-gradient-to-br ${i===1 ? 'from-blue-500 to-purple-600' : i===2 ? 'from-emerald-400 to-cyan-500' : i===3 ? 'from-rose-400 to-orange-500' : 'from-indigo-400 to-blue-500'} shadow-lg`} style={{ zIndex: 10 - i }}>
                  <User className="w-5 h-5 text-white/80" />
                </div>
              ))}
            </div>
            <div className="text-sm pl-2">
              <p className="text-white font-bold text-base">Trusted by Specialists</p>
              <p className="text-slate-400">Join 500+ clinics globally</p>
            </div>
          </motion.div>
        </div>

        {/* Right Side: 3D Tilting Card */}
        <div className="flex justify-center lg:justify-end">
          <motion.div 
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="w-full max-w-md z-10"
          >
            <motion.div 
              style={{ transform: "translateZ(50px)" }}
              className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)] p-8 md:p-10 relative overflow-hidden group hover:border-white/20 transition-colors duration-500"
            >
              {/* Animated top border */}
              <motion.div 
                animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 bg-[length:200%_auto]"
              />

              {show2FA ? (
                /* ------------------ 2FA SECURITY CODE FORM ------------------ */
                <div>
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center mb-4 border border-purple-500/30 backdrop-blur-md">
                      <KeyRound className="w-8 h-8 text-purple-400" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-1 tracking-tight">
                      Security Verification
                    </h2>
                    <p className="text-slate-400 text-center text-xs font-medium">
                      Enter the 6-digit access code printed in your server terminal console.
                    </p>
                  </div>

                  <form onSubmit={handleVerify2FA} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-350 uppercase tracking-wider ml-1">Security Code</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        className="w-full bg-slate-950/50 border border-slate-700/50 text-white rounded-xl text-center py-4 font-mono text-2xl tracking-widest focus:outline-none focus:border-purple-500/50 focus:bg-slate-900/80 transition-all placeholder:text-slate-700 shadow-inner"
                        placeholder="000000"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>

                    <motion.button
                      whileHover={isLoading ? {} : { scale: 1.02, boxShadow: "0 0 30px rgba(168,85,247,0.4)" }}
                      whileTap={isLoading ? {} : { scale: 0.98 }}
                      type="submit"
                      disabled={isLoading}
                      className="w-full mt-4 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center bg-gradient-to-r from-purple-650 to-indigo-650 hover:from-purple-550 hover:to-indigo-555 transition-all text-xs"
                    >
                      <span>{isLoading ? "Verifying..." : "Confirm & Access Console"}</span>
                    </motion.button>

                    <button
                      type="button"
                      onClick={() => {
                        setShow2FA(false);
                        setVerificationCode('');
                      }}
                      className="w-full text-slate-500 hover:text-slate-350 text-xs font-bold mt-2"
                    >
                      Back to Login
                    </button>
                  </form>
                </div>
              ) : (
                /* ------------------ STANDARD LOGIN / SIGNUP FORM ------------------ */
                <div>
                  <div className="flex flex-col items-center mb-6">
                    <motion.div 
                      whileHover={{ rotate: 180, scale: 1.1 }}
                      transition={{ duration: 0.5, type: "spring" }}
                      className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-4 border border-white/10 backdrop-blur-md relative overflow-hidden"
                    >
                      <Scan className="w-8 h-8 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] z-10" />
                      <motion.div 
                        animate={{ y: [-24, 24, -24] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-full h-[2px] bg-cyan-400 absolute opacity-70 shadow-[0_0_15px_cyan]"
                      />
                    </motion.div>
                    <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-1 tracking-tight">
                      {isRegister ? (loginRole === 'admin' ? "Register Admin" : "Create Account") : loginRole === 'admin' ? "Admin Terminal" : "Patient Portal"}
                    </h2>
                    <p className="text-slate-400 text-center text-xs font-medium">
                      {isRegister ? "Register a new diagnostic credentials" : loginRole === 'admin' ? "Access the central patient databases" : "Access your patient/clinician workspace"}
                    </p>
                  </div>

                  {/* Portal Selector Tabs */}
                  <div className="flex bg-slate-950/60 p-1.5 rounded-xl border border-white/5 mb-6">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginRole('user');
                        setIsRegister(false);
                      }}
                      className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                        loginRole === 'user'
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Patient Workspace
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginRole('admin');
                        setIsRegister(false);
                      }}
                      className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                        loginRole === 'admin'
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Admin Terminal
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegister && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider ml-1">Full Name</label>
                        <div className="relative group/input">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <User className="h-4.5 w-4.5 text-slate-400 group-focus-within/input:text-blue-400 transition-colors" />
                          </div>
                          <input
                            type="text"
                            required
                            className="w-full bg-slate-950/50 border border-slate-700/50 text-white rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-slate-900/80 transition-all placeholder:text-slate-500 shadow-inner"
                            placeholder={loginRole === 'admin' ? "System Admin" : "Dr. John Doe"}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider ml-1">
                        {loginRole === 'admin' ? "Admin Email" : "Email Address"}
                      </label>
                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="h-4.5 w-4.5 text-slate-400 group-focus-within/input:text-blue-400 transition-colors" />
                        </div>
                        <input
                          type="email"
                          required
                          className="w-full bg-slate-950/50 border border-slate-700/50 text-white rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-slate-900/80 transition-all placeholder:text-slate-500 shadow-inner"
                          placeholder={loginRole === 'admin' ? "admin@thyroid.com" : "doctor@clinic.com"}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider ml-1">Password</label>
                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-4.5 w-4.5 text-slate-400 group-focus-within/input:text-purple-400 transition-colors" />
                        </div>
                        <input
                          type="password"
                          required
                          className="w-full bg-slate-950/50 border border-slate-700/50 text-white rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 focus:bg-slate-900/80 transition-all placeholder:text-slate-500 shadow-inner"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    {isRegister && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider ml-1">Confirm Password</label>
                        <div className="relative group/input">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock className="h-4.5 w-4.5 text-slate-400 group-focus-within/input:text-pink-400 transition-colors" />
                          </div>
                          <input
                            type="password"
                            required
                            className="w-full bg-slate-950/50 border border-slate-700/50 text-white rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-pink-500/50 focus:bg-slate-900/80 transition-all placeholder:text-slate-500 shadow-inner"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <motion.button
                      whileHover={isLoading ? {} : { scale: 1.02, boxShadow: loginRole === 'admin' ? "0 0 30px rgba(168,85,247,0.4)" : "0 0 30px rgba(59,130,246,0.4)" }}
                      whileTap={isLoading ? {} : { scale: 0.98 }}
                      type="submit"
                      disabled={isLoading}
                      className={`w-full mt-4 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all relative overflow-hidden group/btn disabled:opacity-50 shadow-md ${
                        loginRole === 'admin'
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'
                      }`}
                    >
                      <span className="relative z-10 flex items-center gap-2 tracking-wide text-xs">
                        {isLoading ? (
                          "Authenticating..."
                        ) : isRegister ? (
                          loginRole === 'admin' ? <>Register Admin Profile <UserPlus className="w-4 h-4" /></> : <>Register Profile <UserPlus className="w-4 h-4" /></>
                        ) : loginRole === 'admin' ? (
                          <>Verify Admin Credentials <LogIn className="w-4 h-4" /></>
                        ) : (
                          <>Access Patient Workspace <LogIn className="w-4 h-4" /></>
                        )}
                      </span>
                    </motion.button>
                  </form>

                  {/* Toggle text */}
                  <div className="mt-6 text-center text-slate-400 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegister(!isRegister);
                        setPassword('');
                        setConfirmPassword('');
                      }}
                      className="text-blue-400 hover:underline font-bold font-mono text-[11px]"
                    >
                      {isRegister 
                        ? (loginRole === 'admin' ? "Already have an Admin account? Sign In" : "Already have an account? Sign In") 
                        : (loginRole === 'admin' ? "Need a new Admin Profile? Register Admin" : "Don't have an account? Sign Up")}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
            
            <div className="mt-8 flex items-center justify-center gap-2 text-slate-500 text-xs" style={{ transform: "translateZ(20px)" }}>
              <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span>HIPAA Compliant & End-to-End Encrypted</span>
            </div>
          </motion.div>
        </div>
        
      </div>
    </div>
  );
}

export default Login;
