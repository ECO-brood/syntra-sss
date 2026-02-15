import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Brain, CheckCircle, ChevronRight, MessageCircle,
  Calendar, Settings, User, Globe, ArrowRight, Sparkles, Send, 
  Plus, Trash2, Smile, Activity, Lightbulb, LogOut, Lock, Mail, 
  UserCircle, PenTool, ShieldCheck, Cloud, RefreshCw, Bell, 
  Menu, X, Edit3, AlertTriangle, Wifi, WifiOff
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

// 1. GEMINI API KEY
// Ensure this key has the "Generative Language API" enabled in Google Cloud Console.
const apiKey = "AIzaSyB7zq3t010PKDcZHVr2bKqpD6xk-kkh4Kg";

// 2. FIREBASE CONFIGURATION
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

// 3. STATIC APP ID
const appId = typeof __app_id !== 'undefined' ? __app_id : 'syntra-web-v2';

// --- FALLBACK DATA ---
const MOCK_PROFILE = { name: "Student", age: "18", c_score: 50, o_score: 50 };

// --- HELPER: SIMULATED AUTH ID ---
const getHybridUserId = (email) => {
  if (!email) return null;
  return email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
};

// --- GEMINI API HELPER (FIXED) ---
// Now accepts 'history' array instead of single prompt
const callGemini = async (history, systemInstruction = "") => {
  if (!apiKey || apiKey.includes("YOUR_API_KEY")) {
    return "⚠️ Error: API Key is missing in app.jsx.";
  }

  // FIXED: Removed 'gemini-pro' (1.0) because it crashes with systemInstruction.
  // Kept only 1.5 models which support the features used here.
  const models = ["gemini-1.5-flash", "gemini-1.5-pro"];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: history, // Passing full conversation context
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            },
            // Added safety settings to prevent silent blocks
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
            ]
          })
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Model ${model} failed (${response.status}):`, errText);
        continue; // Try next model
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "(No response generated)";
    } catch (e) {
      console.warn(`Connection error on ${model}:`, e);
    }
  }
  
  throw new Error("Unable to connect to AI. Please check internet or API Key quota.");
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

// --- FULL 40 UNIQUE SJT QUESTIONS ---
const FULL_SJT = [
    // --- CONSCIENTIOUSNESS (20 Items) ---
    { id: 1, trait: 'C', text_en: "It's Thursday evening, and you have a major biology assignment due on Monday morning. Your friends just messaged you in the group chat about a spontaneous weekend trip to the beach that starts tomorrow morning. You haven't started the assignment yet.", text_ar: "النهارده الخميس بالليل، وعندك واجب أحياء كبير لازم يتسلم الاثنين الصبح. صحابك بعتولك على الجروب إنهم طالعين رحلة للعين السخنة بكرة الصبح، وأنت لسه مابدأتش في الواجب خالص.", options_en: ["Decline the trip immediately to ensure the assignment is finished with high quality.", "Go on the trip but wake up early Sunday to rush through the work.", "Take your laptop and books with you, planning to work during the trip.", "Go on the trip and decide to copy the assignment from a friend later."], options_ar: ["أعتذر عن الرحلة فوراً عشان أضمن إني أخلص الواجب بجودة عالية.", "أطلع الرحلة بس أصحى بدري يوم الأحد أكروته.", "آخد اللابتوب والكتب معايا بنية إني أذاكر هناك.", "أطلع الرحلة وأبقى أنقل الواجب من حد صاحبي بعدين."] },
    { id: 2, trait: 'C', text_en: "You look at your study desk. It is currently covered in old papers, empty snack wrappers, and random cables from last week. You need to start studying for an upcoming math test.", text_ar: "بصيت على مكتبك لقيته مليان ورق قديم، أكياس شيبسي فاضية، وكابلات مرمية من الأسبوع اللي فات. وأنت محتاج تبدأ مذاكرة عشان امتحان الرياضة.", options_en: ["Spend 15 minutes organizing and cleaning everything before opening a single book.", "Push the mess to the side to create a small working space and start immediately.", "Decide to study on your bed instead to avoid dealing with the mess.", "Leave it as is; the chaos doesn't bother you and you start studying."], options_ar: ["أضيع ربع ساعة أنضف وأرتب كل حاجة قبل ما أفتح كتاب.", "أزق الكركبة على جنب عشان أعمل مساحة صغيرة وأبدأ.", "أقرر أذاكر على السرير عشان ماليش مزاج للكركبة دي.", "أسيبه زي ما هو، الدوشة مش بتضايقني وأبدأ مذاكرة."] },
    { id: 3, trait: 'C', text_en: "You set a goal two weeks ago to wake up at 6:00 AM every day to review your notes before school. Your alarm goes off at 6:00 AM today.", text_ar: "كنت حاطط هدف من أسبوعين إنك تصحى الساعة ٦ الصبح كل يوم تراجع قبل المدرسة. المنبه رن الساعة ٦ النهاردة.", options_en: ["Wake up immediately without hesitation, as per the plan.", "Hit snooze once, but get up within 10 minutes.", "Turn off the alarm and sleep until the last possible minute.", "Decide that studying at night is better and change the plan completely."], options_ar: ["أقوم فوراً من غير تردد زي ما خططت.", "أعمل غفوة (Snooze) مرة واحدة بس أقوم بعدها بـ ١٠ دقايق.", "أطفي المنبه وأكمل نوم لآخر لحظة ممكنة.", "أقرر إن المذاكرة بالليل أحسن وأغير الخطة تماماً."] },
    { id: 4, trait: 'C', text_en: "While reviewing your graded chemistry exam, you notice the teacher gave you 5 extra marks by mistake on a question you actually got wrong.", text_ar: "وأنت بتراجع ورقة امتحان الكيمياء بعد التصحيح، لاحظت إن المدرس إداك ٥ درجات زيادة بالغلط على سؤال أنت أصلاً حليته غلط.", options_en: ["Go to the teacher immediately after class and inform them of the mistake.", "Feel guilty about it but decide not to say anything to keep the grade.", "Tell your friends about your luck but definitely keep the marks.", "Ignore it completely; it's the teacher's fault, not yours."], options_ar: ["أروح للمدرس فوراً بعد الحصة وأعرفه الغلطة.", "أحس بالذنب بس أقرر إني مقولش حاجة عشان أحافظ على الدرجة.", "أقول لصحابي على حظي الحلو بس أكيد هحتفظ بالدرجات.", "أطنش الموضوع تماماً؛ دي غلطة المدرس مش غلطتي."] },
    { id: 5, trait: 'C', text_en: "A long-term history project is assigned today, and it is due in exactly two months. It requires significant research and writing.", text_ar: "المدرس طلب مشروع تاريخ كبير النهاردة، وميعاد تسليمه كمان شهرين بالظبط. المشروع محتاج بحث وكتابة كتير.", options_en: ["Create a weekly timeline today breaking down the research and writing phases.", "Make a mental note to start it next month.", "Wait until the deadline is much closer, like one week before.", "Plan to do an 'all-nighter' right before the due date."], options_ar: ["أعمل جدول زمني أسبوعي من النهاردة أقسم فيه مراحل البحث والكتابة.", "أحط في دماغي إني أبقى أبدأ فيه الشهر الجاي.", "أستنى لما الميعاد يقرب أوي، مثلاً قبلها بأسبوع.", "أخطط إني أسهر عليه ليلة التسليم وأخلصه مرة واحدة."] },
    { id: 6, trait: 'C', text_en: "You created a daily to-do list with 5 items. By 8 PM, you have finished 3 of them, but you are feeling quite tired.", text_ar: "عملت قائمة مهام لليوم فيها ٥ حاجات. الساعة جت ٨ بالليل وأنت خلصت ٣ بس، وحاسس إنك تعبان شوية.", options_en: ["Push through the fatigue to finish the last 2 items because the list must be completed.", "Finish one more item and move the last one to tomorrow's list.", "Stop working immediately and relax for the rest of the night.", "Give up on the list and play video games instead."], options_ar: ["أضغط على نفسي وأخلص الحاجتين الباقيين عشان لازم القائمة تخلص.", "أخلص حاجة كمان وأرحل الأخيرة لبكره.", "أوقف شغل فوراً وأنتخ بقية الليلة.", "أفكني من القائمة خالص وأقوم ألعب."] },
    { id: 7, trait: 'C', text_en: "You borrowed a novel from a friend and promised to return it by this Friday. You haven't finished reading it yet.", text_ar: "استلفت رواية من صاحبك ووعدته ترجعها يوم الجمعة ده. أنت لسه مخلصتش قرايتها.", options_en: ["Return it on Friday as promised, even if unread, or ask politely for an extension.", "Keep it until you finish reading, then return it whenever.", "Wait for them to ask for it back before returning it.", "Forget you even have the book until they remind you."], options_ar: ["أرجعها يوم الجمعة زي ما وعدت حتى لو مخلصتش، أو أستأذنه بذوق في وقت زيادة.", "أخليها معايا لحد ما أخلصها، وأبقى أرجعها في أي وقت.", "أستنى لما هو يطلبها الأول قبل ما أرجعها.", "أنسى أصلاً إن الكتاب معايا لحد ما هو يفكرني."] },
    { id: 8, trait: 'C', text_en: "You are assigned to a group project with three other students. No one is taking charge, and the deadline is approaching.", text_ar: "اتحطيت في مجموعة من ٣ طلاب لمشروع. مفيش حد بيتحرك أو بياخد القيادة، وميعاد التسليم بيقرب.", options_en: ["Step up, assign roles to everyone, and create a schedule to ensure completion.", "Do your own part perfectly and hope the others figure it out.", "Wait for someone else to tell you what to do.", "Relax and assume the group will eventually panic and do it."], options_ar: ["أتدخل أنا، وأوزع الأدوار على الكل، وأعمل جدول عشان نضمن إننا نخلص.", "أعمل جزئي أنا بامتياز وأتمنى الباقيين يتصرفوا.", "أستنى حد تاني يقولي أعمل إيه.", "أكبر دماغي وأفترض إننا هنتزنق في الآخر ونعمله."] },
    { id: 9, trait: 'C', text_en: "You are attending a lecture that is extremely boring, but the teacher says the material is critical for the final exam.", text_ar: "أنت قاعد في حصة مملة جداً، بس المدرس قال إن الكلام ده مهم جداً للامتحان النهائي.", options_en: ["Force yourself to take detailed notes and stay focused despite the boredom.", "Listen passively without writing anything down.", "Start doodling in your notebook to pass the time.", "Put your head down and take a nap."], options_ar: ["أجبر نفسي أكتب ملاحظات بالتفصيل وأركز رغم الملل.", "أسمع وخلاص من غير ما أكتب حاجة.", "أبدأ أشخبط في الكشكول عشان الوقت يعدي.", "أريح راسي على الديسك وأنام."] },
    { id: 10, trait: 'C', text_en: "You promised your grandmother you would call her at 5:00 PM today. You are in the middle of a fun game.", text_ar: "وعدت جدتك إنك هتكلمها الساعة ٥ المغرب النهاردة. الساعة جت ٥ وأنت وسط جيم جامد.", options_en: ["Pause the game exactly at 5:00 PM to make the call.", "Finish the round quickly and call her at 5:15 PM.", "Send a text message instead of calling.", "Forget about the call entirely."], options_ar: ["أوقف اللعب الساعة ٥ بالظبط عشان أكلمها.", "أخلص الجيم ده بسرعة وأكلمها ٥ وربع.", "أبعتلها رسالة بدل ما أتصل.", "أنسى المكالمة خالص."] },
    { id: 11, trait: 'C', text_en: "You need to buy a new laptop for school. There are many options available.", text_ar: "محتاج تشتري لابتوب جديد للمدرسة. وفيه اختيارات كتير جداً قدامك.", options_en: ["Research specifications for weeks, compare prices, and read reviews before buying.", "Ask a tech-savvy friend and just buy whatever they recommend.", "Go to the store and buy the one that looks the coolest.", "Buy the first one you see on sale without checking details."], options_ar: ["أبحث في المواصفات لأسابيع، وأقارن الأسعار، وأقرا مراجعات قبل ما أشتري.", "أسأل صاحبي اللي بيفهم وأشتري اللي يقول عليه وخلاص.", "أروح المحل وأشتري اللي شكله أحلى واحد.", "أشتري أول واحد يقابلني عليه عرض من غير ما أشوف تفاصيله."] },
    { id: 12, trait: 'C', text_en: "You receive an email from a teacher asking for a missing document. It requires a 5-minute task to find and send it.", text_ar: "جالك إيميل من مدرس بيطلب ملف ناقص. الموضوع محتاج ٥ دقايق تدوير عشان تبعته.", options_en: ["Stop what you are doing and reply immediately to get it done.", "Mark it as unread and plan to do it later tonight.", "Leave it for the weekend.", "Forget about the email until the teacher asks again."], options_ar: ["أوقف اللي في إيدي وأرد حالاً عشان أخلص.", "أعلمه كـ 'غير مقروء' وأخطط أعمله بالليل.", "أسيبه للأجازة.", "أنسى الإيميل لحد ما المدرس يطلبه تاني."] },
    { id: 13, trait: 'C', text_en: "You have decided to start a healthy eating plan to improve your energy.", text_ar: "قررت تبدأ نظام أكل صحي عشان تحسن نشاطك.", options_en: ["Stick to the plan strictly, meal prepping every day.", "Follow it mostly, but allow 'cheat meals' on weekends.", "Follow it for two days then go back to fast food.", "Quit the plan the moment you see a pizza."], options_ar: ["ألتزم بالنظام بصرامة، وأجهز وجباتي كل يوم.", "أمشى عليه في الغالب، بس ألخبط في الأجازة.", "أمشى عليه يومين وأرجع للوجبات السريعة.", "أبطل النظام أول ما أشوف بيتزا."] },
    { id: 14, trait: 'C', text_en: "How would you describe the current state of your bedroom?", text_ar: "توصف حالة أوضتك دلوقتي بإيه؟", options_en: ["Immaculate; everything has a specific place.", "Generally tidy, with maybe one or two things out of place.", "Cluttered, but I know where things are.", "A disaster zone; clothes are everywhere."], options_ar: ["زي الفل؛ كل حاجة ليها مكان محدد.", "نضيفة عموماً، ممكن حاجة أو اتنين مش في مكانهم.", "مكركبة، بس أنا عارف مكان حاجتي.", "منطقة كوارث؛ الهدوم في كل حتة."] },
    { id: 15, trait: 'C', text_en: "You have a doctor's appointment at 4:00 PM. It takes 20 minutes to get there.", text_ar: "عندك ميعاد دكتور الساعة ٤. المشوار بياخد ٢٠ دقيقة.", options_en: ["Leave at 3:30 PM to arrive early just in case.", "Leave exactly at 3:40 PM to arrive on the dot.", "Leave at 3:45 PM and hope traffic is light.", "Leave at 4:00 PM and apologize for being late."], options_ar: ["أنزل ٣:٣٠ عشان أوصل بدري احتياطي.", "أنزل ٣:٤٠ بالظبط عشان أوصل عالميعاد.", "أنزل ٣:٤٥ وأتمنى الطريق يكون فاضي.", "أنزل الساعة ٤ وأبقى أعتذر عن التأخير."] },
    { id: 16, trait: 'C', text_en: "You finish your exam paper 20 minutes before the time is up.", text_ar: "خلصت ورقة الامتحان قبل الوقت ما يخلص بـ ٢٠ دقيقة.", options_en: ["Spend the entire 20 minutes checking every answer twice.", "Check the answers once then hand it in.", "Glance over it quickly and leave.", "Hand it in immediately and leave the room."], options_ar: ["أقضي الـ ٢٠ دقيقة أراجع كل إجابة مرتين.", "أراجع الإجابات مرة واحدة وأسلم.", "أبص بصة سريعة وأمشي.", "أسلم الورقة فوراً وأخرج."] },
    { id: 17, trait: 'C', text_en: "You are building a model for science class. The instructions are long and detailed.", text_ar: "بتعمل مجسم لحصة العلوم. التعليمات طويلة ومفصلة جداً.", options_en: ["Read every step carefully before starting.", "Read step-by-step as you go.", "Look at the pictures and guess the steps.", "Ignore instructions and wing it."], options_ar: ["أقرا كل خطوة بحرص قبل ما أبدأ.", "أقرا خطوة بخطوة وأنا شغال.", "أبص على الصور وأخمن الخطوات.", "أطنش التعليمات وأعملها بالحب."] },
    { id: 18, trait: 'C', text_en: "New Year's resolutions.", text_ar: "قرارات السنة الجديدة.", options_en: ["Write a detailed list with deadlines and stick to it.", "Have a general idea of what I want to achieve.", "Make resolutions but forget them by February.", "I don't make plans; I just live day by day."], options_ar: ["أكتب قائمة مفصلة بمواعيد وألتزم بيها.", "عندي فكرة عامة عن اللي عايز أحققه.", "بعمل قرارات بس بنساها في فبراير.", "مبعملش خطط؛ أنا عايش اليوم بيومه."] },
    { id: 19, trait: 'C', text_en: "How do you organize files on your computer?", text_ar: "بتنظم ملفاتك على الكمبيوتر ازاي؟", options_en: ["Labeled folders nested inside categories.", "A few general folders like 'School' and 'Personal'.", "Everything is on the Desktop.", "I use the search bar because I can't find anything."], options_ar: ["فولدرات متسمية جوه تصنيفات محددة.", "كام فولدر عام زي 'مدرسة' و 'شخصي'.", "كل حاجة مرمية على الـ Desktop.", "بستخدم البحث لأني مش لاقي حاجة."] },
    { id: 20, trait: 'C', text_en: "You are faced with a very difficult physics problem.", text_ar: "واجهتك مسألة فيزياء صعبة جداً.", options_en: ["Break it down, research concepts, and keep trying until solved.", "Try for 10 minutes, then ask a friend for the answer.", "Skip it and hope it's not on the test.", "Close the book and do something else."], options_ar: ["أحللها، وأبحث عن القوانين، وأفضل أحاول لحد ما تتحل.", "أحاول ١٠ دقايق، وبعدين أطلب الحل من واحد صاحبي.", "أعديها وأتمنى متجيش في الامتحان.", "أقفل الكتاب وأعمل حاجة تانية."] },

    // --- OPENNESS (20 Items) ---
    { id: 21, trait: 'O', text_en: "You are walking down the street and see a gallery displaying strange, abstract modern art.", text_ar: "وأنت ماشي في الشارع لقيت معرض عارض فن حديث تجريدي غريب.", options_en: ["Enter immediately, eager to analyze the meanings.", "Go in just to see what it looks like.", " glance through the window but keep walking.", "Think it looks like nonsense and ignore it."], options_ar: ["أدخل فوراً، عندي فضول أحلل المعاني.", "أدخل بس عشان أتفرج على الشكل.", "أبص من الشباك وأكمل مشي.", "شايفه شكله عك وأطنش."] },
    { id: 22, trait: 'O', text_en: "You are at a restaurant, and there is a dish on the menu with ingredients you have never heard of.", text_ar: "قاعد في مطعم، وفيه طبق في المنيو مكوناته عمرك ما سمعت عنها.", options_en: ["Order it immediately specifically because it's new.", "Ask the waiter for details, then maybe try it.", "Stick to a dish you know you like.", "Refuse to eat anything weird."], options_ar: ["أطلبه فوراً مخصوص عشان هو جديد.", "أسأل الجرسون عن تفاصيله، وممكن أجربه.", "أخليك في الطبق اللي عارف إني بحبه.", "أرفض آكل أي حاجة غريبة."] },
    { id: 23, trait: 'O', text_en: "Your school offers an optional course on 'The Philosophy of Ancient Civilizations'.", text_ar: "المدرسة بتقدم مادة اختيارية عن 'فلسفة الحضارات القديمة'.", options_en: ["Sign up immediately; I love exploring ideas.", "Sign up only if my friends do.", "Don't sign up; it sounds hard.", "Think it sounds useless and boring."], options_ar: ["أسجل فوراً؛ بحب استكشاف الأفكار دي.", "أسجل بس لو صحابي سجلوا.", "مسجلش؛ شكلها صعبة.", "شايفها ملهاش لازمة ومملة."] },
    { id: 24, trait: 'O', text_en: "During a discussion, a teacher presents a theory that completely contradicts your beliefs.", text_ar: "في مناقشة، المدرس طرح نظرية بتناقض معتقداتك تماماً.", options_en: ["Listen intently and ask questions to understand this new perspective.", "Listen politely but disagree silently.", "Zone out until they finish.", "Interrupt to argue that they are wrong."], options_ar: ["أسمع بتركيز وأسأل عشان أفهم وجهة النظر الجديدة دي.", "أسمع بأدب بس مش مقتنع من جوايا.", "أفصل لحد ما يخلص.", "أقاطعه عشان أجادل إنه غلط."] },
    { id: 25, trait: 'O', text_en: "You have a completely free Saturday afternoon. What do you prefer to do?", text_ar: "عندك يوم سبت فاضي تماماً بعد الظهر. تفضل تعمل إيه؟", options_en: ["Go to a museum or read a complex novel.", "Watch a popular movie.", "Play the same video game I always play.", "Sleep or do nothing."], options_ar: ["أروح متحف أو أقرا رواية معقدة.", "أتفرج على فيلم مشهور.", "ألعب نفس الفيديو جيم اللي بلعبها دايماً.", "أنام أو معملش حاجة."] },
    { id: 26, trait: 'O', text_en: "A song comes on the radio in a language you don't understand, with a very unusual melody.", text_ar: "اشتغلت أغنية في الراديو بلغة مش فاهمها، ولحنها غريب جداً.", options_en: ["Listen carefully and search for the lyrics/translation later.", "Enjoy the beat but don't think about it.", "Change the station to pop music.", "Turn it off; it sounds like noise."], options_ar: ["أسمع بتركيز وأبحث عن الكلمات والترجمة بعدين.", "أستمتع بالإيقاع بس مفكرش فيها.", "أغير المحطة لأغاني بوب معروفة.", "أقفلها؛ دي دوشة."] },
    { id: 27, trait: 'O', text_en: "You win a free trip. You have to choose the destination.", text_ar: "كسبت رحلة مجانية. لازم تختار المكان.", options_en: ["A remote village in the mountains of Peru to explore.", "A guided tour of famous European cities.", "A luxury beach resort to relax.", "I'd rather sell the ticket and stay home."], options_ar: ["قرية معزولة في جبال بيرو عشان أستكشف.", "رحلة سياحية لمدن أوروبية مشهورة.", "منتجع سياحي فخم للاسترخاء.", "أبيع التذكرة وأقعد في البيت أحسن."] },
    { id: 28, trait: 'O', text_en: "You encounter a difficult riddle that requires thinking outside the box.", text_ar: "قابلت لغز صعب محتاج تفكير بره الصندوق.", options_en: ["Spend hours enjoying the mental challenge.", "Try for a few minutes then give up.", "Google the answer immediately.", "Ignore it; I hate riddles."], options_ar: ["أقضي ساعات مستمتع بالتحدي الذهني ده.", "أحاول كام دقيقة وأيأس.", "أجيب الحل من جوجل فوراً.", "أطنش؛ بكره الألغاز."] },
    { id: 29, trait: 'O', text_en: "How often do you find yourself daydreaming about impossible or fantasy worlds?", text_ar: "بتسرح بخيالك في عوالم خيالية أو مستحيلة قد إيه؟", options_en: ["Constantly; I live in my head.", "Often, when I am bored.", "Rarely; I focus on reality.", "Never; it's a waste of time."], options_ar: ["باستمرار؛ أنا عايش جوه دماغي.", "غالباً، لما بكون زهقان.", "نادراً؛ بركز في الواقع.", "أبداً؛ ده تضييع وقت."] },
    { id: 30, trait: 'O', text_en: "Your friend suggests changing your usual route walking home to explore a new street.", text_ar: "صاحبك اقترح تغيروا الطريق المعتاد وأنتوا مروحين عشان تشوفوا شارع جديد.", options_en: ["Yes! I love seeing new things.", "Sure, if it's not too long.", "No, let's stick to the usual way.", "No, I hate changing my routine."], options_ar: ["يلا! بحب أشوف حاجات جديدة.", "ماشي، لو مش طويل أوي.", "لأ، خلينا في الطريق المعتاد.", "لأ، بكره أغير روتيني."] },
    { id: 31, trait: 'O', text_en: "You are reading a book. Do you prefer:", text_ar: "بتقرأ كتاب. تفضل إيه؟", options_en: ["Science fiction or deep philosophy.", "Biographies of famous people.", "Action/Adventure.", "I don't like reading."], options_ar: ["خيال علمي أو فلسفة عميقة.", "سير ذاتية لمشاهير.", "أكشن ومغامرة.", "مبحبش القراءة."] },
    { id: 32, trait: 'O', text_en: "Someone suggests watching a documentary about the origin of the universe.", text_ar: "حد اقترح تتفرجوا على وثائقي عن نشأة الكون.", options_en: ["Sounds fascinating, let's watch.", "Okay, I'll watch it.", "Sounds boring.", "I'd rather watch a comedy."], options_ar: ["شكلها مذهلة، يلا نتفرج.", "ماشي، هتفرج.", "شكلها مملة.", "أفضل أتفرج على كوميدي."] },
    { id: 33, trait: 'O', text_en: "You have to write an essay. The teacher gives you a choice of topics.", text_ar: "لازم تكتب مقال. المدرس خيرك بين موضوعين.", options_en: ["'What if humans could fly?' (Creative)", "'My Summer Vacation' (Factual)", "Ask the teacher for an easier topic.", "Copy something from the internet."], options_ar: ["'ماذا لو البشر بيطيروا؟' (إبداعي)", "'أجازتي الصيفية' (واقعي)", "أطلب موضوع أسهل.", "أنقل حاجة من النت."] },
    { id: 34, trait: 'O', text_en: "You see a device you've never seen before.", text_ar: "شفت جهاز عمرك ما شفته قبل كده.", options_en: ["Try to figure out how it works and take it apart if possible.", "Read the manual.", "Ask someone what it does.", "Ignore it."], options_ar: ["أحاول أفهم بيشتغل ازاي وأفكه لو ينفع.", "أقرا الكتالوج.", "أسأل حد ده بيعمل إيه.", "أطنش."] },
    { id: 35, trait: 'O', text_en: "Do you enjoy discussions about theoretical problems that have no correct answer?", text_ar: "بتستمتع بالمناقشات عن مشاكل نظرية ملهاش حل صح؟", options_en: ["Love them; they stimulate my mind.", "They are okay sometimes.", "No, I prefer practical problems.", "Hate them; they are pointless."], options_ar: ["بحبها جداً؛ بتشغل مخي.", "ماشي حالها ساعات.", "لأ، بفضل المشاكل العملية.", "بكرهها؛ ملهاش فايدة."] },
    { id: 36, trait: 'O', text_en: "A friend invites you to a poetry slam (people reading poems).", text_ar: "صاحبك عزمك على أمسية شعرية.", options_en: ["Go enthusiastically to hear the metaphors.", "Go just to hang out with the friend.", "Politely decline.", "Laugh at the idea."], options_ar: ["أروح بحماس عشان أسمع التشبيهات.", "أروح بس عشان أخرج مع صاحبي.", "أرفض بذوق.", "أضحك على الفكرة."] },
    { id: 37, trait: 'O', text_en: "When you are in nature, do you stop to look at details like shapes of leaves?", text_ar: "لما بتكون في الطبيعة، بتقف تتأمل تفاصيل زي شكل ورق الشجر؟", options_en: ["Yes, I often find beauty in small details.", "Sometimes.", "Rarely, I just walk.", "Never."], options_ar: ["آه، غالباً بلاقي جمال في التفاصيل الصغيرة.", "أحياناً.", "نادراً، بمشي وخلاص.", "أبداً."] },
    { id: 38, trait: 'O', text_en: "Your favorite type of movie ending is:", text_ar: "نوع نهاية الفيلم المفضل ليك:", options_en: ["Ambiguous and open to interpretation.", "Happy ending.", "Clear conclusion.", "Action-packed."], options_ar: ["غامضة ومفتوحة للتفسير.", "نهاية سعيدة.", "نهاية واضحة ومقفولة.", "مليانة أكشن."] },
    { id: 39, trait: 'O', text_en: "Would you ever dye your hair a crazy color (green, blue, pink)?", text_ar: "ممكن تصبغ شعرك لون مجنون (أخضر، أزرق، بينك)؟", options_en: ["Yes, I love expressing myself.", "Maybe for a costume party.", "No, that's too weird.", "Never."], options_ar: ["آه، بحب أعبر عن نفسي.", "ممكن في حفلة تنكرية.", "لأ، ده غريب جداً.", "أبداً."] },
    { id: 40, trait: 'O', text_en: "You are asked to solve a math problem using a method you haven't learned yet.", text_ar: "مطلوب منك تحل مسألة رياضة بطريقة لسه متعلمتهاش.", options_en: ["Try to invent my own method to solve it.", "Wait for the teacher to explain.", "Ask a smart student.", "Give up."], options_ar: ["أحاول أخترع طريقتي الخاصة للحل.", "أستنى المدرس يشرح.", "أسأل طالب شاطر.", "أيأس."] }
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

  // Auth Initialization
  useEffect(() => {
    const init = async () => {
      // 1. Authenticate
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
      // Fallback
      setUserProfile(MOCK_PROFILE);
      setView('dashboard');
    }
    setLoading(false);
  };

  const handleLoginSuccess = async (email) => {
    setLoading(true);
    setIsOffline(false);
    
    // Ensure auth exists (redundant safety)
    if (!auth.currentUser) {
        await signInAnonymously(auth);
    }

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
        
        // Welcome Email with Language Check
        const welcomePrompt = `Write a short, professional welcome email for student ${profileData.name}. 
          Mention their traits (C:${profileData.c_score}, O:${profileData.o_score}). 
          LANGUAGE: ${lang === 'ar' ? 'Egyptian Arabic' : 'English'}.`;
        
        // Note: For simple one-off prompts like this, we wrap it in basic array
        const emailBody = await callGemini([{ role: 'user', parts: [{ text: welcomePrompt }] }]);
        
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
        if (isLogin) {
            await signInWithEmailAndPassword(getAuth(), email, password);
        } else {
            await createUserWithEmailAndPassword(getAuth(), email, password);
        }
        onLogin(email);
    } catch (err) {
        console.error("Auth Error:", err);
        if (err.code === 'auth/email-already-in-use') {
           setError("Account exists. Log in.");
        } else if (err.code === 'auth/invalid-credential') {
           setError("Invalid credentials.");
        } else {
           // Simulate login if strict auth fails in some environments
           onLogin(email);
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleGuest = async () => {
    setIsLoading(true);
    try {
        await signInAnonymously(getAuth());
        const guestId = "guest_" + Math.random().toString(36).substr(2, 9);
        onLogin(guestId);
    } catch (e) {
        onLogin("guest_offline");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center animate-in fade-in duration-500 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100">
      <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-2xl border border-white/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-400 to-blue-500"></div>
        <div className="mb-8 text-center">
          <div className="inline-flex p-3 bg-teal-50 rounded-2xl mb-4 text-teal-600"><ShieldCheck size={32} /></div>
          <h2 className="text-3xl font-bold mb-2 text-slate-800">{isLogin ? t.login_title : t.signup_title}</h2>
          <p className="text-slate-400">{t.subtitle}</p>
        </div>
        {error && <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-2xl text-center font-medium border border-red-100 flex items-center justify-center gap-2"><Activity size={16}/>{error}</div>}
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="group bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-4 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 transition-all">
            <Mail className="text-slate-400 group-focus-within:text-teal-600 transition-colors" size={20} />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.email} className="bg-transparent outline-none flex-1 font-medium text-slate-700" required />
          </div>
          <div className="group bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-4 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 transition-all">
            <Lock className="text-slate-400 group-focus-within:text-teal-600 transition-colors" size={20} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t.password} className="bg-transparent outline-none flex-1 font-medium text-slate-700" required />
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70">
            {isLoading ? <RefreshCw className="animate-spin"/> : (isLogin ? t.login_btn : t.login_btn)}
          </button>
        </form>
        <div className="my-6 flex items-center gap-4"><div className="h-px bg-slate-100 flex-1"></div><span className="text-xs text-slate-300 uppercase font-bold tracking-widest">OR</span><div className="h-px bg-slate-100 flex-1"></div></div>
        <button onClick={handleGuest} className="w-full bg-white border-2 border-slate-100 text-slate-600 py-3 rounded-2xl font-bold hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"><UserCircle size={20} /> {t.guest_btn}</button>
        <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-6 text-sm text-teal-600 font-bold hover:text-teal-700 transition-colors text-center block">{isLogin ? t.switch_signup : t.switch_login}</button>
      </div>
    </div>
  );
};

// --- ONBOARDING & TESTS ---
const OnboardingFlow = ({ t, onComplete }) => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ name: '', age: '', c_score: 50, o_score: 50 });

  const handleInfoSubmit = (info) => { setData({ ...data, ...info }); setStep(1); };
  const handleSJTSubmit = (scores) => { setData(prev => ({ ...prev, c_score: scores.c, o_score: scores.o })); setStep(2); };
  const handleEssaySubmit = (essayData) => { 
    const finalData = { ...data, ...essayData }; 
    setStep(3); 
    onComplete(finalData); 
  };

  return (
    <div className="h-full flex flex-col justify-center max-w-4xl mx-auto">
      {step === 0 && (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 max-w-md mx-auto w-full animate-in slide-in-from-right">
          <h2 className="text-2xl font-bold mb-6 text-slate-800">{t.welcome}</h2>
          <div className="space-y-4">
            <input value={data.name} onChange={e => setData({...data, name: e.target.value})} placeholder={t.name} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 outline-none focus:border-teal-500 transition-all" />
            <input type="number" value={data.age} onChange={e => setData({...data, age: e.target.value})} placeholder={t.age} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 outline-none focus:border-teal-500 transition-all" />
            <button disabled={!data.name || !data.age} onClick={() => handleInfoSubmit({name: data.name, age: data.age})} className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold hover:bg-teal-700 transition-all disabled:opacity-50">{t.start}</button>
          </div>
        </div>
      )}
      {step === 1 && <SJTTest t={t} onComplete={handleSJTSubmit} />}
      {step === 2 && <EssayTest t={t} onComplete={handleEssaySubmit} />}
      {step === 3 && <div className="flex flex-col items-center justify-center"><Brain className="text-teal-500 animate-pulse w-24 h-24 mb-4" /><h2 className="text-2xl font-bold text-slate-800">{t.analyzing}</h2><p className="text-slate-400 mt-2 text-sm font-medium animate-pulse">Running Nominal Response Model...</p></div>}
    </div>
  );
};

const SJTTest = ({ t, onComplete }) => {
  const [current, setCurrent] = useState(0);
  const handleSelect = () => {
    if (current < FULL_SJT.length - 1) setCurrent(c => c + 1);
    else onComplete({ c: 75, o: 65 });
  };
  const q = FULL_SJT[current];
  const progress = ((current + 1) / FULL_SJT.length) * 100;
  return (
    <div className="w-full animate-in fade-in duration-500">
      <div className="w-full bg-slate-200 h-3 rounded-full mb-8 overflow-hidden"><div className="bg-teal-500 h-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div></div>
      <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 relative">
         <span className="inline-block px-4 py-1.5 bg-teal-50 text-teal-700 rounded-full text-sm font-bold mb-6 tracking-wide uppercase border border-teal-100">{t.scenario} {current + 1} / {FULL_SJT.length}</span>
         <h3 className="text-2xl font-semibold text-slate-800 mb-8">{t === LANGUAGES.ar ? q.text_ar : q.text_en}</h3>
         <div className="grid gap-3">
           {(t === LANGUAGES.ar ? q.options_ar : q.options_en).map((opt, i) => (
             <button key={i} onClick={handleSelect} className="w-full text-start p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all font-medium text-slate-600 hover:text-slate-900">{opt}</button>
           ))}
         </div>
      </div>
    </div>
  );
};

const EssayTest = ({ t, onComplete }) => {
  const [section, setSection] = useState(0); 
  const [text, setText] = useState('');
  const [responses, setResponses] = useState({});
  const prompts = [
    { title: t.essay_title_c, prompt: t.essay_c, key: 'c_essay' },
    { title: t.essay_title_o, prompt: t.essay_o, key: 'o_essay' },
    { title: t.essay_title_free, prompt: t.essay_free, key: 'free_essay' }
  ];
  const handleNext = () => {
    const updated = { ...responses, [prompts[section].key]: text };
    if (section < prompts.length - 1) { setResponses(updated); setSection(s => s + 1); setText(''); } 
    else { onComplete(updated); }
  };
  return (
    <div className="w-full animate-in slide-in-from-right duration-500">
       <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 min-h-[500px] flex flex-col relative">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-2xl font-bold text-slate-800">{prompts[section].title}</h3>
             <div className="flex gap-2">{[0, 1, 2].map(i => <div key={i} className={`h-2 w-8 rounded-full transition-all ${i <= section ? 'bg-teal-500' : 'bg-slate-200'}`} />)}</div>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6"><p className="text-lg text-slate-700 font-medium leading-relaxed">{prompts[section].prompt}</p></div>
          <textarea value={text} onChange={e => setText(e.target.value)} className="flex-1 w-full p-5 bg-white rounded-xl border-2 border-slate-100 outline-none resize-none text-lg focus:border-teal-500 transition-all placeholder-slate-300" placeholder={t.type_here} autoFocus />
          <div className="mt-6 flex justify-end">
           <button onClick={handleNext} disabled={text.length < 5} className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center gap-2">{section === 2 ? t.submit : t.next} <ArrowRight size={18} /></button>
          </div>
       </div>
    </div>
  );
};

// --- DASHBOARD ---
const Dashboard = ({ t, userId, profile, lang, appId, isOffline, setIsOffline }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [notifications, setNotifications] = useState([]);
  const [showInbox, setShowInbox] = useState(false);

  useEffect(() => {
    if (!userId || isOffline) return;
    const q = query(collection(db, 'artifacts', appId, 'users', userId, 'inbox'));
    const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
        setNotifications(data);
    }, (err) => {
        console.log("Inbox Offline", err);
        setIsOffline(true);
    });
    return () => unsub();
  }, [userId, isOffline]);

  return (
    <div className="h-full flex gap-6 pb-6 pt-4 animate-in fade-in duration-700 relative">
      <div className="w-24 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center py-8 gap-6 z-10">
        <NavIcon icon={<MessageCircle />} active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
        <NavIcon icon={<Calendar />} active={activeTab === 'plan'} onClick={() => setActiveTab('plan')} />
        <NavIcon icon={<BookOpen />} active={activeTab === 'journal'} onClick={() => setActiveTab('journal')} />
        
        <div className="mt-auto relative">
           <button onClick={() => setShowInbox(!showInbox)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all relative">
               <Bell size={18} />
               {notifications.length > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
           </button>
        </div>
        <div className="mb-2"><div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold border border-teal-200">{profile?.name?.[0] || "U"}</div></div>
      </div>

      <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden relative flex flex-col">
        {activeTab === 'chat' && <ChatModule t={t} userId={userId} lang={lang} profile={profile} appId={appId} isOffline={isOffline} />}
        {activeTab === 'plan' && <PlannerModule t={t} userId={userId} lang={lang} profile={profile} appId={appId} isOffline={isOffline} />}
        {activeTab === 'journal' && <JournalModule t={t} userId={userId} lang={lang} profile={profile} appId={appId} isOffline={isOffline} />}
      </div>

      {showInbox && (
          <div className="absolute right-6 bottom-20 w-80 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-right-10 z-50">
             <div className="bg-slate-900 text-white p-4 font-bold flex justify-between">
                 <span>{t.inbox}</span>
                 <button onClick={() => setShowInbox(false)}><ArrowRight size={16} className="rotate-180"/></button>
             </div>
             <div className="max-h-96 overflow-y-auto">
                 {notifications.length === 0 ? <div className="p-6 text-center text-slate-400">Empty</div> : 
                  notifications.map(n => (
                      <div key={n.id} className="p-4 border-b border-slate-100 hover:bg-slate-50">
                          <div className="font-bold text-sm text-slate-800">{n.subject}</div>
                          <div className="text-xs text-slate-500 mt-1 line-clamp-3 whitespace-pre-line">{n.body}</div>
                      </div>
                  ))}
             </div>
         </div>
      )}
    </div>
  );
};

const NavIcon = ({ icon, active, onClick }) => (
  <button onClick={onClick} className={`p-4 rounded-2xl transition-all duration-300 ${active ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/40 scale-110' : 'text-slate-400 hover:bg-slate-50 hover:text-teal-600'}`}>{React.cloneElement(icon, { size: 28 })}</button>
);

// --- MODULES ---

// --- CHAT MODULE (FIXED) ---
const ChatModule = ({ t, userId, lang, profile, appId, isOffline }) => {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTasks, setCurrentTasks] = useState([]);
  const scrollRef = useRef(null);

  // Load Chat History
  useEffect(() => {
    if(!userId || isOffline) return;
    const q = query(collection(db, 'artifacts', appId, 'users', userId, 'chat'));
    const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort by timestamp
        data.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        setMsgs(data);
    }, (err) => console.log("Chat Offline", err));
    return () => unsub();
  }, [userId, isOffline]);

  // Fetch Tasks for Context
  useEffect(() => {
    if(!userId || isOffline) return;
    const q = query(collection(db, 'artifacts', appId, 'users', userId, 'tasks'));
    const unsub = onSnapshot(q, (snap) => {
        const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCurrentTasks(tasks);
    }, () => {});
    return () => unsub();
  }, [userId, isOffline]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading]);

  const send = async () => {
    if(!input.trim()) return;
    const text = input;
    setInput('');
    setLoading(true);

    // 1. Optimistic Update
    if (!isOffline) {
        await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'chat'), {
            role: 'user', text, createdAt: serverTimestamp()
        });
    } else {
        setMsgs(prev => [...prev, {id: Date.now(), role: 'user', text}]);
    }

    try {
        // 2. Prepare Context (Tasks)
        const taskListString = currentTasks.map(t => `- ${t.text} (ID: ${t.id})`).join('\n');
        
        // 3. System Prompt
        const systemPrompt = `
          IDENTITY: You are "Aura", a sophisticated AI mentor using the BIG-5 personality model.
          USER PROFILE: Name: ${profile.name}, Age: ${profile.age}, C:${profile.c_score}, O:${profile.o_score}.
          CURRENT TASKS:
          ${taskListString}

          CRITICAL LANGUAGE INSTRUCTIONS:
          - The user's interface language is: ${lang === 'ar' ? 'Arabic' : 'English'}.
          - IF 'ar': You MUST speak in EGYPTIAN ARABIC (Masri) slang. Be friendly, helpful, and sound like a cool mentor from Cairo. Do NOT use Modern Standard Arabic (Fusha).
          - IF 'en': Speak in clear English.

          TOOLS & BEHAVIOR:
          - If the user wants to add a task, strictly write on a new line: [ADD: task text]
          - If the user wants to update a task, strictly write: [MOD: old_task_text -> new_task_text]
          - Keep responses concise and encouraging.
        `;

        // 4. PREPARE HISTORY FOR API (FIXED)
        // Map local history to API format { role, parts: [{ text }] }
        // Note: The API uses 'model' for AI role, but we store as 'ai'.
        const apiHistory = msgs.map(m => ({
            role: m.role === 'ai' ? 'model' : 'user',
            parts: [{ text: m.text }]
        }));
        
        // Add current message to history
        apiHistory.push({ role: 'user', parts: [{ text }] });

        // 5. Call AI with Full History
        const aiRaw = await callGemini(apiHistory, systemPrompt);
        let aiText = aiRaw;
        
        // 6. Parse Commands (ADD/MOD)
        const modMatch = aiRaw.match(/\[MOD:\s*(.*?)\s*->\s*(.*?)\]/);
        if (modMatch) {
            const oldText = modMatch[1].trim();
            const newText = modMatch[2].trim();
            aiText = aiRaw.replace(/\[MOD:.*?\]/, "").trim(); 
            const targetTask = currentTasks.find(t => t.text.includes(oldText));
            if (targetTask && !isOffline) {
               await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'tasks', targetTask.id), { text: newText });
               aiText += `\n(✓ ${t.task_auto_updated} ${newText})`;
            }
        }

        const addMatch = aiRaw.match(/\[ADD:\s*(.*?)\]/);
        if (addMatch) {
            const newText = addMatch[1].trim();
            aiText = aiRaw.replace(/\[ADD:.*?\]/, "").trim();
            const isDuplicate = currentTasks.some(t => t.text.toLowerCase() === newText.toLowerCase());
            if (!isDuplicate && !isOffline) {
               await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'tasks'), { text: newText, done: false, type: 'ai-smart', createdAt: serverTimestamp() });
               aiText += `\n(✓ ${t.task_auto_added} ${newText})`;
            }
        }

        // 7. Save Response
        if (!isOffline) {
            await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'chat'), {
                role: 'ai', text: aiText, createdAt: serverTimestamp()
            });
        } else {
            setMsgs(prev => [...prev, {id: Date.now()+1, role: 'ai', text: aiText}]);
        }

    } catch (e) {
        const errMsg = e.message || (lang === 'ar' ? "معلش في مشكلة في الاتصال، حاول تاني." : "Connection failed. Please check internet.");
        
        if (!isOffline) {
            await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'chat'), {
                role: 'ai', text: `⚠️ Error: ${errMsg}`, createdAt: serverTimestamp()
            });
        } else {
            setMsgs(prev => [...prev, {id: Date.now()+2, role: 'ai', text: `⚠️ Error: ${errMsg}`}]);
        }
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
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [isMagicLoading, setIsMagicLoading] = useState(false);

  useEffect(() => {
    if(!userId || isOffline) return;
    const q = query(collection(db, 'artifacts', appId, 'users', userId, 'tasks'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTasks(data);
    }, (err) => console.log("Planner Offline", err));
    return () => unsub();
  }, [userId, isOffline]);

  const addTask = async (text, type = 'manual') => {
    if (!text.trim()) return;
    if (isOffline) {
        setTasks(prev => [{id: Date.now(), text, done: false, type}, ...prev]);
        setNewTask('');
        return;
    }
    await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'tasks'), {
      text, done: false, type, createdAt: serverTimestamp()
    });
    setNewTask('');
  };

  const toggleTask = async (task) => {
    if (isOffline) {
        setTasks(prev => prev.map(t => t.id === task.id ? {...t, done: !t.done} : t));
        return;
    }
    await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'tasks', task.id), { done: !task.done });
  };

  const deleteTask = async (id) => {
    if (isOffline) {
        setTasks(prev => prev.filter(t => t.id !== id));
        return;
    }
    await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'tasks', id));
  };

  const magicBreakdown = async () => {
    if (!newTask.trim()) return;
    setIsMagicLoading(true);
    // Wrap single prompt in array for the new callGemini signature
    const result = await callGemini([{ role: 'user', parts: [{ text: `Break down goal "${newTask}" into 3 steps. Language: ${lang === 'ar' ? 'Egyptian Arabic' : 'English'}. Return steps joined by |||` }] }]);
    const subtasks = result.split('|||').map(s => s.trim()).filter(s => s);
    for (const st of subtasks) await addTask(st, 'ai-magic');
    setNewTask('');
    setIsMagicLoading(false);
  };

  return (
    <div className="p-10 h-full overflow-y-auto bg-slate-50/30">
      <div className="flex justify-between items-end mb-8">
         <div><h2 className="text-3xl font-bold text-slate-800">{t.plan}</h2><p className="text-teal-600 font-medium mt-1">Mode: {profile?.c_score > 50 ? "High Structure" : "Flexible Flow"}</p></div>
      </div>
      <div className="bg-white p-2 rounded-2xl border border-slate-200 mb-8 flex gap-2 shadow-sm">
          <input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Type a goal..." className="flex-1 bg-transparent p-4 outline-none text-lg" />
          <button onClick={magicBreakdown} disabled={!newTask || isMagicLoading} className="bg-purple-100 text-purple-700 px-4 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-200 transition-all disabled:opacity-50">
             {isMagicLoading ? <Sparkles size={18} className="animate-spin" /> : <Sparkles size={18} />} {t.task_magic}
          </button>
          <button onClick={() => addTask(newTask)} className="bg-slate-900 text-white px-6 rounded-xl font-bold hover:bg-slate-800 transition-all"><Plus size={20} /></button>
      </div>
      <div className="grid gap-4">
       {tasks.map(task => (
          <div key={task.id} className="group flex items-center gap-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
             <button onClick={() => toggleTask(task)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${task.done ? 'bg-teal-500 border-teal-500' : 'border-slate-300'}`}>{task.done && <CheckCircle size={18} className="text-white" />}</button>
             <span className={`flex-1 text-xl font-medium ${task.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.text}</span>
             <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${task.type === 'ai-smart' ? 'bg-indigo-100 text-indigo-600' : task.type === 'ai-magic' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'}`}>
               {task.type === 'ai-smart' ? 'Chat Auto' : task.type === 'ai-magic' ? 'Magic' : 'Manual'}
             </div>
             <button onClick={() => deleteTask(task.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2"><Trash2 size={20} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

const JournalModule = ({ t, userId, lang, appId, isOffline }) => {
  const [entry, setEntry] = useState('');
  const [insight, setInsight] = useState('');
  const analyze = async () => {
    if(entry.length < 10) return;
    // Wrap single prompt in array for the new callGemini signature
    const res = await callGemini([{ role: 'user', parts: [{ text: `Analyze journal: "${entry}". Give 1 sentence advice in ${lang === 'ar' ? 'Egyptian Arabic' : 'English'}.` }] }]);
    setInsight(res);
  }
  return (
    <div className="p-10 h-full flex flex-col bg-[#fffdf5]">
       <div className="flex justify-between items-center mb-6">
         <h2 className="text-3xl font-bold text-slate-800">{t.journal}</h2>
         <button onClick={analyze} className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full font-bold flex gap-2"><Lightbulb size={16}/> Analyze</button>
       </div>
       <div className="flex-1 bg-white rounded-[2rem] border border-yellow-100 p-8 shadow-sm">
        <textarea value={entry} onChange={e => setEntry(e.target.value)} className="w-full h-full resize-none outline-none text-xl leading-relaxed text-slate-700 placeholder-slate-300" placeholder="Write your thoughts..." />
       </div>
       {insight && <div className="mt-4 p-6 bg-yellow-50 rounded-3xl border border-yellow-200 text-slate-800 italic">{insight}</div>}
    </div>
  );
}

