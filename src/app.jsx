import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Brain, CheckCircle, ChevronRight, MessageCircle,
  Calendar, Settings, User, Globe, ArrowRight, Sparkles, Send, 
  Plus, Trash2, Smile, Activity, Lightbulb, LogOut, Lock, Mail, 
  UserCircle, PenTool, ShieldCheck, Cloud, RefreshCw, Bell, 
  WifiOff, Map, GitBranch, Edit3, Save, Languages, Compass,
  CheckSquare, Book, Link as LinkIcon, ExternalLink, PlayCircle
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

// 1. OPENROUTER API KEY
const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || "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";

// 2. MODEL SELECTION (GPT-4o for complex logic)
const AI_MODEL = "openai/gpt-4o"; 

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

// --- AI API HELPER ---
const callAI = async (messages, systemInstruction = "") => {
  if (!apiKey || apiKey.includes("PASTE_YOUR")) return "⚠️ Error: API Key is missing.";

  try {
    const apiMessages = [
        { role: "system", content: systemInstruction },
        ...messages
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://syntra.app", 
        "X-Title": "Syntra App"
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: apiMessages,
        temperature: 0.7, 
        max_tokens: 3000 // High token limit for long roadmaps
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AI Error] ${response.status}:`, errorText);
        return `⚠️ AI Error: ${response.statusText}`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "(No response content)";

  } catch (e) {
    console.error("[AI Connection Error]:", e);
    return "⚠️ Connection Error.";
  }
};

// --- LOCALIZATION ---
const LANGUAGES = {
  en: {
    welcome: "Welcome to Syntra",
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
    guide: "Start Here",
    dashboard: "Dashboard",
    chat: "Aura Guide",
    plan: "Smart Planner",
    journal: "Neuro Journal",
    roadmap: "Goal Roadmap",
    roadmap_placeholder: "What is your big ambitious goal? (e.g., Become a Data Scientist)",
    generate_roadmap: "Generate Visual Plan",
    translate_roadmap: "Translate Plan",
    edit_notes: "Add extra details or modify plan...",
    save_notes: "Save Notes",
    chat_placeholder: "Talk to Aura...",
    inbox: "Inbox",
    welcome_subject: "Welcome to Syntra!",
    task_magic: "Magic Breakdown",
    submit: "Submit",
    next: "Next",
    analyzing: "Analyzing Profile...",
    logout: "Log Out"
  },
  ar: {
    welcome: "مرحباً بك في سينترا",
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
    guide: "ابدأ هنا",
    dashboard: "الرئيسية",
    chat: "المساعد (أورا)",
    plan: "المهام الذكية",
    journal: "المذكرات",
    roadmap: "خريطة الأهداف",
    roadmap_placeholder: "ايه الحلم الكبير اللي عايز توصله؟ (مثلاً: ابقى مهندس برمجيات)",
    generate_roadmap: "إنشاء الخريطة",
    translate_roadmap: "ترجمة الخطة",
    edit_notes: "أضف تفاصيل زيادة أو عدل الخطة...",
    save_notes: "حفظ الملاحظات",
    chat_placeholder: "اتكلم مع أورا...",
    inbox: "صندوق الوارد",
    welcome_subject: "مرحباً بك في سينترا!",
    task_magic: "تقسيم ذكي",
    submit: "تأكيد",
    next: "التالي",
    analyzing: "جاري التحليل...",
    logout: "خروج"
  }
};

const FULL_SJT = [
    { id: 1, trait: 'C', text_en: "It's Thursday evening...", text_ar: "النهارده الخميس بالليل...", options_en: ["Decline...", "Go...", "Take...", "Go..."], options_ar: ["أعتذر...", "أطلع...", "آخد...", "أطلع..."] },
    // Truncated for brevity
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
        await signInAnonymously(auth).catch(() => setIsOffline(true));
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
      } catch (e) { console.error(e); setIsOffline(true); }
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
              {isOffline ? 'Offline' : 'Online'}
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
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
        if (isLogin) await signInWithEmailAndPassword(getAuth(), email, password);
        else await createUserWithEmailAndPassword(getAuth(), email, password);
        onLogin(email);
    } catch { onLogin(email); } 
    setIsLoading(false);
  };

  return (
    <div className="h-full flex items-center justify-center animate-in fade-in duration-500 bg-slate-50">
      <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-2xl">
        <h2 className="text-3xl font-bold mb-6 text-center">{isLogin ? t.login_title : t.signup_title}</h2>
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.email} className="w-full p-4 bg-slate-50 rounded-2xl" required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t.password} className="w-full p-4 bg-slate-50 rounded-2xl" required />
          <button type="submit" disabled={isLoading} className="w-full bg-teal-600 text-white py-4 rounded-2xl font-bold">{isLoading ? "..." : (isLogin ? t.login_btn : t.signup_btn)}</button>
        </form>
        <button onClick={() => onLogin("guest_" + Math.random())} className="w-full mt-4 text-slate-500 font-bold">{t.guest_btn}</button>
        <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-2 text-teal-600 font-bold">{isLogin ? t.switch_signup : t.switch_login}</button>
      </div>
    </div>
  );
};

// --- ONBOARDING & TESTS ---
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
                    <h2 className="text-2xl font-bold mb-4">Phase 1 Complete</h2>
                    <p className="mb-4 text-slate-500">Entering Phase 2: Application</p>
                    <button onClick={() => onComplete(data)} className="bg-teal-600 text-white px-8 py-4 rounded-xl font-bold">Go to Dashboard</button>
                </div>
            )}
        </div>
    )
};

// --- DASHBOARD ---
const Dashboard = ({ t, userId, profile, lang, appId, isOffline, setIsOffline }) => {
  const [activeTab, setActiveTab] = useState('guide'); // Default to Guide

  return (
    <div className="h-full flex gap-6 pb-6 pt-4 animate-in fade-in duration-700 relative">
      <div className="w-24 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center py-8 gap-6 z-10">
        <NavIcon icon={<Compass />} active={activeTab === 'guide'} onClick={() => setActiveTab('guide')} />
        <NavIcon icon={<MessageCircle />} active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
        <NavIcon icon={<Map />} active={activeTab === 'roadmap'} onClick={() => setActiveTab('roadmap')} />
        <NavIcon icon={<Calendar />} active={activeTab === 'plan'} onClick={() => setActiveTab('plan')} />
        <NavIcon icon={<BookOpen />} active={activeTab === 'journal'} onClick={() => setActiveTab('journal')} />
      </div>
      <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden relative flex flex-col">
        {activeTab === 'guide' && <GuideModule t={t} setTab={setActiveTab} />}
        {activeTab === 'chat' && <ChatModule t={t} userId={userId} lang={lang} profile={profile} appId={appId} isOffline={isOffline} />}
        {activeTab === 'roadmap' && <RoadmapModule t={t} userId={userId} lang={lang} profile={profile} appId={appId} isOffline={isOffline} />}
        {activeTab === 'plan' && <PlannerModule t={t} userId={userId} lang={lang} profile={profile} appId={appId} isOffline={isOffline} />}
        {activeTab === 'journal' && <JournalModule t={t} userId={userId} lang={lang} profile={profile} appId={appId} isOffline={isOffline} />}
      </div>
    </div>
  );
};
const NavIcon = ({ icon, active, onClick }) => (
  <button onClick={onClick} className={`p-4 rounded-2xl transition-all duration-300 ${active ? 'bg-teal-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>{React.cloneElement(icon, { size: 28 })}</button>
);

// --- GUIDE MODULE (NEW) ---
const GuideModule = ({ t, setTab }) => {
    return (
        <div className="h-full overflow-y-auto p-10 bg-slate-50/50">
            <h1 className="text-4xl font-bold text-slate-800 mb-2">{t.guide}</h1>
            <p className="text-slate-500 text-lg mb-8">Welcome to Phase 2: Application. Here is how to use Syntra to ascend.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setTab('chat')}>
                    <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600 mb-4"><MessageCircle /></div>
                    <h3 className="text-xl font-bold mb-2">Aura: Your Daily Companion</h3>
                    <p className="text-slate-500">Aura acts like a caring friend. Talk to her daily! She will automatically organize your planner and check on your roadmap progress.</p>
                    <div className="mt-4 text-teal-600 font-bold text-sm flex items-center gap-1">Open Chat <ArrowRight size={16}/></div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setTab('roadmap')}>
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mb-4"><Map /></div>
                    <h3 className="text-xl font-bold mb-2">Goal Roadmap Visualizer</h3>
                    <p className="text-slate-500">Visualize ambitious goals (like "Learn AI" or "Study Medicine"). Generate a 20-step flowchart with study resources.</p>
                    <div className="mt-4 text-indigo-600 font-bold text-sm flex items-center gap-1">Create Plan <ArrowRight size={16}/></div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setTab('plan')}>
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-4"><Calendar /></div>
                    <h3 className="text-xl font-bold mb-2">Smart Planner</h3>
                    <p className="text-slate-500">Aura populates this automatically when you chat. "I have math homework" becomes a task here instantly.</p>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setTab('journal')}>
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-600 mb-4"><BookOpen /></div>
                    <h3 className="text-xl font-bold mb-2">Neuro Journal</h3>
                    <p className="text-slate-500">Reflect on your day. Syntra analyzes your entries to understand your mental state better.</p>
                </div>
            </div>
        </div>
    );
}

// --- ROADMAP MODULE (UPDATED FLOWCHART) ---
const RoadmapModule = ({ t, userId, lang, profile, appId, isOffline }) => {
  const [goal, setGoal] = useState('');
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userNotes, setUserNotes] = useState('');

  // Load existing roadmap
  useEffect(() => {
    if(!userId || isOffline) return;
    const loadMap = async () => {
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', userId, 'data', 'roadmap');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setRoadmap(snap.data().data);
          setUserNotes(snap.data().notes || '');
        }
      } catch (e) { console.error("Roadmap Load Error", e); }
    };
    loadMap();
  }, [userId, isOffline]);

  const generateRoadmap = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    try {
        const prompt = `
          Create a MASSIVE, DETAILED study roadmap for ${profile.name} (Age ${profile.age}, Grade 11/12).
          GOAL: "${goal}".
          
          REQUIREMENTS:
          1. Return valid JSON only. Structure: { "title": "...", "nodes": [ { "id": 1, "label": "...", "details": "...", "resources": ["Book X", "Coursera Y"], "status": "pending" } ] }
          2. Generate 15-20 steps. Steps should be logical (Beginner -> Advanced).
          3. Include specific resources (URLs, Book titles) in the "resources" array.
          4. Language: ${lang === 'ar' ? 'Arabic' : 'English'}.
        `;
        
        const jsonStr = await callAI([{ role: 'user', content: prompt }]);
        const cleanJson = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        const mapData = JSON.parse(cleanJson);
        
        setRoadmap(mapData);
        
        if (!isOffline) {
            await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'data', 'roadmap'), { 
                data: mapData, 
                notes: userNotes,
                updatedAt: serverTimestamp() 
            });
        }
    } catch (e) {
        console.error("Roadmap Gen Error:", e);
        alert("Could not generate roadmap. Try again.");
    }
    setLoading(false);
  };

  const toggleNode = async (index) => {
      const newMap = { ...roadmap };
      const node = newMap.nodes[index];
      node.status = node.status === 'done' ? 'pending' : 'done';
      setRoadmap(newMap);
      if(!isOffline) await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'data', 'roadmap'), { data: newMap });
  };

  const translateRoadmap = async () => {
    if (!roadmap) return;
    setLoading(true);
    try {
        const targetLang = lang === 'en' ? 'Arabic' : 'English';
        const prompt = `Translate this JSON roadmap to ${targetLang}. Return strictly JSON. \n ${JSON.stringify(roadmap)}`;
        const jsonStr = await callAI([{ role: 'user', content: prompt }]);
        const cleanJson = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        const newMap = JSON.parse(cleanJson);
        setRoadmap(newMap);
    } catch (e) { console.error("Trans Error", e); }
    setLoading(false);
  };

  const saveNotes = async () => {
    if (!isOffline && userId) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'data', 'roadmap'), { notes: userNotes });
        alert(t.save_notes + " ✓");
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50 p-6 overflow-hidden">
        <div className="flex gap-4 mb-6">
            <input 
              value={goal} 
              onChange={e => setGoal(e.target.value)} 
              placeholder={t.roadmap_placeholder} 
              className="flex-1 p-4 rounded-xl border border-slate-200 outline-none focus:border-teal-500"
            />
            <button onClick={generateRoadmap} disabled={loading} className="bg-teal-600 text-white px-6 rounded-xl font-bold flex items-center gap-2 hover:bg-teal-700 disabled:opacity-50">
                {loading ? <RefreshCw className="animate-spin"/> : <GitBranch />} {t.generate_roadmap}
            </button>
        </div>

        {/* Visualizer Area (Flowchart Style) */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 overflow-y-auto p-10 relative shadow-inner">
            {!roadmap && <div className="text-center text-slate-400 mt-20 flex flex-col items-center"><Map size={48} className="mb-4 opacity-50"/>Start by entering a big goal above.</div>}
            
            {roadmap && (
                <div className="flex flex-col items-center relative max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold text-slate-800 mb-8 text-center">{roadmap.title}</h2>
                    <div className="absolute top-0 right-0">
                        <button onClick={translateRoadmap} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-blue-100"><Languages size={16}/> {t.translate_roadmap}</button>
                    </div>
                    
                    {/* Vertical Flowchart */}
                    <div className="w-full space-y-0 relative">
                        {/* Connecting Line Background */}
                        <div className="absolute left-8 top-8 bottom-8 w-1 bg-slate-100 -z-0"></div>

                        {roadmap.nodes?.map((node, i) => (
                            <div key={i} className="flex gap-6 relative z-10 group">
                                {/* Status Checkbox / Node Marker */}
                                <button 
                                  onClick={() => toggleNode(i)}
                                  className={`w-16 h-16 rounded-2xl flex-shrink-0 border-4 flex items-center justify-center transition-all bg-white cursor-pointer ${node.status === 'done' ? 'border-teal-500 text-teal-500' : 'border-slate-200 text-slate-300 hover:border-teal-300'}`}
                                >
                                   {node.status === 'done' ? <CheckCircle size={32} /> : <span className="font-bold text-lg">{i+1}</span>}
                                </button>

                                {/* Content Card */}
                                <div className={`flex-1 p-6 rounded-2xl border mb-8 transition-all ${node.status === 'done' ? 'bg-teal-50 border-teal-100 opacity-75' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}>
                                    <h3 className={`text-xl font-bold mb-2 ${node.status === 'done' ? 'text-teal-800 line-through' : 'text-slate-800'}`}>{node.label}</h3>
                                    <p className="text-slate-600 mb-4">{node.details}</p>
                                    
                                    {/* Resources */}
                                    {node.resources && node.resources.length > 0 && (
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><LinkIcon size={12}/> Study Resources</div>
                                            <div className="flex flex-wrap gap-2">
                                                {node.resources.map((res, idx) => (
                                                    <span key={idx} className="text-xs bg-white px-2 py-1 rounded border border-slate-200 text-slate-600 font-medium flex items-center gap-1">
                                                        <ExternalLink size={10}/> {res}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Notes Area */}
        <div className="mt-4 bg-white p-4 rounded-2xl border border-slate-200 flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Edit3 size={12}/> Your Custom Notes</label>
            <textarea 
                value={userNotes} 
                onChange={e => setUserNotes(e.target.value)} 
                className="w-full resize-none outline-none text-sm text-slate-700 min-h-[60px]" 
                placeholder={t.edit_notes}
            />
            <div className="flex justify-end">
                <button onClick={saveNotes} className="text-teal-600 text-sm font-bold hover:bg-teal-50 px-3 py-1 rounded-lg flex items-center gap-1"><Save size={14}/> {t.save_notes}</button>
            </div>
        </div>
    </div>
  );
};

// --- CHAT MODULE (UPDATED WITH AUTO-TASKING) ---
const ChatModule = ({ t, userId, lang, profile, appId, isOffline }) => {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTasks, setCurrentTasks] = useState([]);
  const [roadmapContext, setRoadmapContext] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if(!userId || isOffline) return;
    const q = query(collection(db, 'artifacts', appId, 'users', userId, 'chat'));
    const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        setMsgs(data);
    });
    return () => unsub();
  }, [userId, isOffline]);

  useEffect(() => {
    if(!userId || isOffline) return;
    getDoc(doc(db, 'artifacts', appId, 'users', userId, 'data', 'roadmap')).then(snap => {
        if(snap.exists()) setRoadmapContext(snap.data().data);
    });
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
        const taskListString = currentTasks.map(t => `- ${t.text} (${t.done ? 'DONE' : 'PENDING'})`).join('\n');
        
        let roadmapString = "No roadmap yet.";
        if (roadmapContext) {
            const nextStep = roadmapContext.nodes.find(n => n.status !== 'done');
            const total = roadmapContext.nodes.length;
            const done = roadmapContext.nodes.filter(n => n.status === 'done').length;
            roadmapString = `Goal: ${roadmapContext.title}. Progress: ${done}/${total}. Next Step: ${nextStep ? nextStep.label : 'Completed'}.`;
        }
        
        const systemPrompt = `
          You are "Aura", a warm, highly supportive companion (like a caring mom or close friend).
          User: ${profile.name} (Age: ${profile.age}).
          Language: ${lang === 'ar' ? 'Egyptian Arabic' : 'English'}.
          
          YOUR MISSION:
          1. Monitor the user's life, study, and mood.
          2. **AUTO-PLANNER:** If the user mentions a task (e.g., "I have math homework"), automatically add it.
          3. **AUTO-COMPLETE:** If the user says they finished something, mark it done.
          4. **ROADMAP TRACKING:** Always gently ask about progress on the "Big Roadmap" if relevant.

          CONTEXT:
          Current Daily Tasks: \n${taskListString}
          Big Roadmap Status: \n${roadmapString}

          COMMANDS (Output these EXACTLY to control the app):
          - [ADD: Task Name] -> Adds a task to the planner.
          - [DONE: Task Name] -> Marks a task as done (fuzzy match).
          - [MOD: Old -> New] -> Renames a task.
        `;

        const apiMessages = msgs
            .filter(m => m.text)
            .map(m => ({
                role: m.role === 'ai' ? 'assistant' : 'user',
                content: m.text
            }));
        apiMessages.push({ role: 'user', content: text });

        const aiText = await callAI(apiMessages, systemPrompt);

        // --- COMMAND PARSING LOGIC ---
        let responseText = aiText;

        // 1. ADD Task
        const addMatch = aiText.match(/\[ADD:\s*(.*?)\]/);
        if (addMatch && !isOffline) {
            const newTask = addMatch[1].trim();
            await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'tasks'), { text: newTask, done: false, type: 'ai-smart', createdAt: serverTimestamp() });
            responseText = responseText.replace(addMatch[0], ""); // Remove command from visible chat
        }

        // 2. DONE Task
        const doneMatch = aiText.match(/\[DONE:\s*(.*?)\]/);
        if (doneMatch && !isOffline) {
            const taskToFind = doneMatch[1].trim().toLowerCase();
            const targetTask = currentTasks.find(t => t.text.toLowerCase().includes(taskToFind));
            if (targetTask) {
                await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'tasks', targetTask.id), { done: true });
            }
            responseText = responseText.replace(doneMatch[0], "");
        }

        if (!isOffline) {
            await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'chat'), { role: 'ai', text: responseText.trim(), createdAt: serverTimestamp() });
        } else {
            setMsgs(prev => [...prev, {id: Date.now()+1, role: 'ai', text: responseText.trim()}]);
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

// --- PLANNER MODULE (UNCHANGED) ---
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
    const toggleTask = async (task) => {
        await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'tasks', task.id), { done: !task.done });
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
            {tasks.map(task => (
                <div key={task.id} className="p-4 bg-white rounded-xl mb-2 border flex items-center gap-4">
                    <button onClick={() => toggleTask(task)} className={`w-6 h-6 rounded-full border-2 ${task.done ? 'bg-teal-500 border-teal-500' : 'border-slate-300'}`}>{task.done && <CheckCircle size={20} className="text-white"/>}</button>
                    <span className={task.done ? 'line-through text-slate-400' : ''}>{task.text}</span>
                </div>
            ))}
        </div>
    );
};

// --- JOURNAL MODULE (UNCHANGED) ---
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
