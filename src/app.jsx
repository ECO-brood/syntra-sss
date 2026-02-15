import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Brain, CheckCircle, MessageCircle,
  Calendar, Activity, Globe, Send, 
  Plus, LogOut, Cloud, WifiOff, Map, GitBranch, Edit3, Save, 
  Link as LinkIcon, Sparkles, Percent, Compass
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, 
  onAuthStateChanged, signOut, createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, onSnapshot, 
  serverTimestamp, doc, setDoc, getDoc, updateDoc, 
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager
} from 'firebase/firestore';

// --- CONFIGURATION ---

// 1. OPENROUTER API KEY 
// REPLACE "PLACE_YOUR_OPENROUTER_KEY_HERE" WITH YOUR ACTUAL KEY
const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

// 2. MODEL SELECTION
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
  if (!apiKey || apiKey.includes("PLACE_YOUR")) return "⚠️ Error: Please set your API Key in app.jsx";

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
        max_tokens: 3000
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

// --- MAIN COMPONENT ---
export default function SyntraApp() {
  const [activeUserId, setActiveUserId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('auth');
  const [isOffline, setIsOffline] = useState(false);
  const [user, setUser] = useState(null);

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
    <div className={`min-h-screen font-sans bg-slate-50 text-slate-900 transition-all duration-500`}>
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
          {activeUserId && (
             <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium transition-all">
              <LogOut size={16} /> Log Out
            </button>
          )}
        </div>
      </nav>

      <main className="pt-24 px-4 h-screen overflow-hidden">
        {view === 'auth' && <AuthScreen onLogin={handleLoginSuccess} />}
        {view === 'onboarding' && <OnboardingFlow onComplete={handleProfileComplete} />}
        {view === 'dashboard' && userProfile && <Dashboard userId={activeUserId} profile={userProfile} appId={appId} isOffline={isOffline} setIsOffline={setIsOffline} />}
      </main>
    </div>
  );
}

// --- AUTH SCREEN ---
const AuthScreen = ({ onLogin }) => {
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
        <h2 className="text-3xl font-bold mb-6 text-center">{isLogin ? "Student Portal" : "New Registration"}</h2>
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" className="w-full p-4 bg-slate-50 rounded-2xl" required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full p-4 bg-slate-50 rounded-2xl" required />
          <button type="submit" disabled={isLoading} className="w-full bg-teal-600 text-white py-4 rounded-2xl font-bold">{isLoading ? "..." : (isLogin ? "Secure Login" : "Create Account")}</button>
        </form>
        <button onClick={() => onLogin("guest_" + Math.random())} className="w-full mt-4 text-slate-500 font-bold">Access Platform (Guest)</button>
        <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-2 text-teal-600 font-bold">{isLogin ? "New here? Register" : "Have account? Sign in"}</button>
      </div>
    </div>
  );
};

// --- ONBOARDING & TESTS ---
const OnboardingFlow = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    const [data, setData] = useState({ name: '', age: '', c_score: 50, o_score: 50 });
    return (
        <div className="h-full flex flex-col justify-center items-center">
            {step === 0 ? (
                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl max-w-md w-full">
                     <h2 className="text-2xl font-bold mb-6">Welcome to Syntra</h2>
                     <input value={data.name} onChange={e => setData({...data, name: e.target.value})} placeholder="Full Name" className="w-full p-4 bg-slate-50 rounded-xl mb-4" />
                     <input value={data.age} onChange={e => setData({...data, age: e.target.value})} placeholder="Age" className="w-full p-4 bg-slate-50 rounded-xl mb-4" />
                     <button onClick={() => setStep(1)} className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold">Start Journey</button>
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
const Dashboard = ({ userId, profile, appId, isOffline, setIsOffline }) => {
  const [activeTab, setActiveTab] = useState('guide'); 

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
        {activeTab === 'guide' && <GuideModule setTab={setActiveTab} />}
        {activeTab === 'chat' && <ChatModule userId={userId} profile={profile} appId={appId} isOffline={isOffline} />}
        {activeTab === 'roadmap' && <RoadmapModule userId={userId} profile={profile} appId={appId} isOffline={isOffline} />}
        {activeTab === 'plan' && <PlannerModule userId={userId} profile={profile} appId={appId} isOffline={isOffline} />}
        {activeTab === 'journal' && <JournalModule userId={userId} profile={profile} appId={appId} isOffline={isOffline} />}
      </div>
    </div>
  );
};
const NavIcon = ({ icon, active, onClick }) => (
  <button onClick={onClick} className={`p-4 rounded-2xl transition-all duration-300 ${active ? 'bg-teal-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>{React.cloneElement(icon, { size: 28 })}</button>
);

// --- GUIDE MODULE ---
const GuideModule = ({ setTab }) => {
    return (
        <div className="h-full overflow-y-auto p-10 bg-slate-50/50">
            <h1 className="text-4xl font-bold text-slate-800 mb-2">Start Here</h1>
            <p className="text-slate-500 text-lg mb-8">Welcome to Phase 2: Application. Here is how to use Syntra to ascend.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setTab('chat')}>
                    <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600 mb-4"><MessageCircle /></div>
                    <h3 className="text-xl font-bold mb-2">Aura: Proactive Companion</h3>
                    <p className="text-slate-500">Aura will initiate talks and check your progress. Talk to her to auto-update your Planner and Roadmap.</p>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setTab('roadmap')}>
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mb-4"><Map /></div>
                    <h3 className="text-xl font-bold mb-2">Goal Roadmap Visualizer</h3>
                    <p className="text-slate-500">Visualize ambitious goals. Track percentage completion of every step via Chat.</p>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setTab('plan')}>
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-4"><Calendar /></div>
                    <h3 className="text-xl font-bold mb-2">Smart Planner</h3>
                    <p className="text-slate-500">Aura populates this automatically. Just tell her "I have an exam" or "I finished chapter 1".</p>
                </div>
            </div>
        </div>
    );
}

// --- ROADMAP MODULE ---
const RoadmapModule = ({ userId, profile, appId, isOffline }) => {
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
          1. Return valid JSON only. Structure: { "title": "...", "nodes": [ { "id": 1, "label": "...", "details": "...", "resources": ["Book X", "Coursera Y"], "progress": 0 } ] }
          2. Generate 15-20 steps. Steps should be logical (Beginner -> Advanced).
          3. Include specific resources in "resources".
          4. Initialize "progress" at 0.
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
        alert("Could not generate roadmap. Try again or check API Key.");
    }
    setLoading(false);
  };

  const saveNotes = async () => {
    if (!isOffline && userId) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'data', 'roadmap'), { notes: userNotes });
        alert("Notes Saved ✓");
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50 p-6 overflow-hidden">
        <div className="flex gap-4 mb-6">
            <input 
              value={goal} 
              onChange={e => setGoal(e.target.value)} 
              placeholder="What is your big ambitious goal? (e.g., Become a Data Scientist)" 
              className="flex-1 p-4 rounded-xl border border-slate-200 outline-none focus:border-teal-500"
            />
            <button onClick={generateRoadmap} disabled={loading} className="bg-teal-600 text-white px-6 rounded-xl font-bold flex items-center gap-2 hover:bg-teal-700 disabled:opacity-50">
                {loading ? <Activity className="animate-spin"/> : <GitBranch />} Generate Plan
            </button>
        </div>

        {/* Visualizer Area */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 overflow-y-auto p-10 relative shadow-inner">
            {!roadmap && <div className="text-center text-slate-400 mt-20 flex flex-col items-center"><Map size={48} className="mb-4 opacity-50"/>Start by entering a big goal above.</div>}
            
            {roadmap && (
                <div className="flex flex-col items-center relative max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold text-slate-800 mb-8 text-center">{roadmap.title}</h2>
                    
                    <div className="w-full space-y-0 relative">
                        <div className="absolute left-8 top-8 bottom-8 w-1 bg-slate-100 -z-0"></div>

                        {roadmap.nodes?.map((node, i) => (
                            <div key={i} className="flex gap-6 relative z-10 group">
                                <div className={`w-16 h-16 rounded-2xl flex-shrink-0 border-4 flex items-center justify-center bg-white border-slate-200 text-slate-400`}>
                                   <span className="font-bold text-lg">{i+1}</span>
                                </div>

                                <div className="flex-1 p-6 rounded-2xl border mb-8 bg-white border-slate-200 shadow-sm hover:shadow-md">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-xl font-bold mb-2 text-slate-800">{node.label}</h3>
                                        <div className="flex items-center gap-2 text-xs font-bold bg-slate-100 px-2 py-1 rounded-lg">
                                            <Percent size={12}/> {node.progress || 0}% Done
                                        </div>
                                    </div>
                                    
                                    {/* Progress Bar */}
                                    <div className="h-2 w-full bg-slate-100 rounded-full mb-4 overflow-hidden">
                                        <div className="h-full bg-teal-500 transition-all" style={{width: `${node.progress || 0}%`}}></div>
                                    </div>

                                    <p className="text-slate-600 mb-4">{node.details}</p>
                                    
                                    {node.resources && (
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div className="flex flex-wrap gap-2">
                                                {node.resources.map((res, idx) => (
                                                    <span key={idx} className="text-xs bg-white px-2 py-1 rounded border border-slate-200 text-slate-600 font-medium flex items-center gap-1">
                                                        <LinkIcon size={10}/> {res}
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

        <div className="mt-4 bg-white p-4 rounded-2xl border border-slate-200 flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Edit3 size={12}/> Your Custom Notes</label>
            <textarea 
                value={userNotes} 
                onChange={e => setUserNotes(e.target.value)} 
                className="w-full resize-none outline-none text-sm text-slate-700 min-h-[60px]" 
                placeholder="Add extra details or modify plan..."
            />
            <div className="flex justify-end">
                <button onClick={saveNotes} className="text-teal-600 text-sm font-bold hover:bg-teal-50 px-3 py-1
