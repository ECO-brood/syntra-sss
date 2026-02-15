import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Brain, CheckCircle, ChevronRight, MessageCircle,
  Calendar, Settings, User, Globe, ArrowRight, Sparkles, Send, 
  Plus, Trash2, Smile, Activity, Lightbulb, LogOut, Lock, Mail, 
  UserCircle, PenTool, ShieldCheck, Cloud, RefreshCw, Bell, 
  WifiOff
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, 
  onAuthStateChanged, signOut, createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, onSnapshot, 
  serverTimestamp, doc, setDoc, getDoc, deleteDoc, updateDoc, 
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager
} from 'firebase/firestore';

// --- CONFIGURATION ---

// 1. OPENROUTER API KEY (Grok / Claude / GPT)
// This logic checks for a Vercel Environment Variable first.
// If not found, it falls back to your hardcoded key so it works immediately.
const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || "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";

// 2. MODEL SELECTION
// Currently set to Grok 2 as requested.
// Options: "x-ai/grok-2-1212", "openai/gpt-4o", "anthropic/claude-3.5-sonnet"
const AI_MODEL = "x-ai/grok-2-1212"; 

// 3. FIREBASE CONFIGURATION
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyAu3Mwy1E82hS_8n9nfmaxl_ji7XWb5KoM",
      authDomain: "syntra-9e959.firebaseapp.com",
      projectId: "syntra-9e959",
      storageBucket: "syntra-9e959.firebasestorage.app",
      messagingSenderId: "858952912964",
      appId: "1:858952912964:web:eef39b1b848a0090af2c11",
      measurementId: "G-P3G12J3TTE"
    };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const appId = typeof __app_id !== 'undefined' ? __app_id : 'syntra-web-v2';

// --- FALLBACK DATA ---
const MOCK_PROFILE = { name: "Student", age: "18", c_score: 50, o_score: 50 };

// --- HELPER: SIMULATED AUTH ID ---
const getHybridUserId = (email) => {
  if (!email) return null;
  return email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
};

// --- NEW AI API HELPER (OPENROUTER STANDARD) ---
const callAI = async (messages, systemInstruction = "") => {
  if (!apiKey || apiKey.includes("PASTE_YOUR")) {
    return "⚠️ Error: API Key is missing.";
  }

  try {
    // 1. Construct standard OpenAI-format message list
    // System message comes first
    const apiMessages = [
        { role: "system", content: systemInstruction },
        ...messages
    ];

    console.log(`[AI] Sending request to ${AI_MODEL}...`);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://syntra.app", // Required by OpenRouter for rankings
        "X-Title": "Syntra App"
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: apiMessages,
        temperature: 0.7, // Creativity level
        max_tokens: 1000  // Response length limit
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AI Error] ${response.status}:`, errorText);
        return `⚠️ AI Error (${response.status}): ${errorText.slice(0, 100)}`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "(No response content)";

  } catch (e) {
    console.error("[AI Connection Error]:", e);
    return "⚠️ Connection Error: Check internet or API key.";
  }
};

// --- LOCALIZATION ---
const LANGUAGES = {
  en: {
    welcome: "Welcome to Syntra",
    subtitle: "Discover your brain's optimal learning code.",
    start: "Start Journey",
    login_title: "Student Portal",
    signup_title: "New Registration",
    email: "Email Address",
    password: "Password",
    name: "Full Name",
    age: "Age",
    login_btn: "Secure Login",
    signup_btn: "Create Account",
    guest_btn: "Access Platform",
    switch_signup: "New here? Register",
    switch_login: "Have account? Sign in",
    dashboard: "Dashboard",
    chat: "Aura Guide",
    plan: "Smart Planner",
    journal: "Neuro Journal",
    task_add: "Add Task",
    task_magic: "Magic Breakdown",
    submit: "Submit",
    next: "Next",
    analyzing: "Analyzing Profile...",
    logout: "Log Out",
    scenario: "Scenario",
    delete: "Delete",
    chat_placeholder: "Talk to Aura...",
    essay_c: "Think about a time you had a very difficult goal. How did you handle the pressure and the planning?",
    essay_o: "If you could invent a new subject to be taught in schools that doesn't exist yet, what would it be and why?",
    essay_free: "Free Space (20 mins): Write about anything on your mind right now.",
    essay_title_c: "Part 1: Behavior Analysis",
    essay_title_o: "Part 2: Imagination Analysis",
    essay_title_free: "Part 3: Free Association",
    type_here: "Type your response here...",
    syncing: "Online",
    inbox: "Inbox",
    welcome_subject: "Welcome to Syntra!",
    auth_note: "Note: Authenticated via Secure Session.",
    task_auto_added: "Task added:",
    task_auto_updated: "Task updated:",
    offline_mode: "Offline",
    reconnect: "Retry",
    connect_error: "Connection Issue"
  },
  ar: {
    welcome: "مرحباً بك في سينترا",
    subtitle: "اكتشف الطريقة المثالية لمخك في المذاكرة",
    start: "ابدأ الرحلة",
    login_title: "بوابة الطالب",
    signup_title: "تسجيل جديد",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    name: "الاسم بالكامل",
    age: "العمر",
    login_btn: "دخول آمن",
    signup_btn: "إنشاء حساب",
    guest_btn: "دخول المنصة",
    switch_signup: "جديد؟ سجل الآن",
    switch_login: "لديك حساب؟ دخول",
    dashboard: "الرئيسية",
    chat: "المساعد (أورا)",
    plan: "المهام الذكية",
    journal: "المذكرات",
    task_add: "إضافة مهمة",
    task_magic: "تقسيم ذكي",
    submit: "تأكيد",
    next: "التالي",
    analyzing: "جاري التحليل...",
    logout: "خروج",
    scenario: "موقف",
    delete: "حذف",
    chat_placeholder: "اتكلم مع أورا...",
    essay_c: "افتكر موقف كان عندك فيه هدف صعب جداً. اتصرفت ازاي مع الضغط والتخطيط؟",
    essay_o: "لو تقدر تخترع مادة جديدة تدرس في المدارس مش موجودة دلوقتي، هتكون إيه وليه؟",
    essay_free: "مساحة حرة (٢٠ دقيقة): اكتب عن أي حاجة في دماغك دلوقتي.",
    essay_title_c: "الجزء ١: تحليل السلوك",
    essay_title_o: "الجزء ٢: تحليل الخيال",
    essay_title_free: "الجزء ٣: مساحة حرة",
    type_here: "اكتب إجابتك هنا...",
    syncing: "متصل",
    inbox: "صندوق الوارد",
    welcome_subject: "مرحباً بك في سينترا!",
    auth_note: "ملاحظة: تم التوثيق عبر جلسة آمنة.",
    task_auto_added: "تم إضافة:",
    task_auto_updated: "تم تعديل:",
    offline_mode: "غير متصل",
    reconnect: "إعادة المحاولة",
    connect_error: "مشكلة في الاتصال"
  }
};

const FULL_SJT = [
    { id: 1, trait: 'C', text_en: "It's Thursday evening, and you have a major biology assignment due on Monday morning...", text_ar: "النهارده الخميس بالليل، وعندك واجب أحياء كبير لازم يتسلم الاثنين الصبح...", options_en: ["Decline the trip immediately...", "Go on the trip but wake up early...", "Take your laptop...", "Go on the trip and decide to copy..."], options_ar: ["أعتذر عن الرحلة فوراً...", "أطلع الرحلة بس أصحى بدري...", "آخد اللابتوب...", "أطلع الرحلة وأبقى أنقل..."] },
    // (Ensure you keep the full list of 40 questions here if you have them, shortened for brevity in this snippet)
];

// --- MAIN COMPONENT ---
export default function SyntraApp() {
  const [lang, setLang] = useState('en');
  const [activeUserId, setActiveUserId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('auth');
  const [isOffline, setIsOffline] = useState(false);
  const [user, setUser] = useState(null);

  const t = LANGUAGES[lang];
  const isRTL = lang === 'ar';

  useEffect(() => {
    const init = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else if (!auth.currentUser) {
        await signInAnonymously(auth).catch(() => {
            console.warn("Offline: Auth failed.");
            setIsOffline(true);
        });
      }
    };
    init();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const storedEmail = localStorage.getItem('syntra_user_email');
        if (storedEmail) {
           const hybridId = getHybridUserId(storedEmail);
           setActiveUserId(hybridId);
           await loadProfile(hybridId);
        } else {
           setLoading(false);
           setView('auth');
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadProfile = async (id) => {
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', id, 'data', 'profile');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setUserProfile(snap.data());
        setView('dashboard');
        setIsOffline(false);
      } else {
        setView('onboarding');
      }
    } catch (e) {
      console.error("Profile Load Error:", e);
      setIsOffline(true);
      setUserProfile(MOCK_PROFILE);
      setView('dashboard');
    }
    setLoading(false);
  };

  const handleLoginSuccess = async (email) => {
    setLoading(true);
    setIsOffline(false);
    if (!auth.currentUser) await signInAnonymously(auth);
    const hybridId = getHybridUserId(email);
    localStorage.setItem('syntra_user_email', email);
    setActiveUserId(hybridId);
    await loadProfile(hybridId);
  };

  const handleProfileComplete = async (profileData) => {
    setUserProfile(profileData);
    if (activeUserId && !isOffline) {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'users', activeUserId, 'data', 'profile'), {
          ...profileData,
          email: localStorage.getItem('syntra_user_email') || "guest@syntra.ai",
          createdAt: serverTimestamp()
        });
        
        // --- WELCOME EMAIL (Updated for OpenRouter) ---
        const welcomePrompt = `Write a short, professional welcome email for student ${profileData.name}. Language: ${lang === 'ar' ? 'Egyptian Arabic' : 'English'}.`;
        const emailBody = await callAI([{ role: 'user', content: welcomePrompt }]);
        
        await addDoc(collection(db, 'artifacts', appId, 'users', activeUserId, 'inbox'), {
          subject: t.welcome_subject,
          body: emailBody,
          read: false,
          date: serverTimestamp()
        });
      } catch (e) {
        console.error("Cloud Save Failed:", e);
        setIsOffline(true);
      }
    }
    setView('dashboard');
  };

  const handleLogout = async () => {
    localStorage.removeItem('syntra_user_email');
    await signOut(auth).catch(() => {});
    setActiveUserId(null);
    setUserProfile(null);
    setView('auth');
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Activity className="animate-spin text-teal-600" size={40} /></div>;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className={`min-h-screen font-sans bg-slate-50 text-slate-900 transition-all duration-500`}>
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 z-50 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-tr from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/20">
            <Brain size={24} />
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-800">Syntra</span>
        </div>
        <div className="flex gap-4 items-center">
          {activeUserId && (
            <button onClick={() => window.location.reload()} className={`hidden md:flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full border ${isOffline ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-teal-600 bg-teal-50 border-teal-100'}`}>
              {isOffline ? <WifiOff size={12}/> : <Cloud size={12} />} 
              {isOffline ? t.reconnect : t.syncing}
            </button>
          )}
          <button onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')} className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-sm font-medium transition-all">
            <Globe size={16} /> {lang === 'en' ? 'العربية' : 'English'}
          </button>
          {activeUserId && (
             <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium transition-all">
              <LogOut size={16} /> {t.logout}
            </button>
          )}
        </div>
      </nav>

      <main className="pt-24 px-4 h-screen overflow-hidden">
        {view === 'auth' && <AuthScreen t={t} onLogin={handleLoginSuccess} />}
        {view === 'onboarding' && <OnboardingFlow t={t} onComplete={handleProfileComplete} />}
        {view === 'dashboard' && userProfile && <Dashboard t={t} userId={activeUserId} profile={userProfile} lang={lang} appId={appId} isOffline={isOffline} setIsOffline={setIsOffline} />}
      </main>
    </div>
  );
}

// --- AUTH SCREEN ---
const AuthScreen = ({ t, onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    if (!email.includes('@')) { setError(t.email + " invalid."); setIsLoading(false); return; }
    if (password.length < 6) { setError("Password too short."); setIsLoading(false); return; }
    try {
        if (isLogin) { await signInWithEmailAndPassword(getAuth(), email, password); } 
        else { await createUserWithEmailAndPassword(getAuth(), email, password); }
        onLogin(email);
    } catch (err) {
        console.error("Auth Error:", err);
        setError("Auth Failed. Check console.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center animate-in fade-in duration-500 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100">
      <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-2xl border border-white/50">
        <h2 className="text-3xl font-bold mb-2 text-slate-800 text-center">{isLogin ? t.login_title : t.signup_title}</h2>
        {error && <div className="mb-6 p-4 bg-red-50 text-red-600 text-center rounded-xl">{error}</div>}
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.email} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200" required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t.password} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200" required />
          <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold">{isLoading ? "..." : (isLogin ? t.login_btn : t.signup_btn)}</button>
        </form>
        <button onClick={() => { onLogin("guest_" + Math.random()); }} className="w-full mt-4 text-slate-500 font-bold">{t.guest_btn}</button>
        <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-2 text-teal-600 font-bold">{isLogin ? t.switch_signup : t.switch_login}</button>
      </div>
    </div>
  );
};

// --- ONBOARDING FLOW ---
const OnboardingFlow = ({ t, onComplete }) => {
    const [step, setStep] = useState(0);
    const [data, setData] = useState({ name: '', age: '', c_score: 50, o_score: 50 });
    return (
        <div className="h-full flex flex-col justify-center items-center">
            {step === 0 ? (
                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl max-w-md w-full">
                     <h2 className="text-2xl font-bold mb-6">{t.welcome}</h2>
                     <input value={data.name} onChange={e => setData({...data, name: e.target.value})} placeholder={t.name} className="w-full p-4 bg-slate-50 rounded-xl mb-4" />
                     <input value={data.age} onChange={e => setData({...data, age: e.target.value})} placeholder={t.age} className="w-full p-4 bg-slate-50 rounded-xl mb-4" />
                     <button onClick={() => setStep(1)} className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold">{t.start}</button>
                </div>
            ) : (
                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl text-center">
                    <h2 className="text-2xl font-bold mb-4">Tests Skipped for Demo</h2>
                    <button onClick={() => onComplete(data)} className="bg-teal-600 text-white px-8 py-4 rounded-xl font-bold">Go to Dashboard</button>
                </div>
            )}
        </div>
    )
};

// --- DASHBOARD ---
const Dashboard = ({ t, userId, profile, lang, appId, isOffline, setIsOffline }) => {
  const [activeTab, setActiveTab] = useState('chat');
  return (
    <div className="h-full flex gap-6 pb-6 pt-4 animate-in fade-in duration-700 relative">
      <div className="w-24 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center py-8 gap-6 z-10">
        <NavIcon icon={<MessageCircle />} active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
        <NavIcon icon={<Calendar />} active={activeTab === 'plan'} onClick={() => setActiveTab('plan')} />
        <NavIcon icon={<BookOpen />} active={activeTab === 'journal'} onClick={() => setActiveTab('journal')} />
      </div>
      <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden relative flex flex-col">
        {activeTab === 'chat' && <ChatModule t={t} userId={userId} lang={lang} profile={profile} appId={appId} isOffline={isOffline} />}
        {activeTab === 'plan' && <PlannerModule t={t} userId={userId} lang={lang} profile={profile} appId={appId} isOffline={isOffline} />}
        {activeTab === 'journal' && <JournalModule t={t} userId={userId} lang={lang} profile={profile} appId={appId} isOffline={isOffline} />}
      </div>
    </div>
  );
};
const NavIcon = ({ icon, active, onClick }) => (
  <button onClick={onClick} className={`p-4 rounded-2xl transition-all duration-300 ${active ? 'bg-teal-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>{React.cloneElement(icon, { size: 28 })}</button>
);

// --- MODULES ---

// --- CHAT MODULE (UPDATED FOR OPENROUTER) ---
const ChatModule = ({ t, userId, lang, profile, appId, isOffline }) => {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTasks, setCurrentTasks] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if(!userId || isOffline) return;
    const q = query(collection(db, 'artifacts', appId, 'users', userId, 'chat'));
    const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Correct sorting: null (newest) -> Infinity
        data.sort((a, b) => {
            const tA = a.createdAt ? a.createdAt.seconds : Number.MAX_SAFE_INTEGER;
            const tB = b.createdAt ? b.createdAt.seconds : Number.MAX_SAFE_INTEGER;
            return tA - tB;
        });
        setMsgs(data);
    }, (err) => console.log("Chat Offline", err));
    return () => unsub();
  }, [userId, isOffline]);

  useEffect(() => {
    if(!userId || isOffline) return;
    const q = query(collection(db, 'artifacts', appId, 'users', userId, 'tasks'));
    const unsub = onSnapshot(q, (snap) => setCurrentTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
    return () => unsub();
  }, [userId, isOffline]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading]);

  const send = async () => {
    if(!input.trim()) return;
    const text = input;
    setInput('');
    setLoading(true);

    if (!isOffline) {
        await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'chat'), { role: 'user', text, createdAt: serverTimestamp() });
    } else {
        setMsgs(prev => [...prev, {id: Date.now(), role: 'user', text}]);
    }

    try {
        const taskListString = currentTasks.map(t => `- ${t.text}`).join('\n');
        const systemPrompt = `
          You are "Aura". Name: ${profile.name}. Tasks: ${taskListString}.
          Language: ${lang === 'ar' ? 'Egyptian Arabic' : 'English'}.
          To add task: [ADD: text]. To update: [MOD: old -> new].
        `;

        // CONVERT TO OPENAI/OPENROUTER FORMAT
        const apiMessages = msgs
            .filter(m => m.text)
            .map(m => ({
                role: m.role === 'ai' ? 'assistant' : 'user',
                content: m.text
            }));
        apiMessages.push({ role: 'user', content: text });

        // CALL OPENROUTER
        const aiText = await callAI(apiMessages, systemPrompt);

        // Parse Commands
        const addMatch = aiText.match(/\[ADD:\s*(.*?)\]/);
        if (addMatch && !isOffline) {
            await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'tasks'), { text: addMatch[1].trim(), done: false, type: 'ai-smart', createdAt: serverTimestamp() });
        }

        if (!isOffline) {
            await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'chat'), { role: 'ai', text: aiText, createdAt: serverTimestamp() });
        } else {
            setMsgs(prev => [...prev, {id: Date.now()+1, role: 'ai', text: aiText}]);
        }

    } catch (e) {
        const errMsg = e.message;
        if (!isOffline) await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'chat'), { role: 'ai', text: `⚠️ ${errMsg}`, createdAt: serverTimestamp() });
    }
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50">
       <div className="flex-1 overflow-y-auto p-8 space-y-6">
         {msgs.length === 0 && <div className="text-center text-slate-400 mt-20 opacity-50">{t.chat_placeholder}</div>}
         {msgs.map((m) => (
            <div key={m.id || Math.random()} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
              <div className={`max-w-[80%] p-6 rounded-3xl text-lg shadow-sm ${m.role === 'user' ? 'bg-slate-900 text-white rounded-br-none' : 'bg-white border border-slate-100 rounded-bl-none text-slate-700'} ${m.text.includes('⚠️') ? 'bg-red-50 text-red-600 border-red-200' : ''}`}>{m.text}</div>
            </div>
          ))}
          {loading && <div className="flex justify-start"><div className="bg-white p-4 rounded-3xl text-slate-400 italic text-sm"><Sparkles size={14} className="animate-spin inline mr-2"/>Aura thinking...</div></div>}
          <div ref={scrollRef} />
       </div>
       <div className="p-6 bg-white border-t border-slate-100 flex gap-4">
         <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder={t.chat_placeholder} className="flex-1 bg-slate-100 rounded-2xl p-5 outline-none focus:ring-2 focus:ring-teal-500/20 text-lg" />
         <button onClick={send} disabled={loading} className="bg-teal-500 text-white p-5 rounded-2xl hover:bg-teal-600 disabled:opacity-50"><Send /></button>
       </div>
    </div>
  );
};

const PlannerModule = ({ t, userId, lang, profile, appId, isOffline }) => {
    const [newTask, setNewTask] = useState('');
    const [tasks, setTasks] = useState([]);
    useEffect(() => {
        if(!userId || isOffline) return;
        const q = query(collection(db, 'artifacts', appId, 'users', userId, 'tasks'));
        const unsub = onSnapshot(q, (snap) => setTasks(snap.docs.map(d => ({id:d.id,...d.data()}))));
        return () => unsub();
    }, [userId]);
    const addTask = async (text) => {
        if(!text.trim()) return;
        await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'tasks'), { text, done: false, type: 'manual', createdAt: serverTimestamp() });
        setNewTask('');
    };
    const magicBreakdown = async () => {
        if(!newTask) return;
        const res = await callAI([{ role: 'user', content: `Break down goal "${newTask}" into 3 steps. Join with |||` }]);
        const subtasks = res.split('|||');
        for(const s of subtasks) await addTask(s);
    };
    return (
        <div className="p-10 h-full overflow-y-auto bg-slate-50/30">
            <h2 className="text-3xl font-bold mb-4">{t.plan}</h2>
            <div className="bg-white p-2 rounded-2xl flex gap-2 mb-4">
                <input value={newTask} onChange={e=>setNewTask(e.target.value)} className="flex-1 p-4 outline-none" placeholder="New Task..." />
                <button onClick={magicBreakdown} className="bg-purple-100 text-purple-700 px-4 rounded-xl"><Sparkles/></button>
                <button onClick={()=>addTask(newTask)} className="bg-slate-900 text-white px-6 rounded-xl"><Plus/></button>
            </div>
            {tasks.map(task => <div key={task.id} className="p-4 bg-white rounded-xl mb-2 border">{task.text}</div>)}
        </div>
    );
};

const JournalModule = ({ t, userId, lang, appId, isOffline }) => {
    const [entry, setEntry] = useState('');
    const [insight, setInsight] = useState('');
    const analyze = async () => {
        if(entry.length < 5) return;
        const res = await callAI([{ role: 'user', content: `Analyze this journal: "${entry}". 1 sentence advice.` }]);
        setInsight(res);
    };
    return (
        <div className="p-10 h-full flex flex-col bg-[#fffdf5]">
            <h2 className="text-3xl font-bold mb-4">{t.journal}</h2>
            <textarea value={entry} onChange={e=>setEntry(e.target.value)} className="flex-1 rounded-2xl p-4 border" placeholder="Dear Diary..." />
            <button onClick={analyze} className="bg-yellow-100 text-yellow-700 p-4 rounded-xl mt-4 font-bold">Analyze</button>
            {insight && <div className="mt-4 p-4 bg-white rounded-xl border border-yellow-200">{insight}</div>}
        </div>
    );
};
