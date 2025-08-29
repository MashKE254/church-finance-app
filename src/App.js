import React, { useState, useEffect, createContext, useContext } from 'react';
import './index.css';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    Timestamp,
    updateDoc,
    deleteDoc,
    setLogLevel,
    getDocs,
    writeBatch,
    orderBy,
    limit
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { AreaChart, Area, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { User, DollarSign, Users, BarChart2, Settings, LogOut, HandHeart, FileText, PlusCircle, Trash2, Edit, X, CheckCircle, AlertTriangle, Home, Eye, Menu, Target, PiggyBank, Receipt, MessageSquare, Repeat, Calendar, Package, Upload, Link as LinkIcon, Users2, Bell, TrendingUp, Briefcase, Landmark, FileCheck2, Search, CreditCard, Smartphone, BookCopy, FileInput, FileOutput, History, UserCheck, Sun, Moon, ExternalLink, ArrowLeft, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Firebase Configuration ---
const appId = (typeof window !== 'undefined' && window.__app_id !== undefined)
    ? window.__app_id
    : 'church-finance-app-local';

const firebaseConfig = (typeof window !== 'undefined' && window.__firebase_config !== undefined)
    ? JSON.parse(window.__firebase_config)
    : {
        apiKey: "AIzaSyBLPTb0WY0ihUg_Ss6AGXGZ1lRINZwnWM8",
        authDomain: "church-finance-app-741ea.firebaseapp.com",
        projectId: "church-finance-app-741ea",
        storageBucket: "church-finance-app-741ea.appspot.com",
        messagingSenderId: "146490327218",
        appId: "1:146490327218:web:04f090e315ab469c2a89ab",
        measurementId: "G-JLKSL15GXQ"
    };

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
setLogLevel('error');

// --- Application Context ---
const AppContext = createContext(null);

// --- HELPER FUNCTIONS for Ledger and Audit ---
const logAuditEvent = async (user, action) => {
    try {
        await addDoc(collection(db, `artifacts/${appId}/public/data/audit_trail`), {
            user: user.email,
            action: action,
            timestamp: Timestamp.now(),
        });
    } catch (error) {
        console.error("Failed to log audit event:", error);
    }
};

const createLedgerEntries = async (entries) => {
    try {
        const batch = writeBatch(db);
        entries.forEach(entry => {
            const docRef = doc(collection(db, `artifacts/${appId}/public/data/general_ledger`));
            batch.set(docRef, { ...entry, date: Timestamp.now() });
        });
        await batch.commit();
    } catch (error) {
        console.error("Failed to create ledger entries:", error);
    }
};

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [showOnboarding, setShowOnboarding] = useState(false);
    
    // --- THEME STATE MANAGEMENT ---
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
    };
    // --- END THEME STATE MANAGEMENT ---

    useEffect(() => {
        let unsubscribeDoc = () => {}; // Initialize an empty unsubscribe function for the document listener

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            unsubscribeDoc(); // Unsubscribe from any previous document listener

            if (firebaseUser && !firebaseUser.isAnonymous) {
                const userDocRef = doc(db, "users", firebaseUser.uid);

                // Set up the real-time listener for the user's document
                unsubscribeDoc = onSnapshot(userDocRef, (userDocSnap) => {
                    if (userDocSnap.exists()) {
                        const data = userDocSnap.data();
                        setUserData({ uid: firebaseUser.uid, ...data });
                        if (!data.onboardingCompleted) {
                            setShowOnboarding(true);
                        }
                    }
                });

                // Check if the user document exists on initial load, create if not
                const initialDoc = await getDoc(userDocRef);
                if (!initialDoc.exists()) {
                    const newUser = { uid: firebaseUser.uid, email: firebaseUser.email, role: 'member', name: firebaseUser.displayName || 'New Member', createdAt: Timestamp.now(), onboardingCompleted: false, groupId: null, groupName: null, joinRequest: null };
                    await setDoc(userDocRef, newUser);
                    // The onSnapshot listener above will automatically set the user data
                    setShowOnboarding(true);
                }
                setUser(firebaseUser);
            } else {
                // User is signed out
                setUser(null);
                setUserData(null);
            }
            setLoading(false);
        });

        // Cleanup function to be called when the App component unmounts
        return () => {
            unsubscribeAuth();
            unsubscribeDoc();
        };
    }, []); // The empty dependency array ensures this runs only once on mount

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setCurrentPage('login');
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };
    
    const completeOnboarding = async () => {
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, { onboardingCompleted: true });
            setUserData(prev => ({ ...prev, onboardingCompleted: true }));
            setShowOnboarding(false);
        }
    };

    if (loading) return <LoadingScreen message="Initializing FaithFinance Portal..." />;
    if (!user || !userData) return <Auth setCurrentPage={setCurrentPage} />;
    
    if (showOnboarding) {
        return <OnboardingWizard onComplete={completeOnboarding} />;
    }

    return (
        <AppContext.Provider value={{ user, userData, db, appId, storage, logAuditEvent, createLedgerEntries, theme, toggleTheme, setCurrentPage }}>
            <DashboardLayout
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                handleLogout={handleLogout}
            >
                <PageContent currentPage={currentPage} setCurrentPage={setCurrentPage} />
            </DashboardLayout>
        </AppContext.Provider>
    );
}

// --- Authentication Components ---
function Auth({ setCurrentPage }) {
    const [isLogin, setIsLogin] = useState(true);
    const handleAuthSuccess = () => setCurrentPage('dashboard');

    return (
        <div className="bg-slate-100 dark:bg-slate-950 min-h-screen flex items-center justify-center font-sans p-4 overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-950 via-primary to-secondary opacity-20 dark:opacity-40 animate-[spin_20s_linear_infinite]"></div>
             <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] bg-gradient-to-tr from-slate-950 via-transparent to-accent-cyan opacity-10 dark:opacity-30 animate-[spin_25s_linear_infinite_reverse]"></div>
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ duration: 0.5, ease: "easeInOut" }} 
                className="relative w-full max-w-md p-8 space-y-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            >
                <div className="text-center">
                    <HandHeart className="mx-auto h-12 w-auto text-primary" />
                    <h2 className="mt-4 text-3xl font-bold text-slate-800 dark:text-slate-100">FaithFinance</h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{isLogin ? 'Sign in to manage your church finances' : 'Create your new account'}</p>
                </div>
                {isLogin ? <LoginForm onAuthSuccess={handleAuthSuccess} /> : <SignUpForm onAuthSuccess={handleAuthSuccess} />}
                <div className="text-sm text-center">
                    <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-primary hover:text-indigo-400 transition-colors duration-200">
                        {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

function getFriendlyAuthErrorMessage(err) {
    switch (err.code) {
        case 'auth/user-not-found': case 'auth/wrong-password': return 'Invalid email or password.';
        case 'auth/invalid-email': return 'The email address is not valid.';
        case 'auth/email-already-in-use': return 'This email address is already registered.';
        case 'auth/weak-password': return 'Password must be at least 6 characters.';
        default: return `An unexpected error occurred. Please try again.`;
    }
}

function AuthInput({ type, value, onChange, placeholder, required }) {
    return (
        <input 
            type={type} 
            value={value} 
            onChange={onChange} 
            placeholder={placeholder} 
            required={required}
            className="w-full px-4 py-3 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border-2 border-slate-300 dark:border-slate-700 focus:border-primary focus:bg-slate-100 dark:focus:bg-slate-800 focus:ring-0 text-slate-800 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-500 transition-all duration-200"
        />
    );
}

function AuthButton({ loading, text, loadingText }) {
    return (
        <motion.button 
            whileHover={{ scale: 1.02, y: -2 }} 
            whileTap={{ scale: 0.98, y: 0 }} 
            type="submit" 
            disabled={loading} 
            className="w-full flex justify-center py-3 px-4 rounded-lg shadow-lg text-sm font-bold text-white bg-primary hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-200"
        >
            {loading ? loadingText : text}
        </motion.button>
    );
}

function LoginForm({ onAuthSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            onAuthSuccess();
        } catch (err) {
            setError(getFriendlyAuthErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="space-y-6" onSubmit={handleLogin}>
            {error && <p className="text-accent-rose text-xs text-center p-2 bg-rose-900/30 rounded-lg">{error}</p>}
            <AuthInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required />
            <AuthInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
            <AuthButton loading={loading} text="Sign In" loadingText="Signing In..." />
        </form>
    );
}

function SignUpForm({ onAuthSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, "users", userCredential.user.uid), { 
                name, 
                email, 
                role: 'member', 
                createdAt: Timestamp.now(), 
                onboardingCompleted: false,
                groupId: null,
                groupName: null,
                joinRequest: null
            });
            onAuthSuccess();
        } catch (err) {
            setError(getFriendlyAuthErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="space-y-4" onSubmit={handleSignUp}>
            {error && <p className="text-accent-rose text-xs text-center p-2 bg-rose-900/30 rounded-lg">{error}</p>}
            <AuthInput type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" required />
            <AuthInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required />
            <AuthInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min. 6 characters)" required />
            <AuthButton loading={loading} text="Sign Up" loadingText="Creating Account..." />
        </form>
    );
}


// --- Onboarding Wizard ---
function OnboardingWizard({ onComplete }) {
    const [step, setStep] = useState(1);
    const totalSteps = 3;

    const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    return (
        <div className="bg-slate-100 dark:bg-slate-950 min-h-screen flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="w-full max-w-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8"
            >
                <AnimatePresence mode="wait">
                    {step === 1 && <OnboardingStep key={1} title="Welcome to FaithFinance!" description="Let's get your financial hub set up. This quick tour will guide you through the key features." onNext={nextStep} />}
                    {step === 2 && <OnboardingStep key={2} title="Configure Your Funds" description="Funds are essential for tracking income and expenses. You can create funds like 'General Fund', 'Building Fund', or 'Missions'. You can manage these in the settings later." onNext={nextStep} onBack={prevStep} />}
                    {step === 3 && <OnboardingStep key={3} title="You're All Set!" description="You've completed the initial setup. You can now explore your dashboard and manage your finances. Click finish to get started!" onComplete={onComplete} onBack={prevStep} />}
                </AnimatePresence>
                <div className="flex justify-center mt-6">
                    {[...Array(totalSteps)].map((_, i) => (
                        <div key={i} className={`h-2 w-8 mx-1 rounded-full transition-colors ${i + 1 <= step ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}

function OnboardingStep({ title, description, onNext, onBack, onComplete }) {
    return (
        <motion.div 
            initial={{ opacity: 0, x: 50 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -50 }} 
            transition={{ duration: 0.3 }}
            className="text-slate-800 dark:text-white"
        >
            <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">{title}</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8">{description}</p>
            </div>
            <div className="flex justify-center space-x-4">
                {onBack && <button onClick={onBack} className="px-6 py-2 rounded-lg text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Back</button>}
                {onNext && <button onClick={onNext} className="px-6 py-2 rounded-lg text-white bg-primary hover:bg-indigo-500 transition-colors">Next</button>}
                {onComplete && <button onClick={onComplete} className="px-6 py-2 rounded-lg text-white bg-green-600 hover:bg-green-500 transition-colors">Finish</button>}
            </div>
        </motion.div>
    );
}


// --- Layout Components ---
function DashboardLayout({ children, currentPage, setCurrentPage, handleLogout }) {
    const { userData } = useContext(AppContext);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} role={userData.role} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header handleLogout={handleLogout} user={userData} setSidebarOpen={setSidebarOpen} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={currentPage} 
                            initial={{ opacity: 0, y: 20 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: -20 }} 
                            transition={{ duration: 0.3 }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}

function Sidebar({ currentPage, setCurrentPage, role, sidebarOpen, setSidebarOpen }) {
    const getNavLinks = (userRole) => {
        const memberLinks = [
            { name: 'Dashboard', icon: Home, page: 'dashboard' },
            { name: 'Give Now', icon: HandHeart, page: 'give' },
            { name: 'My Pledges', icon: Repeat, page: 'pledges' },
            { name: 'Giving History', icon: FileText, page: 'history' },
            { name: 'Events', icon: Calendar, page: 'events' },
            { name: 'Small Groups', icon: Users2, page: 'small_groups' },
        ];
        const adminLinks = [
            { name: 'Admin Dashboard', icon: BarChart2, page: 'admin_dashboard' },
            { name: 'Donations', icon: DollarSign, page: 'manage_donations' },
            { name: 'Expenses', icon: Receipt, page: 'manage_expenses' },
            { name: 'Bills (A/P)', icon: FileInput, page: 'accounts_payable' },
            { name: 'Invoices (A/R)', icon: FileOutput, page: 'accounts_receivable' },
            { name: 'Budgets', icon: PiggyBank, page: 'manage_budgets' },
            { name: 'General Ledger', icon: BookCopy, page: 'general_ledger' },
            { name: 'Pledges', icon: Repeat, page: 'manage_pledges' },
            { name: 'Events', icon: Calendar, page: 'manage_events' },
            { name: 'Assets', icon: Package, page: 'manage_assets' },
            { name: 'Payroll', icon: UserCheck, page: 'payroll' },
            { name: 'Members', icon: Users, page: 'manage_members' },
            { name: 'Small Groups', icon: Users2, page: 'manage_small_groups' },
            { name: 'Messaging', icon: MessageSquare, page: 'bulk_messaging' },
            { name: 'Reports', icon: FileText, page: 'reports' },
            { name: 'Bank Reconciliation', icon: Landmark, page: 'bank_reconciliation' },
            { name: 'Audit Trail', icon: History, page: 'audit_trail' },
        ];
        const leaderLinks = [
            { name: 'Leadership View', icon: Eye, page: 'leader_dashboard' },
            { name: 'View Reports', icon: FileText, page: 'reports' },
        ];
        
        if (userRole === 'admin') return adminLinks;
        if (userRole === 'leader') return leaderLinks;
        return memberLinks;
    };

    const navLinks = getNavLinks(role);

    return (
        <>
            <AnimatePresence>
                {sidebarOpen && 
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="fixed inset-0 bg-black/60 z-20 lg:hidden" 
                        onClick={() => setSidebarOpen(false)}
                    />
                }
            </AnimatePresence>
            <motion.div 
                className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl transform lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-30 flex flex-col`} 
                initial={{ x: '-100%' }} 
                animate={{ x: sidebarOpen || window.innerWidth >= 1024 ? '0%' : '-100%' }}
            >
                <div className="flex items-center justify-center p-5 border-b border-slate-200 dark:border-slate-800">
                    <HandHeart className="h-8 w-8 text-primary" />
                    <span className="text-slate-900 dark:text-slate-100 text-xl font-bold ml-2">FaithFinance</span>
                </div>
                <nav className="flex-1 mt-6 space-y-1 px-2 overflow-y-auto">
                    {navLinks.map((link) => (
                        <motion.button 
                            key={link.name} 
                            onClick={() => { setCurrentPage(link.page); if (window.innerWidth < 1024) setSidebarOpen(false); }} 
                            whileHover={{ x: 5 }}
                            whileTap={{ scale: 0.98 }}
                            className={`w-full flex items-center py-2.5 px-4 font-medium rounded-lg transition-all duration-200 relative ${
                                currentPage === link.page 
                                    ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-white shadow-md' 
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            {currentPage === link.page && <motion.div layoutId="active-nav-indicator" className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"/>}
                            <link.icon className="h-5 w-5 mr-3" />
                            {link.name}
                        </motion.button>
                    ))}
                </nav>
                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                     <motion.button 
                        onClick={() => setCurrentPage('settings')} 
                        whileHover={{ x: 5 }} 
                        whileTap={{ scale: 0.98 }}
                        className={`w-full flex items-center py-2.5 px-4 font-medium rounded-lg transition-all duration-200 relative ${
                            currentPage === 'settings' 
                                ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-white' 
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                     >
                        {currentPage === 'settings' && <motion.div layoutId="active-nav-indicator" className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"/>}
                        <Settings className="h-5 w-5 mr-3" />Settings
                    </motion.button>
                </div>
            </motion.div>
        </>
    );
}


function ThemeToggler() {
    const { theme, toggleTheme } = useContext(AppContext);
    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-slate-900"
            aria-label="Toggle theme"
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={theme}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </motion.div>
            </AnimatePresence>
        </button>
    );
}


function Header({ handleLogout, user, setSidebarOpen }) {
    const pageTitle = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const notifications = [
        { id: 1, text: "New large donation of Ksh 50,000 received.", time: "5m ago", read: false },
        { id: 2, text: "Utilities budget is at 95% of its limit.", time: "1h ago", read: false },
        { id: 3, text: "Monthly report for July is ready.", time: "1d ago", read: true },
    ];

    return (
        <header className="flex items-center justify-between p-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center">
                 <button onClick={() => setSidebarOpen(true)} className="text-slate-500 dark:text-slate-400 focus:outline-none lg:hidden mr-4"><Menu className="h-6 w-6" /></button>
                <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200">{pageTitle} View</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
                <ThemeToggler />
                <div className="relative">
                    <button onClick={() => setNotificationsOpen(!notificationsOpen)} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800/50 relative">
                        <Bell className="h-6 w-6" />
                        <span className="absolute top-0 right-0 h-3 w-3 bg-accent-rose rounded-full border-2 border-white dark:border-slate-900"></span>
                    </button>
                    <AnimatePresence>
                        {notificationsOpen && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -10 }} 
                                className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20"
                            >
                                <div className="p-4 font-bold border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100">Notifications</div>
                                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {notifications.map(n => (
                                        <div key={n.id} className={`p-3 hover:bg-slate-100 dark:hover:bg-slate-700/50 ${!n.read ? 'text-slate-800 dark:text-slate-100 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                                            <p className="text-sm">{n.text}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{n.time}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <div className="relative">
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                    <User className="h-8 w-8 p-1.5 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300" />
                </div>
                <div className="text-right hidden sm:block">
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                </div>
                <button 
                    onClick={handleLogout} 
                    className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-slate-900"
                >
                    <LogOut className="h-5 w-5" />
                </button>
            </div>
        </header>
    );
}

// --- Page Content Router ---
function PageContent({ currentPage, setCurrentPage }) {
    const { userData } = useContext(AppContext);
    const isAdmin = userData.role === 'admin';

    switch (currentPage) {
        case 'dashboard': return isAdmin ? <AdminDashboard /> : <MemberDashboard />;
        case 'admin_dashboard': return <AdminDashboard />;
        case 'manage_donations': return <ManageDonations />;
        case 'manage_expenses': return <ManageExpenses />;
        case 'accounts_payable': return <AccountsPayablePage />;
        case 'accounts_receivable': return <AccountsReceivablePage />;
        case 'general_ledger': return <GeneralLedgerPage />;
        case 'payroll': return <PayrollPage />;
        case 'audit_trail': return <AuditTrailPage />;
        case 'manage_budgets': return <ManageBudgets />;
        case 'manage_pledges': return <ManagePledges />;
        case 'manage_events': return <ManageEvents />;
        case 'manage_assets': return <ManageAssets />;
        case 'manage_members': return <MemberManagement />;
        case 'manage_small_groups': return <ManageSmallGroups />;
        case 'bulk_messaging': return <BulkMessagingPage />;
        case 'reports': return <ReportsPage />;
        case 'bank_reconciliation': return <BankReconciliation />;
        case 'give': return <GiveNowPage setCurrentPage={setCurrentPage} />;
        case 'history': return <GivingHistoryPage />;
        case 'pledges': return <MemberPledgesPage />;
        case 'events': return <EventsPage />;
        case 'small_groups': return <SmallGroupsPage />;
        case 'settings': return <SettingsPage />;
        case 'leader_dashboard': return <LeadershipDashboard />;
        default: return <div className="text-center p-10"><h2 className="text-2xl font-bold">Page Not Found</h2><p>Select a page from the sidebar.</p></div>;
    }
}

// --- Reusable Components ---
function LoadingScreen({ message }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-950">
            <HandHeart className="h-16 w-16 text-primary animate-pulse" />
            <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">{message}</p>
        </div>
    );
}

function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.9, opacity: 0 }} 
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
            >
                <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800">
                        <X className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">{children}</div>
            </motion.div>
        </div>
    );
}

// --- Admin Components ---
function AdminDashboard() {
    const { db, appId, theme } = useContext(AppContext);
    const [stats, setStats] = useState({ revenue: 0, expenses: 0, members: 0 });
    const [givingByFundData, setGivingByFundData] = useState([]);
    const [cashFlowData, setCashFlowData] = useState([]);
    const [loading, setLoading] = useState(true);

    const chartTextColor = theme === 'dark' ? '#94a3b8' : '#475569';
    const chartGridColor = theme === 'dark' ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.1)';

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            const donationsQuery = query(
                collection(db, `artifacts/${appId}/public/data/donations`),
                where('date', '>=', startOfMonth)
            );
            const donationsSnapshot = await getDocs(donationsQuery);
            let totalRevenue = 0;
            const fundMap = {};
            donationsSnapshot.forEach(doc => {
                const data = doc.data();
                totalRevenue += data.amount;
                fundMap[data.fund] = (fundMap[data.fund] || 0) + data.amount;
            });

            const expensesQuery = query(
                collection(db, `artifacts/${appId}/public/data/expenses`),
                where('date', '>=', startOfMonth)
            );
            const expensesSnapshot = await getDocs(expensesQuery);
            let totalExpenses = 0;
            expensesSnapshot.forEach(doc => totalExpenses += doc.data().amount);

            const membersSnapshot = await getDocs(collection(db, "users"));
            const totalMembers = membersSnapshot.size;

            setStats({ revenue: totalRevenue, expenses: totalExpenses, members: totalMembers });
            setGivingByFundData(Object.entries(fundMap).map(([name, value]) => ({ name, value })));
            
            setCashFlowData([
                { name: 'This Month', Inflow: totalRevenue, Outflow: totalExpenses },
                { name: 'Last Month', Inflow: totalRevenue * 0.8, Outflow: totalExpenses * 0.9 }, // Dummy data
            ]);

            setLoading(false);
        };

        fetchData();
    }, [db, appId]);
    
    if(loading) return <LoadingScreen message="Loading dashboard data..." />;

    const summaryData = [
        { name: 'Total Revenue (Month)', value: `Ksh ${stats.revenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-500 dark:text-green-400', bg: 'bg-green-500/10 dark:bg-green-900/30' },
        { name: 'Total Expenses (Month)', value: `Ksh ${stats.expenses.toLocaleString()}`, icon: Receipt, color: 'text-rose-500 dark:text-accent-rose', bg: 'bg-rose-500/10 dark:bg-rose-900/30' },
        { name: 'Net Income (Month)', value: `Ksh ${(stats.revenue - stats.expenses).toLocaleString()}`, icon: TrendingUp, color: 'text-cyan-500 dark:text-accent-cyan', bg: 'bg-cyan-500/10 dark:bg-cyan-900/30' },
        { name: 'Total Members', value: stats.members.toLocaleString(), icon: Users, color: 'text-purple-500 dark:text-secondary', bg: 'bg-purple-500/10 dark:bg-purple-900/30' }
    ];
    
    const COLORS = ['#4f46e5', '#0891b2', '#d97706', '#be123c'];

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="label text-slate-700 dark:text-slate-300">{`${label}`}</p>
                    {payload.map(p => (
                        <p key={p.name} style={{ color: p.color }}>{`${p.name}: Ksh ${p.value.toLocaleString()}`}</p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-slate-100">Admin Dashboard</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {summaryData.map((item, index) => (
                    <motion.div 
                        key={item.name} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{item.name}</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{item.value}</p>
                            </div>
                            <div className={`p-3 rounded-full ${item.bg} ${item.color}`}><item.icon className="h-6 w-6" /></div>
                        </div>
                    </motion.div>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="lg:col-span-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-lg">
                    <h3 className="font-bold mb-4 text-slate-900 dark:text-slate-100">Cash Flow Overview</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0891b2" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#0891b2" stopOpacity={0.2}/>
                                </linearGradient>
                                <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#be123c" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#be123c" stopOpacity={0.2}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                            <XAxis dataKey="name" tick={{ fill: chartTextColor }} axisLine={{ stroke: chartGridColor }} tickLine={{ stroke: chartGridColor }} />
                            <YAxis tick={{ fill: chartTextColor }} axisLine={{ stroke: chartGridColor }} tickLine={{ stroke: chartGridColor }} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(100, 116, 139, 0.1)' }}/>
                            <Legend wrapperStyle={{ color: chartTextColor }} />
                            <Bar dataKey="Inflow" fill="url(#colorInflow)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Outflow" fill="url(#colorOutflow)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-lg">
                    <h3 className="font-bold mb-4 text-slate-900 dark:text-slate-100">Giving by Fund</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie 
                                data={givingByFundData} 
                                cx="50%" 
                                cy="50%" 
                                labelLine={false} 
                                innerRadius={60}
                                outerRadius={110} 
                                fill="#8884d8" 
                                dataKey="value" 
                                nameKey="name"
                                paddingAngle={5}
                            >
                                {givingByFundData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ color: chartTextColor }}/>
                        </PieChart>
                    </ResponsiveContainer>
                </motion.div>
            </div>
        </div>
    );
}
function ManageDonations() {
    const { db, appId, userData, logAuditEvent, createLedgerEntries } = useContext(AppContext);
    const [donations, setDonations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingDonation, setEditingDonation] = useState(null);

    useEffect(() => {
        const q = query(collection(db, `artifacts/${appId}/public/data/donations`), orderBy("date", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const donationsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDonations(donationsData);
            setLoading(false);
        }, (error) => { console.error("Error fetching donations: ", error); setLoading(false); });
        return () => unsubscribe();
    }, [db, appId]);
    
    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingDonation(null);
    }
    
    const handleEditClick = (donation) => {
        setEditingDonation(donation);
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (donation) => {
        if(window.confirm("Are you sure you want to delete this donation record? This will also create reversing entries in the General Ledger.")){
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/donations`, donation.id));
            await logAuditEvent(userData, `Deleted donation of Ksh ${donation.amount} from '${donation.memberName}'`);
        }
    }

    const handleFormSubmit = async (donationData) => {
        try {
             const amount = parseFloat(donationData.amount);
             const memberDoc = await getDoc(doc(db, "users", donationData.userId));
             const memberData = memberDoc.exists() ? memberDoc.data() : {};

             const dataToSave = { 
                 ...donationData, 
                 date: Timestamp.fromDate(new Date(donationData.date)), 
                 amount, 
                 lastUpdatedAt: Timestamp.now(),
                 groupName: memberData.groupName || null,
                 groupId: memberData.groupId || null,
             };

            if(editingDonation){
                const docRef = doc(db, `artifacts/${appId}/public/data/donations`, editingDonation.id);
                await updateDoc(docRef, dataToSave);
                await logAuditEvent(userData, `Updated donation ID ${editingDonation.id} to Ksh ${amount}`);
            } else {
                 const docRef = await addDoc(collection(db, `artifacts/${appId}/public/data/donations`), { ...dataToSave, createdAt: Timestamp.now() });
                 await logAuditEvent(userData, `Added donation of Ksh ${amount} from '${donationData.memberName}'`);
                 await createLedgerEntries([
                     { account: 'Cash', description: `Donation from ${donationData.memberName}`, type: 'debit', amount: amount, referenceId: docRef.id },
                     { account: `${donationData.fund} Income`, description: `Donation from ${donationData.memberName}`, type: 'credit', amount: amount, referenceId: docRef.id }
                 ]);
            }
            handleModalClose();
        } catch (error) { console.error("Error saving document: ", error); }
    };

    const filteredDonations = donations.filter(d => 
        (d.memberName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.fund || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Manage Donations</h2>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 dark:text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Search donations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsModalOpen(true)} className="bg-primary text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-indigo-500 flex items-center space-x-2 transition-colors"><PlusCircle className="h-5 w-5" /><span>Add Offline Donation</span></motion.button>
                </div>
            </div>
            <Modal isOpen={isModalOpen} onClose={handleModalClose} title={editingDonation ? "Edit Donation" : "Add Offline Donation"}><DonationForm onSubmit={handleFormSubmit} onCancel={handleModalClose} donation={editingDonation} /></Modal>
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
                    <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-800/50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Date</th>
                            <th scope="col" className="px-6 py-3">Member Name</th>
                            <th scope="col" className="px-6 py-3">Group</th>
                            <th scope="col" className="px-6 py-3">Fund</th>
                            <th scope="col" className="px-6 py-3">Amount (Ksh)</th>
                            <th scope="col" className="px-6 py-3">Type</th>
                            <th scope="col" className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="7" className="text-center p-8">Loading donations...</td></tr> : filteredDonations.length === 0 ? <tr><td colSpan="7" className="text-center p-8">No donations recorded yet.</td></tr> :
                            filteredDonations.map(d => (
                                <tr key={d.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-4">{d.date ? d.date.toDate().toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{d.memberName}</td>
                                    <td className="px-6 py-4">{d.groupName || 'N/A'}</td>
                                    <td className="px-6 py-4">{d.fund}</td>
                                    <td className="px-6 py-4">{d.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${d.type === 'Offline' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'}`}>{d.type}</span></td>
                                    <td className="px-6 py-4 flex space-x-2 justify-end">
                                        <button onClick={() => handleEditClick(d)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary transition-colors"><Edit className="h-4 w-4" /></button>
                                        <button onClick={() => handleDeleteClick(d)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-accent-rose transition-colors"><Trash2 className="h-4 w-4" /></button>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function DonationForm({ onSubmit, onCancel, donation }) {
    const { db } = useContext(AppContext);
    const [members, setMembers] = useState([]);
    const [formData, setFormData] = useState({ userId: '', memberName: '', amount: '', fund: 'Tithes & Offering', date: new Date().toISOString().split('T')[0], type: 'Offline' });
    
    useEffect(() => {
        const fetchMembers = async () => {
            const membersSnapshot = await getDocs(collection(db, "users"));
            setMembers(membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchMembers();
    }, [db]);

    useEffect(() => {
        if(donation){
            setFormData({
                userId: donation.userId || '',
                memberName: donation.memberName || '',
                amount: donation.amount || '',
                fund: donation.fund || 'Tithes & Offering',
                date: donation.date ? donation.date.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                type: donation.type || 'Offline'
            });
        }
    }, [donation]);

    const handleChange = (e) => { 
        const { name, value } = e.target; 
        if (name === "userId") {
            const selectedMember = members.find(m => m.id === value);
            setFormData(prev => ({ ...prev, userId: value, memberName: selectedMember ? selectedMember.name : '' }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value })); 
        }
    };
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };
    
    const FormInput = ({label, ...props}) => (
         <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
            <input {...props} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-700/50 focus:ring-0 text-slate-900 dark:text-slate-100" />
        </div>
    );
    const FormSelect = ({label, children, ...props}) => (
         <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
            <select {...props} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-700/50 focus:ring-0 text-slate-900 dark:text-slate-100">
                {children}
            </select>
        </div>
    );
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormSelect label="Member" name="userId" value={formData.userId} onChange={handleChange} required>
                <option value="">Select a member</option>
                {members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
            </FormSelect>
            <FormInput label="Amount (Ksh)" type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="e.g., 5000" required />
            <FormSelect label="Fund" name="fund" value={formData.fund} onChange={handleChange}>
                <option>Tithes & Offering</option><option>Building Fund</option><option>Missions</option><option>Welfare</option>
            </FormSelect>
            <FormInput label="Date" type="date" name="date" value={formData.date} onChange={handleChange} required />
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-white bg-primary hover:bg-indigo-500 transition-colors">{donation ? 'Save Changes' : 'Add Donation'}</button>
            </div>
        </form>
    );
}

function ManageExpenses() {
    const { db, appId, storage, userData, logAuditEvent, createLedgerEntries } = useContext(AppContext);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);

    useEffect(() => {
        const q = query(collection(db, `artifacts/${appId}/public/data/expenses`), orderBy("date", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const expensesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setExpenses(expensesData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db, appId]);

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingExpense(null);
    };

    const handleEditClick = (expense) => {
        setEditingExpense(expense);
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (expense) => {
        if (window.confirm("Are you sure you want to delete this expense?")) {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/public/data/expenses`, expense.id));
                await logAuditEvent(userData, `Deleted expense: '${expense.description}' of Ksh ${expense.amount}`);
                if (expense.receiptUrl) {
                    const receiptRef = ref(storage, expense.receiptUrl);
                    await deleteObject(receiptRef);
                }
            } catch (error) {
                console.error("Error deleting expense: ", error);
            }
        }
    };

    const handleFormSubmit = async (expenseData, receiptFile) => {
        try {
            let receiptUrl = editingExpense ? editingExpense.receiptUrl : '';
            if (receiptFile) {
                if (editingExpense && editingExpense.receiptUrl) {
                    try { await deleteObject(ref(storage, editingExpense.receiptUrl)); } catch (e) { console.warn("Old receipt not found, continuing.")}
                }
                const storageRef = ref(storage, `receipts/${appId}/${Date.now()}_${receiptFile.name}`);
                await uploadBytes(storageRef, receiptFile);
                receiptUrl = await getDownloadURL(storageRef);
            }
            const amount = parseFloat(expenseData.amount);
            const dataToSave = { 
                ...expenseData, 
                date: Timestamp.fromDate(new Date(expenseData.date)), 
                amount, 
                receiptUrl, 
                lastUpdatedAt: Timestamp.now() 
            };
            
            if (editingExpense) {
                await updateDoc(doc(db, `artifacts/${appId}/public/data/expenses`, editingExpense.id), dataToSave);
                await logAuditEvent(userData, `Updated expense ID ${editingExpense.id} to '${expenseData.description}'`);
            } else {
                const docRef = await addDoc(collection(db, `artifacts/${appId}/public/data/expenses`), { ...dataToSave, createdAt: Timestamp.now() });
                await logAuditEvent(userData, `Added expense: '${expenseData.description}' of Ksh ${amount}`);
                await createLedgerEntries([
                    { account: `${expenseData.category} Expense`, description: expenseData.description, type: 'debit', amount: amount, referenceId: docRef.id },
                    { account: 'Cash', description: expenseData.description, type: 'credit', amount: amount, referenceId: docRef.id }
                ]);
            }
            handleModalClose();
        } catch (error) { console.error("Error adding expense: ", error); }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Manage Expenses</h2>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsModalOpen(true)} className="bg-accent-rose text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-rose-500 flex items-center space-x-2 transition-colors"><PlusCircle className="h-5 w-5" /><span>Add Expense</span></motion.button>
            </div>
            <Modal isOpen={isModalOpen} onClose={handleModalClose} title={editingExpense ? "Edit Expense" : "Add New Expense"}><ExpenseForm onSubmit={handleFormSubmit} onCancel={handleModalClose} expense={editingExpense} /></Modal>
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
                     <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-800/50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Date</th>
                            <th scope="col" className="px-6 py-3">Description</th>
                            <th scope="col" className="px-6 py-3">Fund</th>
                            <th scope="col" className="px-6 py-3">Category</th>
                            <th scope="col" className="px-6 py-3">Amount (Ksh)</th>
                            <th scope="col" className="px-6 py-3">Receipt</th>
                            <th scope="col" className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="7" className="text-center p-8">Loading expenses...</td></tr> : expenses.length === 0 ? <tr><td colSpan="7" className="text-center p-8">No expenses recorded yet.</td></tr> :
                            expenses.map(e => (
                                <tr key={e.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-4">{e.date ? e.date.toDate().toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{e.description}</td>
                                    <td className="px-6 py-4">{e.fund}</td><td className="px-6 py-4">{e.category}</td>
                                    <td className="px-6 py-4">{e.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4">{e.receiptUrl ? <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-indigo-400"><LinkIcon className="h-5 w-5" /></a> : 'None'}</td>
                                    <td className="px-6 py-4 flex space-x-2 justify-end">
                                        <button onClick={() => handleEditClick(e)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary"><Edit className="h-4 w-4" /></button>
                                        <button onClick={() => handleDeleteClick(e)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-accent-rose"><Trash2 className="h-4 w-4" /></button>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ExpenseForm({ onSubmit, onCancel, expense }) {
    const [formData, setFormData] = useState({ description: '', amount: '', fund: 'General Fund', category: 'Utilities', date: new Date().toISOString().split('T')[0] });
    const [receiptFile, setReceiptFile] = useState(null);

    useEffect(() => {
        if (expense) {
            setFormData({
                description: expense.description || '',
                amount: expense.amount || '',
                fund: expense.fund || 'General Fund',
                category: expense.category || 'Utilities',
                date: expense.date ? expense.date.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
            });
            setReceiptFile(null);
        }
    }, [expense]);

    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
    const handleFileChange = (e) => { if (e.target.files[0]) { setReceiptFile(e.target.files[0]); } };
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData, receiptFile); };

    const FormInput = ({label, ...props}) => (
        <div>
           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
           <input {...props} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-700/50 focus:ring-0 text-slate-900 dark:text-slate-100" />
       </div>
   );
   const FormSelect = ({label, children, ...props}) => (
        <div>
           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
           <select {...props} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-700/50 focus:ring-0 text-slate-900 dark:text-slate-100">
               {children}
           </select>
       </div>
   );

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput label="Description" type="text" name="description" value={formData.description} onChange={handleChange} placeholder="e.g., Electricity Bill" required />
            <FormInput label="Amount (Ksh)" type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="e.g., 12000" required />
            <FormSelect label="Fund" name="fund" value={formData.fund} onChange={handleChange}>
                <option>General Fund</option><option>Building Fund</option><option>Missions</option>
            </FormSelect>
            <FormSelect label="Category" name="category" value={formData.category} onChange={handleChange}>
                <option>Utilities</option><option>Salaries</option><option>Ministry Costs</option><option>Rent</option><option>Maintenance</option><option>Other</option>
            </FormSelect>
            <FormInput label="Date" type="date" name="date" value={formData.date} onChange={handleChange} required />
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Upload Receipt (Optional)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
                        <div className="flex text-sm text-slate-600 dark:text-slate-400">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-slate-800 rounded-md font-medium text-primary hover:text-indigo-400 p-1">
                                <span>Upload a file</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-500">{receiptFile ? receiptFile.name : 'PNG, JPG, PDF up to 10MB'}</p>
                    </div>
                </div>
            </div>
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-white bg-accent-rose hover:bg-rose-500">{expense ? 'Save Changes' : 'Add Expense'}</button>
            </div>
        </form>
    );
}

function ManageBudgets() {
    const { db, appId } = useContext(AppContext);
    const [budgets, setBudgets] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);

    useEffect(() => {
        const budgetsUnsub = onSnapshot(collection(db, `artifacts/${appId}/public/data/budgets`), (snap) => {
            setBudgets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            if (loading) setLoading(false);
        });
        const expensesUnsub = onSnapshot(collection(db, `artifacts/${appId}/public/data/expenses`), (snap) => {
            setExpenses(snap.docs.map(doc => doc.data()));
        });
        return () => { budgetsUnsub(); expensesUnsub(); };
    }, [db, appId, loading]);

    const handleModalClose = () => { setIsModalOpen(false); setEditingBudget(null); };
    const handleFormSubmit = async (budgetData) => {
        const data = { ...budgetData, allocated: parseFloat(budgetData.allocated) };
        if (editingBudget) {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/budgets`, editingBudget.id), data);
        } else {
            await addDoc(collection(db, `artifacts/${appId}/public/data/budgets`), data);
        }
        handleModalClose();
    };
    const handleDelete = async (id) => { if (window.confirm("Delete this budget?")) { await deleteDoc(doc(db, `artifacts/${appId}/public/data/budgets`, id)); } };
    const getSpentAmount = (budget) => {
        const today = new Date();
        let startDate;
        switch (budget.period) {
            case 'Monthly': startDate = new Date(today.getFullYear(), today.getMonth(), 1); break;
            case 'Quarterly': const q = Math.floor(today.getMonth() / 3); startDate = new Date(today.getFullYear(), q * 3, 1); break;
            case 'Annually': startDate = new Date(today.getFullYear(), 0, 1); break;
            default: startDate = new Date(0);
        }
        return expenses.filter(e => e.category === budget.category && e.date.toDate() >= startDate).reduce((sum, e) => sum + e.amount, 0);
    };
    
    if (loading) return <LoadingScreen message="Loading budgets..." />;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Budget vs. Actuals</h2>
                <motion.button onClick={() => setIsModalOpen(true)} whileHover={{ scale: 1.05 }} className="bg-green-600 text-white px-5 py-2.5 rounded-lg shadow-md flex items-center space-x-2">
                    <PlusCircle className="h-5 w-5" /><span>New Budget</span>
                </motion.button>
            </div>
            
            <Modal isOpen={isModalOpen} onClose={handleModalClose} title={editingBudget ? "Edit Budget" : "Create New Budget"}>
                <BudgetForm onSubmit={handleFormSubmit} onCancel={handleModalClose} budget={editingBudget} />
            </Modal>

            <div className="space-y-6">
                {budgets.map((budget, index) => {
                    const spent = getSpentAmount(budget);
                    const percentage = budget.allocated > 0 ? (spent / budget.allocated) * 100 : 0;
                    const isOverBudget = percentage > 100;
                    const barColor = isOverBudget ? 'from-accent-rose to-red-500' : percentage > 85 ? 'from-accent-amber to-yellow-500' : 'from-primary to-accent-cyan';
                    return (
                        <motion.div 
                            key={budget.id} 
                            className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-lg"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{budget.category} <span className="text-sm text-slate-500 dark:text-slate-400">({budget.fund})</span></h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-500">{budget.period}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className={`font-semibold text-sm ${isOverBudget ? 'text-accent-rose' : 'text-slate-700 dark:text-slate-300'}`}>
                                        Ksh {spent.toLocaleString()} / {budget.allocated.toLocaleString()}
                                    </span>
                                    <button onClick={() => { setEditingBudget(budget); setIsModalOpen(true); }} className="text-slate-500 dark:text-slate-400 hover:text-primary"><Edit size={16}/></button>
                                    <button onClick={() => handleDelete(budget.id)} className="text-slate-500 dark:text-slate-400 hover:text-accent-rose"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                                <motion.div 
                                    className={`h-4 rounded-full bg-gradient-to-r ${barColor}`} 
                                    initial={{ width: 0 }} 
                                    animate={{ width: `${Math.min(percentage, 100)}%` }} 
                                    transition={{ duration: 0.8, ease: "easeOut" }} 
                                />
                            </div>
                            {isOverBudget && <p className="text-accent-rose text-sm mt-2 text-right flex items-center justify-end"><AlertTriangle className="h-4 w-4 mr-1"/>Over budget by Ksh {(spent - budget.allocated).toLocaleString()}</p>}
                        </motion.div>
                    );
                })}
                 {budgets.length === 0 && <div className="text-center p-8 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg"><p>No budgets created yet. Click "New Budget" to start.</p></div>}
            </div>
        </div>
    );
}

function BudgetForm({ onSubmit, onCancel, budget }) {
    const [formData, setFormData] = useState({ fund: 'General Fund', category: '', period: 'Monthly', allocated: '' });
    
    useEffect(() => {
        if(budget) setFormData(budget);
    }, [budget]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };
    
    const FormInput = ({label, ...props}) => (
        <div>
           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
           <input {...props} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-700/50 focus:ring-0 text-slate-900 dark:text-slate-100" />
       </div>
   );
   const FormSelect = ({label, children, ...props}) => (
        <div>
           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
           <select {...props} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-700/50 focus:ring-0 text-slate-900 dark:text-slate-100">
               {children}
           </select>
       </div>
   );

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormSelect label="Fund" name="fund" value={formData.fund} onChange={handleChange}>
                <option>General Fund</option><option>Building Fund</option><option>Missions</option>
            </FormSelect>
            <FormInput label="Category" type="text" name="category" value={formData.category} onChange={handleChange} required />
            <FormSelect label="Period" name="period" value={formData.period} onChange={handleChange}>
                <option>Monthly</option><option>Quarterly</option><option>Annually</option>
            </FormSelect>
            <FormInput label="Allocated Amount (Ksh)" type="number" name="allocated" value={formData.allocated} onChange={handleChange} required />
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-500">{budget ? 'Save Changes' : 'Create Budget'}</button>
            </div>
        </form>
    );
}


function MemberManagement() {
    const { db, appId, userData, logAuditEvent } = useContext(AppContext);
    const [members, setMembers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const membersUnsub = onSnapshot(query(collection(db, "users")), (querySnapshot) => { 
            setMembers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); 
            setLoading(false); 
        });
        const groupsUnsub = onSnapshot(query(collection(db, `artifacts/${appId}/public/data/small_groups`)), (querySnapshot) => {
            setGroups(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => { membersUnsub(); groupsUnsub(); };
    }, [db, appId]);

    const handleFieldChange = async (member, field, value) => {
        if (member.id === auth.currentUser.uid && field === 'role') {
            alert("You cannot change your own role.");
            return;
        }
        const userDocRef = doc(db, "users", member.id);
        
        let updateData = { [field]: value };
        if (field === 'groupId') {
            const selectedGroup = groups.find(g => g.id === value);
            updateData.groupName = selectedGroup ? selectedGroup.name : null;
            // If changing a group, ensure any pending request is cleared.
            if (member.joinRequest) {
                updateData.joinRequest = null;
            }
        }

        await updateDoc(userDocRef, updateData);
        await logAuditEvent(userData, `Changed ${field} for ${member.email}`);
    };

    const handleDelete = async (memberId) => {
        if (memberId === auth.currentUser.uid) {
            alert("You cannot delete your own account.");
            return;
        }
        if (window.confirm("Are you sure? This will delete the user's profile. This action cannot be undone.")) {
            await deleteDoc(doc(db, "users", memberId));
            await logAuditEvent(userData, `Deleted user profile for ID ${memberId}`);
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-slate-100">Member Management</h2>
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
                    <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-800/50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Name</th>
                            <th scope="col" className="px-6 py-3">Email</th>
                            <th scope="col" className="px-6 py-3">Role</th>
                            <th scope="col" className="px-6 py-3">Small Group</th>
                            <th scope="col" className="px-6 py-3">Joined On</th>
                            <th scope="col" className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="6" className="text-center p-8">Loading members...</td></tr> : members.map(m => (
                            <tr key={m.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{m.name}</td>
                                <td className="px-6 py-4">{m.email}</td>
                                <td className="px-6 py-4">
                                    <select value={m.role} onChange={(e) => handleFieldChange(m, 'role', e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-1 focus:ring-primary focus:border-primary">
                                        <option value="member">Member</option>
                                        <option value="leader">Leader</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4">
                                    <select value={m.groupId || ''} onChange={(e) => handleFieldChange(m, 'groupId', e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-1 focus:ring-primary focus:border-primary">
                                        <option value="">None</option>
                                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </select>
                                </td>
                                <td className="px-6 py-4">{m.createdAt ? m.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => handleDelete(m.id)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-accent-rose"><Trash2 className="h-4 w-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ReportsPage() {
    const [reportType, setReportType] = useState('activities');
    const [dateRange, setDateRange] = useState('this_month');
    const [fund, setFund] = useState('all');

    const renderReport = () => {
        switch (reportType) {
            case 'activities': return <StatementOfActivities dateRange={dateRange} fund={fund} />;
            case 'position': return <StatementOfFinancialPosition dateRange={dateRange} fund={fund} />;
            case 'cashflow': return <CashFlowStatement dateRange={dateRange} fund={fund} />;
            default: return <StatementOfActivities dateRange={dateRange} fund={fund} />;
        }
    };

    const FormSelect = ({label, children, ...props}) => (
         <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
            <select {...props} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-700/50 focus:ring-0 text-slate-900 dark:text-slate-100">
                {children}
            </select>
        </div>
    );

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-slate-100">Financial Reports</h2>
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-lg mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormSelect label="Report Type" value={reportType} onChange={e => setReportType(e.target.value)}>
                        <option value="activities">Statement of Activities</option>
                        <option value="position">Statement of Financial Position</option>
                        <option value="cashflow">Cash Flow Statement</option>
                    </FormSelect>
                    <FormSelect label="Date Range" value={dateRange} onChange={e => setDateRange(e.target.value)}>
                        <option value="this_month">This Month</option>
                        <option value="last_month">Last Month</option>
                        <option value="this_quarter">This Quarter</option>
                        <option value="this_year">This Year</option>
                    </FormSelect>
                    <FormSelect label="Fund" value={fund} onChange={e => setFund(e.target.value)}>
                        <option value="all">All Funds</option>
                        <option value="General Fund">General Fund</option>
                        <option value="Building Fund">Building Fund</option>
                        <option value="Missions">Missions</option>
                    </FormSelect>
                </div>
                <div className="mt-4 text-right">
                    <button onClick={() => window.print()} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-500">Print Report</button>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-8 rounded-xl shadow-lg">
                {renderReport()}
            </div>
        </div>
    );
}

function StatementOfActivities({ dateRange, fund }) {
    const income = { tithes: 150000, buildingFund: 85000, missions: 30000, other: 10000 };
    const expenses = { salaries: 80000, utilities: 25000, ministry: 15000 };
    const totalIncome = Object.values(income).reduce((a, b) => a + b, 0);
    const totalExpenses = Object.values(expenses).reduce((a, b) => a + b, 0);
    const net = totalIncome - totalExpenses;

    return (
        <div>
            <h3 className="text-2xl font-bold text-center mb-2 text-slate-900 dark:text-slate-100">Statement of Activities</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-8">For {dateRange.replace('_', ' ')}</p>
            <div className="space-y-4 text-slate-700 dark:text-slate-300">
                <h4 className="font-bold text-lg border-b border-slate-200 dark:border-slate-700 pb-2 text-slate-900 dark:text-slate-100">Revenue</h4>
                {Object.entries(income).map(([key, val]) => <div key={key} className="flex justify-between"><span className="capitalize">{key.replace('_', ' ')}</span><span>Ksh {val.toLocaleString()}</span></div>)}
                <div className="flex justify-between font-bold pt-2 text-slate-900 dark:text-slate-100"><span>Total Revenue</span><span>Ksh {totalIncome.toLocaleString()}</span></div>

                <h4 className="font-bold text-lg border-b border-slate-200 dark:border-slate-700 pb-2 mt-6 text-slate-900 dark:text-slate-100">Expenses</h4>
                {Object.entries(expenses).map(([key, val]) => <div key={key} className="flex justify-between"><span className="capitalize">{key}</span><span>Ksh {val.toLocaleString()}</span></div>)}
                <div className="flex justify-between font-bold pt-2 text-slate-900 dark:text-slate-100"><span>Total Expenses</span><span>Ksh {totalExpenses.toLocaleString()}</span></div>

                <div className={`flex justify-between items-center py-4 mt-6 ${net >= 0 ? 'bg-green-500/10' : 'bg-rose-500/10'} px-4 rounded-lg`}>
                    <span className="font-extrabold text-xl text-slate-900 dark:text-slate-100">Net Change in Assets</span>
                    <span className={`font-extrabold text-xl ${net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-accent-rose'}`}>Ksh {net.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}

function StatementOfFinancialPosition() {
    const assets = { cash: 500000, equipment: 850000, vehicle: 2500000 };
    const liabilities = { loan: 300000 };
    const totalAssets = Object.values(assets).reduce((a, b) => a + b, 0);
    const totalLiabilities = Object.values(liabilities).reduce((a, b) => a + b, 0);
    const equity = totalAssets - totalLiabilities;

    return (
        <div>
            <h3 className="text-2xl font-bold text-center mb-2 text-slate-900 dark:text-slate-100">Statement of Financial Position</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-8">As of {new Date().toLocaleDateString()}</p>
            <div className="space-y-4 text-slate-700 dark:text-slate-300">
                <h4 className="font-bold text-lg border-b border-slate-200 dark:border-slate-700 pb-2 text-slate-900 dark:text-slate-100">Assets</h4>
                {Object.entries(assets).map(([key, val]) => <div key={key} className="flex justify-between"><span className="capitalize">{key}</span><span>Ksh {val.toLocaleString()}</span></div>)}
                <div className="flex justify-between font-bold pt-2 text-slate-900 dark:text-slate-100"><span>Total Assets</span><span>Ksh {totalAssets.toLocaleString()}</span></div>

                <h4 className="font-bold text-lg border-b border-slate-200 dark:border-slate-700 pb-2 mt-6 text-slate-900 dark:text-slate-100">Liabilities</h4>
                {Object.entries(liabilities).map(([key, val]) => <div key={key} className="flex justify-between"><span className="capitalize">{key}</span><span>Ksh {val.toLocaleString()}</span></div>)}
                <div className="flex justify-between font-bold pt-2 text-slate-900 dark:text-slate-100"><span>Total Liabilities</span><span>Ksh {totalLiabilities.toLocaleString()}</span></div>

                <div className="flex justify-between font-bold text-lg pt-4 mt-4 border-t-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"><span>Net Assets (Equity)</span><span>Ksh {equity.toLocaleString()}</span></div>
            </div>
        </div>
    );
}

function CashFlowStatement() {
    const operating = { inflows: 275000, outflows: -120000 };
    const investing = { outflows: -50000 };
    const financing = { inflows: 100000 };
    const netCashFlow = operating.inflows + operating.outflows + investing.outflows + financing.inflows;

    return (
        <div>
            <h3 className="text-2xl font-bold text-center mb-2 text-slate-900 dark:text-slate-100">Cash Flow Statement</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-8">For This Month</p>
            <div className="space-y-2 text-slate-700 dark:text-slate-300">
                <div className="flex justify-between font-bold text-lg border-b border-slate-200 dark:border-slate-700 pb-2 text-slate-900 dark:text-slate-100"><span>Cash Flow from Operating Activities</span><span>Ksh {(operating.inflows + operating.outflows).toLocaleString()}</span></div>
                <div className="flex justify-between pl-4"><span>Cash Inflows</span><span>Ksh {operating.inflows.toLocaleString()}</span></div>
                <div className="flex justify-between pl-4"><span>Cash Outflows</span><span>(Ksh {(-operating.outflows).toLocaleString()})</span></div>

                <div className="flex justify-between font-bold text-lg border-b border-slate-200 dark:border-slate-700 pb-2 pt-4 text-slate-900 dark:text-slate-100"><span>Cash Flow from Investing Activities</span><span>(Ksh {(-investing.outflows).toLocaleString()})</span></div>
                <div className="flex justify-between pl-4"><span>Purchase of Assets</span><span>(Ksh {(-investing.outflows).toLocaleString()})</span></div>
                
                <div className="flex justify-between font-bold text-lg border-b border-slate-200 dark:border-slate-700 pb-2 pt-4 text-slate-900 dark:text-slate-100"><span>Cash Flow from Financing Activities</span><span>Ksh {financing.inflows.toLocaleString()}</span></div>
                <div className="flex justify-between pl-4"><span>Loan Proceeds</span><span>Ksh {financing.inflows.toLocaleString()}</span></div>
                
                <div className="flex justify-between font-extrabold text-xl pt-4 mt-4 border-t-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"><span>Net Increase in Cash</span><span>Ksh {netCashFlow.toLocaleString()}</span></div>
            </div>
        </div>
    );
}

function BankReconciliation() {
    const [statement, setStatement] = useState(null);
    const [matches, setMatches] = useState([]);
    const bookTransactions = [{ id: 1, date: '2025-08-15', desc: 'Tithe - J. Doe', amount: 5000 }, { id: 2, date: '2025-08-16', desc: 'Electricity Bill', amount: -12000 }];
    const bankTransactions = [{ id: 'A', date: '2025-08-15', desc: 'MOBILE TRANSFER', amount: 5000 }, { id: 'B', date: '2025-08-17', desc: 'UTILITY PAYMENT', amount: -12000 }];

    const handleFileUpload = (e) => {
        if (e.target.files[0]) {
            setStatement(e.target.files[0]);
            setMatches([
                { book: bookTransactions[0], bank: bankTransactions[0], status: 'Matched' },
                { book: bookTransactions[1], bank: bankTransactions[1], status: 'Matched' },
            ]);
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-slate-100">Bank Reconciliation</h2>
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-lg">
                <div className="mb-6">
                    <label htmlFor="bank-statement-upload" className="w-full flex flex-col items-center justify-center p-6 border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50">
                        <Upload className="h-10 w-10 text-slate-400 dark:text-slate-400 mb-2" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{statement ? statement.name : 'Upload Bank Statement'}</span>
                        <span className="text-sm text-slate-500 dark:text-slate-500">CSV or OFX file</span>
                        <input id="bank-statement-upload" type="file" className="hidden" onChange={handleFileUpload} accept=".csv,.ofx" />
                    </label>
                </div>
                {matches.length > 0 && (
                    <div>
                        <h3 className="font-bold text-xl mb-4 text-slate-900 dark:text-slate-100">Reconciliation Summary</h3>
                        <table className="w-full">
                            <thead className="text-left bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300"><tr><th className="p-2">Book Transaction</th><th className="p-2">Bank Transaction</th><th className="p-2">Status</th></tr></thead>
                            <tbody>
                                {matches.map((m, i) => (
                                    <tr key={i} className="border-b border-slate-200 dark:border-slate-800">
                                        <td className="p-2">{m.book.desc} (Ksh {m.book.amount})</td>
                                        <td className="p-2">{m.bank.desc} (Ksh {m.bank.amount})</td>
                                        <td className="p-2"><span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">Matched</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function LeadershipDashboard() {
    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-slate-100">Leadership Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-lg"><h3 className="font-bold text-xl mb-4 text-slate-900 dark:text-slate-100">Key Financials</h3></div>
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-lg"><h3 className="font-bold text-xl mb-4 text-slate-900 dark:text-slate-100">Campaign Progress</h3></div>
            </div>
            <div className="mt-8"><ReportsPage readOnly={true} /></div>
        </div>
    );
}

// --- Member Components ---
function MemberDashboard() {
    const { db, user, userData, appId, setCurrentPage } = useContext(AppContext);
    const [stats, setStats] = useState({ totalGiving: 0, lastDonation: 0 });
    const [recentActivity, setRecentActivity] = useState([]);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);
            
            // --- Fetch Giving Stats & Recent Activity ---
            const today = new Date();
            const startOfYear = new Date(today.getFullYear(), 0, 1);

            const donationsQuery = query(
                collection(db, `artifacts/${appId}/public/data/donations`),
                where("userId", "==", user.uid),
                orderBy("date", "desc")
            );
            
            const querySnapshot = await getDocs(donationsQuery);
            let totalGiving = 0;
            const activities = [];
            
            querySnapshot.forEach(doc => {
                const data = doc.data();
                if (data.date.toDate() >= startOfYear) {
                    totalGiving += data.amount;
                }
                if (activities.length < 5) {
                    activities.push({
                        id: doc.id,
                        type: 'Donation',
                        description: `Gave to ${data.fund}`,
                        amount: data.amount,
                        date: data.date.toDate()
                    });
                }
            });

            setStats({ totalGiving, lastDonation: activities.length > 0 ? activities[0].amount : 0 });
            setRecentActivity(activities);

            // --- Fetch Upcoming Events ---
            const eventsQuery = query(
                collection(db, `artifacts/${appId}/public/data/events`),
                where("date", ">=", Timestamp.now()),
                orderBy("date", "asc"),
                limit(2)
            );
            const eventsSnapshot = await getDocs(eventsQuery);
            setUpcomingEvents(eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            
            setLoading(false);
        };
        fetchData();
    }, [db, user, appId]);

    if (loading) return <LoadingScreen message="Loading your dashboard..." />;

    const summaryData = [
        { name: 'Total Giving This Year', value: `Ksh ${stats.totalGiving.toLocaleString()}`, icon: DollarSign, color: 'text-green-600 dark:text-green-400' },
        { name: 'Last Donation', value: `Ksh ${stats.lastDonation.toLocaleString()}`, icon: HandHeart, color: 'text-primary' }
    ];

    const shortcuts = [
        { name: 'Give Now', icon: HandHeart, page: 'give', color: 'bg-primary hover:bg-indigo-500' },
        { name: 'Giving History', icon: FileText, page: 'history', color: 'bg-green-600 hover:bg-green-500' },
        { name: 'My Pledges', icon: Repeat, page: 'pledges', color: 'bg-secondary hover:bg-purple-500' },
        { name: 'Upcoming Events', icon: Calendar, page: 'events', color: 'bg-accent-cyan hover:bg-cyan-500' },
    ];

    return (
        <div>
            <h2 className="text-3xl font-bold mb-2 text-slate-900 dark:text-slate-100">Welcome, {userData.name}!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Here's a summary of your giving journey and church activities.</p>
            
            {/* --- Quick Actions --- */}
            <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {shortcuts.map(item => (
                        <motion.button 
                            key={item.name} 
                            onClick={() => setCurrentPage(item.page)}
                            whileHover={{ y: -5, scale: 1.05 }}
                            className={`p-4 rounded-xl shadow-lg text-white font-bold flex flex-col items-center justify-center text-center ${item.color} transition-transform`}
                        >
                            <item.icon className="h-8 w-8 mb-2" />
                            <span>{item.name}</span>
                        </motion.button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- Recent Activity --- */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Recent Activity</h3>
                    <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                        {recentActivity.length > 0 ? recentActivity.map(activity => (
                             <li key={activity.id} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{activity.type}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{activity.description}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg text-green-600 dark:text-green-400">Ksh {activity.amount.toLocaleString()}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-500">{activity.date.toLocaleDateString()}</p>
                                </div>
                            </li>
                        )) : <p className="text-slate-500 dark:text-slate-400 text-center py-4">No recent transactions found.</p>}
                    </ul>
                </div>

                {/* --- Upcoming Events --- */}
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-lg">
                     <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Upcoming Events</h3>
                     <div className="space-y-4">
                        {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
                            <div key={event.id} className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                                <p className="font-bold text-slate-900 dark:text-slate-100">{event.name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{event.date.toDate().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                        )) : <p className="text-slate-500 dark:text-slate-400 text-center py-4">No upcoming events scheduled.</p>}
                     </div>
                </div>
            </div>
        </div>
    );
}

function GiveNowPage({ setCurrentPage }) {
    const [step, setStep] = useState(1);
    const [donationDetails, setDonationDetails] = useState(null);

    const handleFormSubmit = (details) => {
        setDonationDetails(details);
        setStep(2);
    };

    const handlePaymentSuccess = async () => {
        setStep(3);
        setTimeout(() => {
            setCurrentPage('history');
        }, 3000);
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-slate-100">Make a Donation</h2>
            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
                        <GiveForm onSubmit={handleFormSubmit} />
                    </motion.div>
                )}
                {step === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
                        <PaymentGateway details={donationDetails} onSuccess={handlePaymentSuccess} />
                    </motion.div>
                )}
                {step === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                        <PaymentSuccess />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function GiveForm({ onSubmit }) {
    const { db, user, appId } = useContext(AppContext);
    const [pledges, setPledges] = useState([]);
    const [selectedPledgeId, setSelectedPledgeId] = useState('');
    const [amount, setAmount] = useState('');
    const [fund, setFund] = useState('Tithes & Offering');
    const [paymentMethod, setPaymentMethod] = useState('M-Pesa');
    const [givingType, setGivingType] = useState('one-time');

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, `artifacts/${appId}/public/data/pledges`), where("userId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userPledges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(p => p.totalGiven < p.totalPledged);
            setPledges(userPledges);
        });
        return () => unsubscribe();
    }, [db, user, appId]);

    const handlePledgeChange = (e) => {
        const pledgeId = e.target.value;
        setSelectedPledgeId(pledgeId);
        if (pledgeId) {
            const selected = pledges.find(p => p.id === pledgeId);
            if (selected) {
                setFund(selected.fund);
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ amount, fund, paymentMethod, givingType, selectedPledgeId });
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-8 rounded-xl shadow-lg">
            <div className="flex justify-center mb-6 border border-slate-300 dark:border-slate-700 rounded-lg p-1">
                <button onClick={() => setGivingType('one-time')} className={`w-1/2 py-2 rounded-md transition-colors ${givingType === 'one-time' ? 'bg-primary text-white' : 'text-slate-500 dark:text-slate-400'}`}>One-Time</button>
                <button onClick={() => setGivingType('recurring')} className={`w-1/2 py-2 rounded-md transition-colors ${givingType === 'recurring' ? 'bg-primary text-white' : 'text-slate-500 dark:text-slate-400'}`}>Recurring</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
                 {pledges.length > 0 && (
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Contribute to a Pledge (Optional)</label>
                        <select value={selectedPledgeId} onChange={handlePledgeChange} className="w-full px-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary focus:ring-0">
                            <option value="">Make a general donation</option>
                            {pledges.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.fund} (Given Ksh {p.totalGiven.toLocaleString()} of {p.totalPledged.toLocaleString()})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Amount (Ksh)</label>
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" required className="w-full px-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-lg focus:border-primary focus:ring-0" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Designate to Fund</label>
                    <select value={fund} onChange={(e) => setFund(e.target.value)} disabled={!!selectedPledgeId} className="w-full px-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary focus:ring-0 disabled:bg-slate-200 dark:disabled:bg-slate-800/50">
                        <option>Tithes & Offering</option><option>Building Fund</option><option>Missions</option><option>Welfare</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Payment Method</label>
                    <div className="flex space-x-4">
                        <button type="button" onClick={() => setPaymentMethod('M-Pesa')} className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${paymentMethod === 'M-Pesa' ? 'bg-green-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}><Smartphone size={20}/> M-Pesa</button>
                        <button type="button" onClick={() => setPaymentMethod('Card')} className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${paymentMethod === 'Card' ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}><CreditCard size={20}/> Card</button>
                    </div>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="w-full flex justify-center py-4 px-4 rounded-lg shadow-md text-lg font-bold text-white bg-primary hover:bg-indigo-500">Proceed to Payment</motion.button>
            </form>
        </motion.div>
    );
}

function PaymentGateway({ details, onSuccess }) {
    const { db, user, userData, appId, logAuditEvent, createLedgerEntries } = useContext(AppContext);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleFinalizePayment = async () => {
        setIsSubmitting(true);
        setError('');
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const amount = parseFloat(details.amount);
            const batch = writeBatch(db);

            const donationRef = doc(collection(db, `artifacts/${appId}/public/data/donations`));
            const donationData = { 
                userId: user.uid, 
                memberName: userData.name, 
                amount: amount, 
                fund: details.fund, 
                paymentMethod: details.paymentMethod, 
                type: 'Online', 
                date: Timestamp.now(), 
                status: 'completed',
                groupId: userData.groupId || null,
                groupName: userData.groupName || null,
                pledgeId: details.selectedPledgeId || null, 
            };
            batch.set(donationRef, donationData);

            if (details.selectedPledgeId) {
                const pledgeRef = doc(db, `artifacts/${appId}/public/data/pledges`, details.selectedPledgeId);
                const pledgeDoc = await getDoc(pledgeRef);
                if (pledgeDoc.exists()) {
                    const currentGiven = pledgeDoc.data().totalGiven || 0;
                    batch.update(pledgeRef, { totalGiven: currentGiven + amount });
                }
            }

            await batch.commit();
            
            await logAuditEvent(userData, `Made online donation of Ksh ${amount}`);
            await createLedgerEntries([
                { account: 'Cash', description: `Online donation from ${userData.name}`, type: 'debit', amount: amount, referenceId: donationRef.id },
                { account: `${details.fund} Income`, description: `Online donation from ${userData.name}`, type: 'credit', amount: amount, referenceId: donationRef.id }
            ]);

            onSuccess();
        } catch (err) { 
            console.error("Error processing donation: ", err); 
            setError("Payment failed. Please try again.");
        } finally { 
            setIsSubmitting(false); 
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-8 rounded-xl shadow-lg text-center">
            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">Confirm Your Donation</h3>
            <p className="text-2xl font-bold text-primary mb-2">Ksh {parseFloat(details.amount).toLocaleString()}</p>
            <p className="text-slate-500 dark:text-slate-400 mb-6">To: {details.fund}</p>

            {details.paymentMethod === 'M-Pesa' && (
                <div className="text-left bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg">
                    <p className="font-semibold mb-2 text-slate-800 dark:text-slate-200">M-Pesa Payment</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">A payment request of Ksh {parseFloat(details.amount).toLocaleString()} will be sent to your registered M-Pesa number.</p>
                    <p className="text-sm mt-2 text-slate-600 dark:text-slate-400">Please enter your PIN on your phone to complete the transaction.</p>
                </div>
            )}

            {details.paymentMethod === 'Card' && (
                <div className="text-left bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg">
                    <p className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Secure Card Payment</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">You will be redirected to our secure payment partner's page to complete your transaction.</p>
                    <p className="text-sm mt-2 text-slate-600 dark:text-slate-400">Your card details are never stored on our servers.</p>
                </div>
            )}
            
            {error && <p className="text-accent-rose text-sm mt-4">{error}</p>}

            <motion.button 
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }} 
                onClick={handleFinalizePayment}
                disabled={isSubmitting} 
                className="w-full mt-6 flex justify-center py-3 px-4 rounded-lg shadow-md text-lg font-bold text-white bg-green-600 hover:bg-green-500 disabled:bg-green-400"
            >
                {isSubmitting ? 'Processing...' : 
                 details.paymentMethod === 'Card' ? (
                    <>
                        Proceed to Secure Page <ExternalLink className="ml-2 h-5 w-5" />
                    </>
                 ) : `Confirm & Pay Ksh ${parseFloat(details.amount).toLocaleString()}`
                }
            </motion.button>
        </div>
    );
}

function PaymentSuccess() {
    return (
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-8 rounded-xl shadow-lg text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }}>
                <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
            </motion.div>
            <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-100">Thank You!</h3>
            <p className="text-slate-600 dark:text-slate-400">Your generous donation has been received.</p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-4">You will be redirected shortly...</p>
        </div>
    );
}

function GivingHistoryPage() {
    const { db, user, appId } = useContext(AppContext);
    const [donations, setDonations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        
        const q = query(
            collection(db, `artifacts/${appId}/public/data/donations`), 
            where("userId", "==", user.uid),
            orderBy("date", "desc")
        );
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const userDonations = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDonations(userDonations);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, user, appId]);

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-slate-100">Your Giving History</h2>
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg">
                <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                    {loading ? <li className="p-4 text-center">Loading your history...</li> : donations.length === 0 ? <li className="p-4 text-center">You haven't made any donations yet.</li> :
                        donations.map(d => (
                            <li key={d.id} className="p-4 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-lg text-slate-900 dark:text-slate-100">Ksh {d.amount.toLocaleString()}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{d.fund}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-slate-700 dark:text-slate-300">{d.date ? d.date.toDate().toLocaleDateString() : 'N/A'}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-500">{d.paymentMethod}</p>
                                </div>
                            </li>
                        ))}
                </ul>
            </div>
        </div>
    );
}

function SettingsPage() {
    const { user, userData, db } = useContext(AppContext);
    const [name, setName] = useState(userData.name);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const userDocRef = doc(db, "users", user.uid);
        try {
            await updateDoc(userDocRef, { name });
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (error) { console.error("Error updating profile: ", error); } finally { setIsSaving(false); }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-slate-100">Your Profile Settings</h2>
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-8 rounded-xl shadow-lg">
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                        <input type="email" value={userData.email} disabled className="w-full px-4 py-3 rounded-lg bg-slate-200/50 dark:bg-slate-800/50 border-2 border-slate-300 dark:border-slate-700 cursor-not-allowed" />
                    </div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isSaving || showSuccess} className="w-full flex justify-center py-3 px-4 rounded-lg shadow-md font-bold text-white bg-primary hover:bg-indigo-500 disabled:bg-indigo-400">{isSaving ? 'Saving...' : showSuccess ? 'Saved!' : 'Save Changes'}</motion.button>
                </form>
            </div>
        </div>
    );
}

function BulkMessagingPage() {
    const { db, appId } = useContext(AppContext);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [recipientGroup, setRecipientGroup] = useState('all_members');
    const [isSending, setIsSending] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSend = async (e) => {
        e.preventDefault();
        setError(''); setShowSuccess(false); setIsSending(true);
        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/messages`), { subject, body, recipientGroup, status: 'pending', sentAt: Timestamp.now() });
            setShowSuccess(true); setSubject(''); setBody('');
            setTimeout(() => setShowSuccess(false), 4000);
        } catch (err) { console.error("Error sending message:", err); setError('Failed to send message.'); } finally { setIsSending(false); }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-slate-100">Bulk Messaging</h2>
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-8 rounded-xl shadow-lg">
                <div className="mb-6 p-4 bg-primary/10 border-l-4 border-primary rounded-r-lg">
                    <h4 className="font-bold text-primary">How this works:</h4>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">This form sends a message request to the server. A backend process will then deliver the message as an email to the selected group.</p>
                </div>
                <form onSubmit={handleSend} className="space-y-6">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Recipients</label>
                        <select value={recipientGroup} onChange={(e) => setRecipientGroup(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary">
                            <option value="all_members">All Members</option>
                            <option value="leaders">Leaders Only</option>
                            <option value="admins">Administrators Only</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Subject</label>
                        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter message subject" required className="w-full px-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Message Body</label>
                        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your message here..." required rows="8" className="w-full px-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary" />
                    </div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isSending || showSuccess} className="w-full flex justify-center py-3 px-4 rounded-lg shadow-md font-bold text-white bg-primary hover:bg-indigo-500 disabled:bg-indigo-400">{isSending ? 'Sending...' : showSuccess ? 'Message Sent!' : 'Send Message'}</motion.button>
                    <AnimatePresence>
                        {showSuccess && <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="text-center text-green-500 dark:text-green-400 flex items-center justify-center"><CheckCircle className="h-5 w-5 mr-2" /><span>Your message has been queued for delivery.</span></motion.div>}
                        {error && <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="text-center text-accent-rose flex items-center justify-center"><AlertTriangle className="h-5 w-5 mr-2" /><span>{error}</span></motion.div>}
                    </AnimatePresence>
                </form>
            </div>
        </div>
    );
}

function ManagePledges() {
    const { db, appId } = useContext(AppContext);
    const [pledges, setPledges] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, `artifacts/${appId}/public/data/pledges`));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const pledgesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPledges(pledgesData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db, appId]);

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-slate-100">Manage Pledges</h2>
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg">
                {loading ? <p>Loading pledges...</p> : pledges.length === 0 ? <p className="p-4">No pledges have been made yet.</p> :
                    pledges.map(p => {
                        const percentage = (p.totalGiven / p.totalPledged) * 100;
                        return (
                            <div key={p.id} className="p-4 border-b border-slate-200 dark:border-slate-800 last:border-b-0">
                                <div className="flex justify-between items-center mb-2">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-slate-100">{p.memberName}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{p.fund}</p>
                                    </div>
                                    <span className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-300">{p.frequency}</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                                    <motion.div className="h-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-400" initial={{ width: 0 }} animate={{ width: `${percentage}%` }} />
                                </div>
                                <div className="flex justify-between text-sm mt-1 text-slate-500 dark:text-slate-400">
                                    <span>Ksh {p.totalGiven.toLocaleString()}</span>
                                    <span>of Ksh {p.totalPledged.toLocaleString()}</span>
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}

function ManageEvents() {
    const { db, appId } = useContext(AppContext);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, `artifacts/${appId}/public/data/events`), (snap) => {
            setEvents(snap.docs.map(doc => ({id: doc.id, ...doc.data()})));
            setLoading(false);
        });
        return () => unsub();
    }, [db, appId]);

    const handleModalClose = () => { setIsModalOpen(false); setEditingEvent(null); };
    const handleFormSubmit = async (data) => {
        const eventData = { ...data, date: Timestamp.fromDate(new Date(data.date)), capacity: parseInt(data.capacity, 10), registered: editingEvent ? editingEvent.registered : 0 };
        if (editingEvent) {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/events`, editingEvent.id), eventData);
        } else {
            await addDoc(collection(db, `artifacts/${appId}/public/data/events`), eventData);
        }
        handleModalClose();
    };
    const handleDelete = async (id) => { if (window.confirm("Delete this event?")) { await deleteDoc(doc(db, `artifacts/${appId}/public/data/events`, id)); } };

    if (loading) return <LoadingScreen message="Loading events..." />;

    return (
        <div>
            <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Manage Events</h2><motion.button onClick={() => setIsModalOpen(true)} whileHover={{ scale: 1.05 }} className="bg-primary text-white px-5 py-2.5 rounded-lg shadow-md flex items-center space-x-2"><PlusCircle className="h-5 w-5" /><span>Create Event</span></motion.button></div>
            <Modal isOpen={isModalOpen} onClose={handleModalClose} title={editingEvent ? "Edit Event" : "Create New Event"}>
                <EventForm onSubmit={handleFormSubmit} onCancel={handleModalClose} event={editingEvent} />
            </Modal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {events.map(e => (
                    <div key={e.id} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-lg">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">{e.name}</h3>
                                <p className="text-slate-500 dark:text-slate-400">{e.date.toDate().toLocaleDateString()}</p>
                            </div>
                            <div className="flex space-x-2">
                                <button onClick={() => { setEditingEvent(e); setIsModalOpen(true); }} className="text-slate-500 dark:text-slate-400 hover:text-primary"><Edit size={18}/></button>
                                <button onClick={() => handleDelete(e.id)} className="text-slate-500 dark:text-slate-400 hover:text-accent-rose"><Trash2 size={18}/></button>
                            </div>
                        </div>
                        <p className="mt-4 font-semibold text-slate-800 dark:text-slate-200">{e.registered || 0} / {e.capacity} Registered</p>
                    </div>
                ))}
                {events.length === 0 && <p className="text-center p-8 col-span-full">No events found.</p>}
            </div>
        </div>
    );
}

function EventForm({ onSubmit, onCancel, event }) {
    const [formData, setFormData] = useState({ name: '', date: '', capacity: '' });
    useEffect(() => {
        if (event) {
            setFormData({ name: event.name, date: event.date.toDate().toISOString().split('T')[0], capacity: event.capacity });
        }
    }, [event]);

    const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };
    
    const FormInput = ({label, ...props}) => (
         <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
            <input {...props} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-700/50 focus:ring-0 text-slate-900 dark:text-slate-100" />
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput label="Event Name" type="text" name="name" value={formData.name} onChange={handleChange} required />
            <FormInput label="Date" type="date" name="date" value={formData.date} onChange={handleChange} required />
            <FormInput label="Capacity" type="number" name="capacity" value={formData.capacity} onChange={handleChange} required />
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-white bg-primary">{event ? 'Save Changes' : 'Create Event'}</button>
            </div>
        </form>
    );
}

function ManageAssets() {
    const { db, appId } = useContext(AppContext);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, `artifacts/${appId}/public/data/assets`), (snap) => {
            setAssets(snap.docs.map(doc => ({id: doc.id, ...doc.data()})));
            setLoading(false);
        });
        return () => unsub();
    }, [db, appId]);

    const handleModalClose = () => { setIsModalOpen(false); setEditingAsset(null); };
    const handleFormSubmit = async (data) => {
        const assetData = { ...data, purchaseDate: Timestamp.fromDate(new Date(data.purchaseDate)), value: parseFloat(data.value) };
        if (editingAsset) {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/assets`, editingAsset.id), assetData);
        } else {
            await addDoc(collection(db, `artifacts/${appId}/public/data/assets`), assetData);
        }
        handleModalClose();
    };
    const handleDelete = async (id) => { if (window.confirm("Delete this asset record?")) { await deleteDoc(doc(db, `artifacts/${appId}/public/data/assets`, id)); } };

    if (loading) return <LoadingScreen message="Loading assets..." />;

    return (
        <div>
            <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Asset Inventory</h2><motion.button onClick={() => setIsModalOpen(true)} whileHover={{ scale: 1.05 }} className="bg-primary text-white px-5 py-2.5 rounded-lg shadow-md flex items-center space-x-2"><PlusCircle className="h-5 w-5" /><span>Add Asset</span></motion.button></div>
            <Modal isOpen={isModalOpen} onClose={handleModalClose} title={editingAsset ? "Edit Asset" : "Add New Asset"}>
                <AssetForm onSubmit={handleFormSubmit} onCancel={handleModalClose} asset={editingAsset} />
            </Modal>
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
                    <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-800/50">
                        <tr>
                            <th className="px-6 py-3">Asset Name</th><th className="px-6 py-3">Category</th><th className="px-6 py-3">Value (Ksh)</th><th className="px-6 py-3">Purchase Date</th><th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map(a => (
                            <tr key={a.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{a.name}</td>
                                <td className="px-6 py-4">{a.category}</td>
                                <td className="px-6 py-4">{a.value.toLocaleString()}</td>
                                <td className="px-6 py-4">{a.purchaseDate.toDate().toLocaleDateString()}</td>
                                <td className="px-6 py-4 flex space-x-2 justify-end">
                                    <button onClick={() => { setEditingAsset(a); setIsModalOpen(true); }} className="text-slate-500 dark:text-slate-400 hover:text-primary"><Edit size={16}/></button>
                                    <button onClick={() => handleDelete(a.id)} className="text-slate-500 dark:text-slate-400 hover:text-accent-rose"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                         {assets.length === 0 && <tr><td colSpan="5" className="text-center p-8">No assets recorded.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function AssetForm({ onSubmit, onCancel, asset }) {
    const [formData, setFormData] = useState({ name: '', category: 'Sound Equipment', value: '', purchaseDate: '' });
    useEffect(() => {
        if (asset) {
            setFormData({ name: asset.name, category: asset.category, value: asset.value, purchaseDate: asset.purchaseDate.toDate().toISOString().split('T')[0] });
        }
    }, [asset]);

    const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };
    
    const FormInput = ({label, ...props}) => (
         <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
            <input {...props} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-700/50 focus:ring-0 text-slate-900 dark:text-slate-100" />
        </div>
    );
    const FormSelect = ({label, children, ...props}) => (
         <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
            <select {...props} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-700/50 focus:ring-0 text-slate-900 dark:text-slate-100">
                {children}
            </select>
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput label="Asset Name" type="text" name="name" value={formData.name} onChange={handleChange} required />
            <FormSelect label="Category" name="category" value={formData.category} onChange={handleChange}>
                <option>Sound Equipment</option><option>Vehicle</option><option>Building</option><option>Furniture</option><option>Other</option>
            </FormSelect>
            <FormInput label="Value (Ksh)" type="number" name="value" value={formData.value} onChange={handleChange} required />
            <FormInput label="Purchase Date" type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} required />
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-white bg-primary">{asset ? 'Save Changes' : 'Add Asset'}</button>
            </div>
        </form>
    );
}


function MemberPledgesPage() {
    const { db, user, appId, userData } = useContext(AppContext);
    const [pledges, setPledges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, `artifacts/${appId}/public/data/pledges`), where("userId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const userPledges = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPledges(userPledges);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db, user, appId]);

    const handleAddPledge = async (pledgeData) => {
        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/pledges`), {
                ...pledgeData,
                userId: user.uid,
                memberName: userData.name,
                totalPledged: parseFloat(pledgeData.totalPledged),
                totalGiven: 0,
                startDate: Timestamp.fromDate(new Date(pledgeData.startDate)),
                createdAt: Timestamp.now(),
            });
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error adding pledge:", error);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">My Pledges</h2>
                <motion.button onClick={() => setIsModalOpen(true)} whileHover={{ scale: 1.05 }} className="bg-green-600 text-white px-5 py-2.5 rounded-lg shadow-md flex items-center space-x-2">
                    <PlusCircle className="h-5 w-5" />
                    <span>Make a New Pledge</span>
                </motion.button>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Make a New Pledge">
                <PledgeForm onSubmit={handleAddPledge} onCancel={() => setIsModalOpen(false)} />
            </Modal>

            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg">
                {loading ? <p>Loading pledges...</p> : pledges.length === 0 ? <p className="p-4 text-center">You have not made any pledges yet.</p> :
                    pledges.map(p => {
                        const percentage = p.totalPledged > 0 ? (p.totalGiven / p.totalPledged) * 100 : 0;
                        return (
                            <div key={p.id} className="p-4 border-b border-slate-200 dark:border-slate-800 last:border-b-0">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-slate-900 dark:text-slate-100">{p.fund}</h3>
                                    <span className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-300">{p.frequency}</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                                    <motion.div className="h-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-400" initial={{ width: 0 }} animate={{ width: `${percentage}%` }} />
                                </div>
                                <div className="flex justify-between text-sm mt-1 text-slate-500 dark:text-slate-400">
                                    <span>Ksh {p.totalGiven.toLocaleString()} Given</span>
                                    <span>of Ksh {p.totalPledged.toLocaleString()}</span>
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}

function PledgeForm({ onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        fund: 'Building Fund',
        totalPledged: '',
        frequency: 'Monthly',
        startDate: new Date().toISOString().split('T')[0],
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const FormInput = ({label, ...props}) => (
         <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
            <input {...props} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-700/50 focus:ring-0 text-slate-900 dark:text-slate-100" />
        </div>
    );
    const FormSelect = ({label, children, ...props}) => (
         <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
            <select {...props} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-700/50 focus:ring-0 text-slate-900 dark:text-slate-100">
                {children}
            </select>
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormSelect label="Pledge towards" name="fund" value={formData.fund} onChange={handleChange}>
                <option>Building Fund</option><option>Missions</option><option>Welfare</option><option>Tithes & Offering</option>
            </FormSelect>
            <FormInput label="Total Amount (Ksh)" type="number" name="totalPledged" value={formData.totalPledged} onChange={handleChange} placeholder="e.g., 120000" required />
            <FormSelect label="Frequency" name="frequency" value={formData.frequency} onChange={handleChange}>
                <option>One-Time</option><option>Weekly</option><option>Monthly</option><option>Annually</option>
            </FormSelect>
            <FormInput label="Start Date" type="date" name="startDate" value={formData.startDate} onChange={handleChange} required />
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-500">Submit Pledge</button>
            </div>
        </form>
    );
}

function EventsPage() {
    const { db, appId } = useContext(AppContext);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, `artifacts/${appId}/public/data/events`), (snap) => {
            setEvents(snap.docs.map(doc => ({id: doc.id, ...doc.data()})));
            setLoading(false);
        });
        return () => unsub();
    }, [db, appId]);

    if (loading) return <LoadingScreen message="Loading events..." />;

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-slate-100">Upcoming Events</h2>
            <div className="space-y-6">
                {events.map(e => (
                    <div key={e.id} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-lg flex justify-between items-center">
                        <div className="flex-grow">
                            <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">{e.name}</h3>
                            <p className="text-slate-500 dark:text-slate-400">{e.date.toDate().toLocaleDateString()}</p>
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{e.description || 'No description provided.'}</p>
                        </div>
                        <button className="ml-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500">Register</button>
                    </div>
                ))}
                {events.length === 0 && <div className="text-center p-8 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg"><p>No upcoming events.</p></div>}
            </div>
        </div>
    );
}

function SmallGroupsPage() {
    const { db, appId, userData } = useContext(AppContext);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [myGroup, setMyGroup] = useState(null);
    const [myGroupMembers, setMyGroupMembers] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [groupContributions, setGroupContributions] = useState(0);

    useEffect(() => {
        const fetchGroups = async () => {
            setLoading(true);
            const groupsQuery = query(collection(db, `artifacts/${appId}/public/data/small_groups`), orderBy("name"));
            const groupsSnapshot = await getDocs(groupsQuery);
            setGroups(groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            
            if (userData.groupId) {
                const groupDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/small_groups`, userData.groupId));
                if (groupDoc.exists()) {
                    setMyGroup({ id: groupDoc.id, ...groupDoc.data() });
                    const membersQuery = query(collection(db, "users"), where("groupId", "==", userData.groupId));
                    const membersSnapshot = await getDocs(membersQuery);
                    setMyGroupMembers(membersSnapshot.docs.map(d => d.data()));

                    const donationsQuery = query(collection(db, `artifacts/${appId}/public/data/donations`), where("groupId", "==", userData.groupId));
                    const donationsSnapshot = await getDocs(donationsQuery);
                    const total = donationsSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
                    setGroupContributions(total);
                }
            }
            setLoading(false);
        };
        fetchGroups();
    }, [db, appId, userData.groupId]);

    const handleJoinGroup = async (group) => {
        setIsSubmitting(true);
        const userDocRef = doc(db, "users", userData.uid);
        try {
            await updateDoc(userDocRef, {
                groupId: group.id,
                groupName: group.name,
                joinRequest: null // Clear any old requests
            });
        } catch (error) {
            console.error("Failed to join group:", error);
            alert("Error: Could not join the group. Please check your internet connection or contact an administrator.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <LoadingScreen message="Loading Small Groups..." />;

    if (userData.groupId && myGroup) {
        const hasGoal = myGroup.goalAmount > 0;
        const goalPercentage = hasGoal ? (groupContributions / myGroup.goalAmount) * 100 : 0;
        return (
            <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Your Small Group</h2>
                <div className="mt-6 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-8 rounded-xl shadow-lg">
                    <h3 className="text-2xl font-bold text-primary">{myGroup.name}</h3>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">Leader: {myGroup.leaderName || 'N/A'}</p>
                    <p className="mt-4 text-slate-700 dark:text-slate-300">{myGroup.description || 'No description provided.'}</p>
                    
                    {hasGoal && (
                        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                            <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100">{myGroup.goalTitle}</h4>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mt-2">
                                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${Math.min(goalPercentage, 100)}%` }}></div>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                                <span className="font-bold text-primary">Ksh {groupContributions.toLocaleString()} raised</span>
                                <span className="text-slate-500 dark:text-slate-400">Goal: {myGroup.goalAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    )}

                    <div className="mt-8">
                        <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100">Members ({myGroupMembers.length})</h4>
                        <ul className="divide-y divide-slate-200 dark:divide-slate-800 mt-2">
                            {myGroupMembers.map(member => (
                                <li key={member.uid} className="py-2 text-slate-600 dark:text-slate-400">{member.name}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-slate-100">Find a Small Group</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groups.map(g => 
                    <div key={g.id} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-lg flex flex-col justify-between">
                        <div>
                            <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">{g.name}</h3>
                            <p className="text-slate-700 dark:text-slate-300">Leader: {g.leaderName || 'N/A'}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{g.description || 'No description provided.'}</p>
                        </div>
                        <button 
                            onClick={() => handleJoinGroup(g)}
                            disabled={isSubmitting}
                            className="mt-4 w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-500 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                           <Users2 size={16}/>
                           <span>Join Group</span>
                        </button>
                    </div>
                )}
                 {groups.length === 0 && <p className="text-center p-8 col-span-full">No small groups are available right now.</p>}
            </div>
        </div>
    );
}


// --- NEW ACCOUNTING MODULES ---
function GeneralLedgerPage() {
    const { db, appId } = useContext(AppContext);
    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, `artifacts/${appId}/public/data/general_ledger`), orderBy("date", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setLedger(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db, appId]);

    const totalDebits = ledger.reduce((acc, entry) => entry.type === 'debit' ? acc + entry.amount : acc, 0);
    const totalCredits = ledger.reduce((acc, entry) => entry.type === 'credit' ? acc + entry.amount : acc, 0);

    if (loading) return <LoadingScreen message="Loading General Ledger..." />;

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-slate-100">General Ledger</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-lg">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Debits</h3>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">Ksh {totalDebits.toLocaleString()}</p>
                </div>
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-lg">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Credits</h3>
                    <p className="text-3xl font-bold text-rose-600 dark:text-accent-rose mt-2">Ksh {totalCredits.toLocaleString()}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
                    <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-800/50">
                        <tr>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Account</th>
                            <th className="px-6 py-3">Description</th>
                            <th className="px-6 py-3 text-right">Debit</th>
                            <th className="px-6 py-3 text-right">Credit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ledger.length === 0 ? <tr><td colSpan="5" className="text-center p-8">No transactions in the ledger.</td></tr> : ledger.map(entry => (
                            <tr key={entry.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-6 py-4">{entry.date.toDate().toLocaleString()}</td>
                                <td className="px-6 py-4 text-slate-800 dark:text-slate-200">{entry.account}</td>
                                <td className="px-6 py-4">{entry.description}</td>
                                <td className="px-6 py-4 text-right">{entry.type === 'debit' ? `Ksh ${entry.amount.toLocaleString()}` : '-'}</td>
                                <td className="px-6 py-4 text-right">{entry.type === 'credit' ? `Ksh ${entry.amount.toLocaleString()}` : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function AccountsPayablePage() {
    const { db, appId, userData, logAuditEvent, createLedgerEntries } = useContext(AppContext);
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBill, setEditingBill] = useState(null);

    useEffect(() => {
        const q = query(collection(db, `artifacts/${appId}/public/data/bills`), orderBy("dueDate", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setBills(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [db, appId]);

    const handleModalClose = () => { setIsModalOpen(false); setEditingBill(null); };
    
    const handleFormSubmit = async (data) => {
        const amount = parseFloat(data.amount);
        const billData = { ...data, amount, dueDate: Timestamp.fromDate(new Date(data.dueDate)) };
        if (editingBill) {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/bills`, editingBill.id), billData);
            await logAuditEvent(userData, `Updated bill from ${data.vendor} for Ksh ${amount}`);
        } else {
            const docRef = await addDoc(collection(db, `artifacts/${appId}/public/data/bills`), { ...billData, status: 'Due' });
            await logAuditEvent(userData, `Created bill from ${data.vendor} for Ksh ${amount}`);
            await createLedgerEntries([
                { account: `${data.category} Expense`, description: `Bill from ${data.vendor}`, type: 'debit', amount: amount, referenceId: docRef.id },
                { account: 'Accounts Payable', description: `Bill from ${data.vendor}`, type: 'credit', amount: amount, referenceId: docRef.id }
            ]);
        }
        handleModalClose();
    };

    const handlePayBill = async (bill) => {
        if (window.confirm(`Mark bill from ${bill.vendor} as paid?`)) {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/bills`, bill.id), { status: 'Paid' });
            await addDoc(collection(db, `artifacts/${appId}/public/data/expenses`), {
                description: `Payment for bill from ${bill.vendor}`,
                amount: bill.amount,
                fund: 'General Fund',
                category: bill.category,
                date: Timestamp.now()
            });
            await logAuditEvent(userData, `Paid bill to ${bill.vendor} for Ksh ${bill.amount}`);
            await createLedgerEntries([
                { account: 'Accounts Payable', description: `Paid bill to ${bill.vendor}`, type: 'debit', amount: bill.amount, referenceId: bill.id },
                { account: 'Cash', description: `Paid bill to ${bill.vendor}`, type: 'credit', amount: bill.amount, referenceId: bill.id }
            ]);
        }
    };
    
    if (loading) return <LoadingScreen message="Loading bills..." />;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Accounts Payable (Bills)</h2>
                <motion.button onClick={() => setIsModalOpen(true)} whileHover={{ scale: 1.05 }} className="bg-primary text-white px-5 py-2.5 rounded-lg shadow-md flex items-center space-x-2"><PlusCircle className="h-5 w-5" /><span>New Bill</span></motion.button>
            </div>
            <Modal isOpen={isModalOpen} onClose={handleModalClose} title={editingBill ? "Edit Bill" : "Create New Bill"}>
                <BillForm onSubmit={handleFormSubmit} onCancel={handleModalClose} bill={editingBill} />
            </Modal>
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
                     <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-800/50">
                        <tr>
                            <th className="px-6 py-3">Vendor</th>
                            <th className="px-6 py-3">Due Date</th>
                            <th className="px-6 py-3 text-right">Amount</th>
                            <th className="px-6 py-3 text-center">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bills.length === 0 ? <tr><td colSpan="5" className="p-8 text-center">No bills found.</td></tr> : bills.map(bill => (
                            <tr key={bill.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-6 py-4 text-slate-800 dark:text-slate-200">{bill.vendor}</td>
                                <td className="px-6 py-4">{bill.dueDate.toDate().toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-right">Ksh {bill.amount.toLocaleString()}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 text-xs rounded-full ${bill.status === 'Paid' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'}`}>
                                        {bill.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    {bill.status === 'Due' && <button onClick={() => handlePayBill(bill)} className="text-primary hover:underline">Pay</button>}
                                    <button onClick={() => { setEditingBill(bill); setIsModalOpen(true);}} className="text-slate-500 dark:text-slate-400 hover:underline">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function BillForm({ onSubmit, onCancel, bill }) {
    const [formData, setFormData] = useState({ vendor: '', amount: '', dueDate: new Date().toISOString().split('T')[0], category: 'Utilities' });
    
    useEffect(() => {
        if (bill) setFormData({ vendor: bill.vendor, amount: bill.amount, dueDate: bill.dueDate.toDate().toISOString().split('T')[0], category: bill.category });
    }, [bill]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };
    
    const FormInput = ({label, ...props}) => (
        <div>
           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
           <input {...props} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-700/50 focus:ring-0 text-slate-900 dark:text-slate-100" />
       </div>
   );
   const FormSelect = ({label, children, ...props}) => (
        <div>
           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
           <select {...props} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-700/50 focus:ring-0 text-slate-900 dark:text-slate-100">
               {children}
           </select>
       </div>
   );

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <FormInput label="Vendor" type="text" name="vendor" value={formData.vendor} onChange={handleChange} required />
             <FormInput label="Amount (Ksh)" type="number" name="amount" value={formData.amount} onChange={handleChange} required />
             <FormInput label="Due Date" type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} required />
             <FormSelect label="Category" name="category" value={formData.category} onChange={handleChange}><option>Utilities</option><option>Rent</option><option>Maintenance</option><option>Other</option></FormSelect>
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-white bg-primary">{bill ? 'Save Changes' : 'Create Bill'}</button>
            </div>
        </form>
    );
}

function AccountsReceivablePage() {
    const { db, appId, userData, logAuditEvent, createLedgerEntries } = useContext(AppContext);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);

     useEffect(() => {
        const q = query(collection(db, `artifacts/${appId}/public/data/invoices`), orderBy("dueDate", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setInvoices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [db, appId]);
    
    const handleModalClose = () => { setIsModalOpen(false); setEditingInvoice(null); };

    const handleFormSubmit = async (data) => {
        const amount = parseFloat(data.amount);
        const invoiceData = { ...data, amount, dueDate: Timestamp.fromDate(new Date(data.dueDate)) };
        if (editingInvoice) {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/invoices`, editingInvoice.id), invoiceData);
             await logAuditEvent(userData, `Updated invoice for ${data.customer} for Ksh ${amount}`);
        } else {
            const docRef = await addDoc(collection(db, `artifacts/${appId}/public/data/invoices`), { ...invoiceData, status: 'Sent' });
            await logAuditEvent(userData, `Created invoice for ${data.customer} for Ksh ${amount}`);
             await createLedgerEntries([
                { account: 'Accounts Receivable', description: `Invoice for ${data.customer}`, type: 'debit', amount: amount, referenceId: docRef.id },
                { account: 'Service Revenue', description: `Invoice for ${data.customer}`, type: 'credit', amount: amount, referenceId: docRef.id }
            ]);
        }
        handleModalClose();
    };

    const handleRecordPayment = async (invoice) => {
        if (window.confirm(`Record payment for invoice to ${invoice.customer}?`)) {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/invoices`, invoice.id), { status: 'Paid' });
            await addDoc(collection(db, `artifacts/${appId}/public/data/donations`), {
                memberName: invoice.customer,
                amount: invoice.amount,
                fund: 'Service Revenue',
                type: 'Invoice',
                date: Timestamp.now()
            });
            await logAuditEvent(userData, `Recorded payment from ${invoice.customer} for Ksh ${invoice.amount}`);
            await createLedgerEntries([
                { account: 'Cash', description: `Payment from ${invoice.customer}`, type: 'debit', amount: invoice.amount, referenceId: invoice.id },
                { account: 'Accounts Receivable', description: `Payment from ${invoice.customer}`, type: 'credit', amount: invoice.amount, referenceId: invoice.id }
            ]);
        }
    };

    if (loading) return <LoadingScreen message="Loading invoices..." />;

    return (
         <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Accounts Receivable (Invoices)</h2>
                <motion.button onClick={() => setIsModalOpen(true)} whileHover={{ scale: 1.05 }} className="bg-primary text-white px-5 py-2.5 rounded-lg shadow-md flex items-center space-x-2"><PlusCircle className="h-5 w-5" /><span>New Invoice</span></motion.button>
            </div>
            <Modal isOpen={isModalOpen} onClose={handleModalClose} title={editingInvoice ? "Edit Invoice" : "Create New Invoice"}>
                <InvoiceForm onSubmit={handleFormSubmit} onCancel={handleModalClose} invoice={editingInvoice} />
            </Modal>
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
                     <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-800/50">
                        <tr>
                            <th className="px-6 py-3">Customer</th>
                            <th className="px-6 py-3">Due Date</th>
                            <th className="px-6 py-3 text-right">Amount</th>
                            <th className="px-6 py-3 text-center">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.length === 0 ? <tr><td colSpan="5" className="p-8 text-center">No invoices found.</td></tr> : invoices.map(invoice => (
                            <tr key={invoice.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-6 py-4 text-slate-800 dark:text-slate-200">{invoice.customer}</td>
                                <td className="px-6 py-4">{invoice.dueDate.toDate().toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-right">Ksh {invoice.amount.toLocaleString()}</td>
                                <td className="px-6 py-4 text-center">
                                     <span className={`px-2 py-1 text-xs rounded-full ${invoice.status === 'Paid' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'}`}>
                                        {invoice.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                     {invoice.status === 'Sent' && <button onClick={() => handleRecordPayment(invoice)} className="text-primary hover:underline">Record Payment</button>}
                                     <button onClick={() => { setEditingInvoice(invoice); setIsModalOpen(true);}} className="text-slate-500 dark:text-slate-400 hover:underline">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function InvoiceForm({ onSubmit, onCancel, invoice }) {
    const [formData, setFormData] = useState({ customer: '', amount: '', dueDate: new Date().toISOString().split('T')[0] });
    useEffect(() => {
        if (invoice) setFormData({ customer: invoice.customer, amount: invoice.amount, dueDate: invoice.dueDate.toDate().toISOString().split('T')[0] });
    }, [invoice]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };
    
    const FormInput = ({label, ...props}) => (
        <div>
           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
           <input {...props} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-700/50 focus:ring-0 text-slate-900 dark:text-slate-100" />
       </div>
   );

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <FormInput label="Customer" type="text" name="customer" value={formData.customer} onChange={handleChange} required />
             <FormInput label="Amount (Ksh)" type="number" name="amount" value={formData.amount} onChange={handleChange} required />
             <FormInput label="Due Date" type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} required />
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-white bg-primary">{invoice ? 'Save Changes' : 'Create Invoice'}</button>
            </div>
        </form>
    );
}


function PayrollPage() {
    const { db, appId, userData, logAuditEvent, createLedgerEntries } = useContext(AppContext);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, `artifacts/${appId}/public/data/employees`), (snap) => {
            setEmployees(snap.docs.map(doc => ({id: doc.id, ...doc.data()})));
            setLoading(false);
        });
        return () => unsub();
    }, [db, appId]);

    const handleModalClose = () => { setIsModalOpen(false); setEditingEmployee(null); };

    const handleFormSubmit = async (data) => {
        const salary = parseFloat(data.salary);
        if (editingEmployee) {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/employees`, editingEmployee.id), { name: data.name, salary });
        } else {
            await addDoc(collection(db, `artifacts/${appId}/public/data/employees`), { name: data.name, salary });
        }
        handleModalClose();
    };

    const handleRunPayroll = async () => {
        if (employees.length === 0) {
            alert("No employees to run payroll for.");
            return;
        }
        if (window.confirm("Are you sure you want to run payroll for all employees? This will create expense records.")) {
            const batch = writeBatch(db);
            const ledgerEntries = [];
            
            employees.forEach(emp => {
                const expenseRef = doc(collection(db, `artifacts/${appId}/public/data/expenses`));
                batch.set(expenseRef, {
                    description: `Salary for ${emp.name}`,
                    amount: emp.salary,
                    category: 'Salaries',
                    fund: 'General Fund',
                    date: Timestamp.now()
                });
                
                const empRef = doc(db, `artifacts/${appId}/public/data/employees`, emp.id);
                batch.update(empRef, { lastPaid: Timestamp.now() });

                ledgerEntries.push(
                    { account: 'Salaries Expense', description: `Salary for ${emp.name}`, type: 'debit', amount: emp.salary, referenceId: emp.id },
                    { account: 'Cash', description: `Salary for ${emp.name}`, type: 'credit', amount: emp.salary, referenceId: emp.id }
                );
            });

            await batch.commit();
            await createLedgerEntries(ledgerEntries);
            await logAuditEvent(userData, `Ran payroll for ${employees.length} employees.`);
            alert("Payroll run successfully!");
        }
    };
    
    if (loading) return <LoadingScreen message="Loading payroll..." />;

    return (
        <div>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Payroll</h2>
                <div className="flex gap-4">
                    <motion.button onClick={() => setIsModalOpen(true)} whileHover={{ scale: 1.05 }} className="bg-green-600 text-white px-5 py-2.5 rounded-lg shadow-md flex items-center space-x-2"><PlusCircle className="h-5 w-5" /><span>Add Employee</span></motion.button>
                    <motion.button onClick={handleRunPayroll} whileHover={{ scale: 1.05 }} className="bg-primary text-white px-5 py-2.5 rounded-lg shadow-md flex items-center space-x-2"><UserCheck className="h-5 w-5" /><span>Run Payroll</span></motion.button>
                </div>
            </div>
             <Modal isOpen={isModalOpen} onClose={handleModalClose} title={editingEmployee ? "Edit Employee" : "Add Employee"}>
                <EmployeeForm onSubmit={handleFormSubmit} onCancel={handleModalClose} employee={editingEmployee} />
            </Modal>
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
                     <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-800/50">
                        <tr>
                            <th className="px-6 py-3">Employee Name</th>
                            <th className="px-6 py-3 text-right">Monthly Salary</th>
                            <th className="px-6 py-3">Last Paid</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map(emp => (
                            <tr key={emp.id} className="border-b border-slate-200 dark:border-slate-800">
                                <td className="px-6 py-4 text-slate-800 dark:text-slate-200">{emp.name}</td>
                                <td className="px-6 py-4 text-right">Ksh {emp.salary.toLocaleString()}</td>
                                <td className="px-6 py-4">{emp.lastPaid ? emp.lastPaid.toDate().toLocaleDateString() : 'N/A'}</td>
                                <td className="px-6 py-4 text-right"><button onClick={() => { setEditingEmployee(emp); setIsModalOpen(true);}} className="text-slate-500 dark:text-slate-400 hover:underline">Edit</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function EmployeeForm({ onSubmit, onCancel, employee }) {
    const [formData, setFormData] = useState({ name: '', salary: '' });
    useEffect(() => {
        if (employee) setFormData({ name: employee.name, salary: employee.salary });
    }, [employee]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };
    
    const FormInput = ({label, ...props}) => (
        <div>
           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
           <input {...props} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-700/50 focus:ring-0 text-slate-900 dark:text-slate-100" />
       </div>
   );

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <FormInput label="Full Name" type="text" name="name" value={formData.name} onChange={handleChange} required />
             <FormInput label="Monthly Salary (Ksh)" type="number" name="salary" value={formData.salary} onChange={handleChange} required />
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-white bg-primary">{employee ? 'Save Changes' : 'Add Employee'}</button>
            </div>
        </form>
    );
}

function AuditTrailPage() {
    const { db, appId } = useContext(AppContext);
    const [trail, setTrail] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, `artifacts/${appId}/public/data/audit_trail`), orderBy("timestamp", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setTrail(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [db, appId]);

    if (loading) return <LoadingScreen message="Loading audit trail..." />;

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-slate-100">Audit Trail</h2>
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg">
                <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                    {trail.length === 0 ? <li className="p-8 text-center">No audit trail events found.</li> : trail.map(item => (
                        <li key={item.id} className="p-4">
                            <p className="text-slate-800 dark:text-slate-200">{item.action}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-500">By: {item.user} on {item.timestamp.toDate().toLocaleString()}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

// --- NEW SMALL GROUP MANAGEMENT MODULE ---

function ManageSmallGroups() {
    const { db, appId, userData, logAuditEvent } = useContext(AppContext);
    const [view, setView] = useState('list'); // 'list' or 'detail'
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [groups, setGroups] = useState([]);
    const [donations, setDonations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);

    useEffect(() => {
        const groupsUnsub = onSnapshot(collection(db, `artifacts/${appId}/public/data/small_groups`), (snap) => {
            setGroups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        const donationsUnsub = onSnapshot(collection(db, `artifacts/${appId}/public/data/donations`), (snap) => {
            setDonations(snap.docs.map(doc => doc.data()));
        });
        return () => { groupsUnsub(); donationsUnsub(); };
    }, [db, appId]);

    const getGroupTotal = (groupId) => {
        return donations
            .filter(d => d.groupId === groupId)
            .reduce((sum, d) => sum + d.amount, 0);
    };

    const handleModalClose = () => { setIsModalOpen(false); setEditingGroup(null); };
    
    const handleFormSubmit = async (data) => {
        if (editingGroup) {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/small_groups`, editingGroup.id), data);
            await logAuditEvent(userData, `Updated small group: ${data.name}`);
        } else {
            await addDoc(collection(db, `artifacts/${appId}/public/data/small_groups`), { ...data, createdAt: Timestamp.now() });
            await logAuditEvent(userData, `Created small group: ${data.name}`);
        }
        handleModalClose();
    };

    const handleDelete = async (group) => {
        if (window.confirm(`Are you sure you want to delete the group "${group.name}"? This cannot be undone.`)) {
            const q = query(collection(db, "users"), where("groupId", "==", group.id));
            const usersSnapshot = await getDocs(q);
            const batch = writeBatch(db);
            usersSnapshot.forEach(userDoc => {
                batch.update(doc(db, "users", userDoc.id), { groupId: null, groupName: null });
            });
            await batch.commit();

            await deleteDoc(doc(db, `artifacts/${appId}/public/data/small_groups`, group.id));
            await logAuditEvent(userData, `Deleted small group: ${group.name}`);
        }
    };
    
    const handleViewDetails = (group) => {
        setSelectedGroup(group);
        setView('detail');
    };

    if (loading) return <LoadingScreen message="Loading small groups..." />;

    if (view === 'detail') {
        return <SmallGroupDetailView group={selectedGroup} onBack={() => setView('list')} />;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Manage Small Groups</h2>
                <motion.button onClick={() => setIsModalOpen(true)} whileHover={{ scale: 1.05 }} className="bg-primary text-white px-5 py-2.5 rounded-lg shadow-md flex items-center space-x-2">
                    <PlusCircle className="h-5 w-5" /><span>New Group</span>
                </motion.button>
            </div>
            <Modal isOpen={isModalOpen} onClose={handleModalClose} title={editingGroup ? "Edit Group" : "Create New Group"}>
                <SmallGroupForm onSubmit={handleFormSubmit} onCancel={handleModalClose} group={editingGroup} />
            </Modal>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map(group => {
                    const totalContributions = getGroupTotal(group.id);
                    const hasGoal = group.goalAmount > 0;
                    const goalPercentage = hasGoal ? (totalContributions / group.goalAmount) * 100 : 0;
                    return (
                        <motion.div key={group.id} initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-lg flex flex-col">
                            <div className="flex-grow">
                                <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">{group.name}</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">Leader: {group.leaderName || 'N/A'}</p>
                                <div className="mt-4">
                                    {hasGoal ? (
                                        <>
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">{group.goalTitle}</p>
                                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mt-2">
                                                <motion.div 
                                                    className="bg-primary h-2.5 rounded-full" 
                                                    initial={{ width: 0 }} 
                                                    animate={{ width: `${Math.min(goalPercentage, 100)}%` }} 
                                                />
                                            </div>
                                            <div className="flex justify-between text-sm mt-1">
                                                <span className="font-bold text-primary">Ksh {totalContributions.toLocaleString()}</span>
                                                <span className="text-slate-500 dark:text-slate-400">of {group.goalAmount.toLocaleString()}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Contributions</p>
                                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">Ksh {totalContributions.toLocaleString()}</p>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                                <button onClick={() => { setEditingGroup(group); setIsModalOpen(true); }} className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary"><Edit size={18}/></button>
                                <button onClick={() => handleDelete(group)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-accent-rose"><Trash2 size={18}/></button>
                                <button onClick={() => handleViewDetails(group)} className="px-3 py-1.5 text-sm bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">View Details</button>
                            </div>
                        </motion.div>
                    )
                })}
                {groups.length === 0 && <p className="text-center p-8 col-span-full">No small groups created yet.</p>}
            </div>
        </div>
    );
}

function SmallGroupForm({ onSubmit, onCancel, group }) {
    const [formData, setFormData] = useState({ name: '', leaderName: '', description: '', goalTitle: '', goalAmount: '' });
    
    useEffect(() => {
        if (group) {
            setFormData({ 
                name: group.name || '', 
                leaderName: group.leaderName || '', 
                description: group.description || '',
                goalTitle: group.goalTitle || '',
                goalAmount: group.goalAmount || ''
            });
        }
    }, [group]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    
    const handleSubmit = (e) => { 
        e.preventDefault(); 
        onSubmit({
            ...formData,
            goalAmount: parseFloat(formData.goalAmount) || 0
        }); 
    };
    
    const FormInput = ({label, ...props}) => (
        <div>
           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
           <input {...props} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-700/50 focus:ring-0 text-slate-900 dark:text-slate-100" />
       </div>
   );
    const FormTextarea = ({label, ...props}) => (
        <div>
           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
           <textarea {...props} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-700/50 focus:ring-0 text-slate-900 dark:text-slate-100" />
       </div>
   );

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput label="Group Name" type="text" name="name" value={formData.name} onChange={handleChange} required />
            <FormInput label="Leader's Name" type="text" name="leaderName" value={formData.leaderName} onChange={handleChange} />
            <FormTextarea label="Description" name="description" rows="3" value={formData.description || ''} onChange={handleChange} />
            
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Group Goal (Optional)</h4>
                <FormInput label="Goal Title" type="text" name="goalTitle" placeholder="e.g., Youth Camp Fundraiser" value={formData.goalTitle} onChange={handleChange} />
                <FormInput label="Goal Amount (Ksh)" type="number" name="goalAmount" placeholder="e.g., 50000" value={formData.goalAmount} onChange={handleChange} />
            </div>

            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-white bg-primary">{group ? 'Save Changes' : 'Create Group'}</button>
            </div>
        </form>
    );
}

function SmallGroupDetailView({ group, onBack }) {
    const { db, appId } = useContext(AppContext);
    const [members, setMembers] = useState([]);
    const [donations, setDonations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!group) return;
        const membersQuery = query(collection(db, "users"), where("groupId", "==", group.id));
        const donationsQuery = query(collection(db, `artifacts/${appId}/public/data/donations`), where("groupId", "==", group.id), orderBy("date", "desc"));

        const membersUnsub = onSnapshot(membersQuery, (snap) => setMembers(snap.docs.map(d => d.data())));
        const donationsUnsub = onSnapshot(donationsQuery, (snap) => {
            setDonations(snap.docs.map(d => d.data()));
            setLoading(false);
        });

        return () => { membersUnsub(); donationsUnsub(); };
    }, [db, appId, group]);

    const totalContributions = donations.reduce((sum, d) => sum + d.amount, 0);

    return (
        <div>
            <button onClick={onBack} className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 hover:text-primary mb-6">
                <ArrowLeft size={18} /><span>Back to All Groups</span>
            </button>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{group.name}</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Leader: {group.leaderName}</p>
            
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-lg mb-8">
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Contributions</p>
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">Ksh {totalContributions.toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-lg">
                    <h3 className="font-bold text-xl mb-4 text-slate-900 dark:text-slate-100">Members ({members.length})</h3>
                    <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                        {members.map(m => <li key={m.uid} className="py-2">{m.name}</li>)}
                        {members.length === 0 && <li className="py-2 text-slate-500">No members assigned to this group.</li>}
                    </ul>
                </div>
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-lg">
                    <h3 className="font-bold text-xl mb-4 text-slate-900 dark:text-slate-100">Contribution History</h3>
                    <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                         {donations.map((d, i) => (
                            <li key={i} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{d.memberName}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{d.date.toDate().toLocaleDateString()}</p>
                                </div>
                                <p className="font-bold text-slate-900 dark:text-slate-100">Ksh {d.amount.toLocaleString()}</p>
                            </li>
                         ))}
                         {donations.length === 0 && <li className="py-2 text-slate-500">No contributions from this group yet.</li>}
                    </ul>
                </div>
            </div>
        </div>
    );
}
