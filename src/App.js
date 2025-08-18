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
    orderBy // Import orderBy
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { AreaChart, Area, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { User, DollarSign, Users, BarChart2, Settings, LogOut, HandHeart, FileText, PlusCircle, Trash2, Edit, X, CheckCircle, AlertTriangle, Home, Eye, Menu, Target, PiggyBank, Receipt, MessageSquare, Repeat, Calendar, Package, Upload, Link as LinkIcon, Users2, Bell, TrendingUp, Briefcase, Landmark, FileCheck2, Search, CreditCard, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Firebase Configuration ---
// This setup allows the app to use environment variables when deployed,
// but falls back to a local configuration for development.
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
setLogLevel('error'); // Set to 'debug' for detailed logs, 'error' for production

// --- Application Context ---
// Provides user, auth, and db information to all components.
const AppContext = createContext(null);

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [showOnboarding, setShowOnboarding] = useState(false);

    // Effect to handle authentication state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser && !firebaseUser.isAnonymous) {
                const userDocRef = doc(db, "users", firebaseUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const data = userDocSnap.data();
                    setUserData({ uid: firebaseUser.uid, ...data });
                    if (!data.onboardingCompleted) {
                        setShowOnboarding(true);
                    }
                } else {
                    // Create a new user profile if one doesn't exist
                    const newUser = { uid: firebaseUser.uid, email: firebaseUser.email, role: 'member', name: firebaseUser.displayName || 'New Member', createdAt: Timestamp.now(), onboardingCompleted: false };
                    await setDoc(userDocRef, newUser);
                    setUserData(newUser);
                    setShowOnboarding(true);
                }
                setUser(firebaseUser);
            } else {
                setUser(null);
                setUserData(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Function to handle user logout
    const handleLogout = async () => {
        try {
            await signOut(auth);
            setCurrentPage('login');
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };
    
    // Function to mark onboarding as complete
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
        <AppContext.Provider value={{ user, userData, db, appId, storage }}>
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
        <div className="bg-gray-50 dark:bg-gray-950 min-h-screen flex items-center justify-center font-sans p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-950">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
                <div className="text-center">
                    <HandHeart className="mx-auto h-12 w-auto text-blue-600 dark:text-blue-500" />
                    <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">FaithFinance</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{isLogin ? 'Sign in to manage your church finances' : 'Create a new account'}</p>
                </div>
                {isLogin ? <LoginForm onAuthSuccess={handleAuthSuccess} /> : <SignUpForm onAuthSuccess={handleAuthSuccess} />}
                <div className="text-sm text-center">
                    <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200">
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
        case 'auth/operation-not-allowed': return 'Email/password sign-in is not enabled.';
        case 'auth/invalid-api-key': return 'Configuration error: Invalid Firebase API key.';
        default: return `An unexpected error occurred: ${err.message}`;
    }
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
            {error && <p className="text-red-500 text-xs text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</p>}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 focus:ring-0 text-gray-900 dark:text-white transition-colors duration-200" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 focus:ring-0 text-gray-900 dark:text-white transition-colors duration-200" />
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 rounded-lg shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 transition-all duration-200">
                {loading ? 'Signing In...' : 'Sign In'}
            </motion.button>
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
            await setDoc(doc(db, "users", userCredential.user.uid), { name, email, role: 'member', createdAt: Timestamp.now(), onboardingCompleted: false });
            onAuthSuccess();
        } catch (err) {
            setError(getFriendlyAuthErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="space-y-4" onSubmit={handleSignUp}>
            {error && <p className="text-red-500 text-xs text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</p>}
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" required className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 focus:ring-0 text-gray-900 dark:text-white transition-colors duration-200" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 focus:ring-0 text-gray-900 dark:text-white transition-colors duration-200" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min. 6 characters)" required className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 focus:ring-0 text-gray-900 dark:text-white transition-colors duration-200" />
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 rounded-lg shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 transition-all duration-200">
                {loading ? 'Creating Account...' : 'Sign Up'}
            </motion.button>
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
        <div className="bg-gray-50 dark:bg-gray-950 min-h-screen flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
                <AnimatePresence mode="wait">
                    {step === 1 && <OnboardingStep key={1} title="Welcome to FaithFinance!" description="Let's get your financial hub set up. This quick tour will guide you through the key features." onNext={nextStep} />}
                    {step === 2 && <OnboardingStep key={2} title="Configure Your Funds" description="Funds are essential for tracking income and expenses. You can create funds like 'General Fund', 'Building Fund', or 'Missions'. You can manage these in the settings later." onNext={nextStep} onBack={prevStep} />}
                    {step === 3 && <OnboardingStep key={3} title="You're All Set!" description="You've completed the initial setup. You can now explore your dashboard and manage your finances. Click finish to get started!" onComplete={onComplete} onBack={prevStep} />}
                </AnimatePresence>
                <div className="flex justify-center mt-6">
                    {[...Array(totalSteps)].map((_, i) => (
                        <div key={i} className={`h-2 w-8 mx-1 rounded-full ${i + 1 <= step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}

function OnboardingStep({ title, description, onNext, onBack, onComplete }) {
    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }}>
            <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{title}</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">{description}</p>
            </div>
            <div className="flex justify-center space-x-4">
                {onBack && <button onClick={onBack} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300">Back</button>}
                {onNext && <button onClick={onNext} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700">Next</button>}
                {onComplete && <button onClick={onComplete} className="px-6 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700">Finish</button>}
            </div>
        </motion.div>
    );
}


// --- Layout Components ---
function DashboardLayout({ children, currentPage, setCurrentPage, handleLogout }) {
    const { userData } = useContext(AppContext);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} role={userData.role} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header handleLogout={handleLogout} user={userData} setSidebarOpen={setSidebarOpen} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-950 p-4 sm:p-6 lg:p-8">
                    <AnimatePresence mode="wait">
                        <motion.div key={currentPage} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
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
            { name: 'Budgets', icon: PiggyBank, page: 'manage_budgets' },
            { name: 'Pledges', icon: Repeat, page: 'manage_pledges' },
            { name: 'Events', icon: Calendar, page: 'manage_events' },
            { name: 'Assets', icon: Package, page: 'manage_assets' },
            { name: 'Members', icon: Users, page: 'manage_members' },
            { name: 'Messaging', icon: MessageSquare, page: 'bulk_messaging' },
            { name: 'Reports', icon: FileText, page: 'reports' },
            { name: 'Bank Reconciliation', icon: Landmark, page: 'bank_reconciliation' },
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
            <AnimatePresence>{sidebarOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)}></motion.div>}</AnimatePresence>
            <motion.div className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-900 shadow-xl transform lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-30 flex flex-col`} initial={{ x: '-100%' }} animate={{ x: sidebarOpen || window.innerWidth >= 1024 ? '0%' : '-100%' }}>
                <div className="flex items-center justify-center p-5 border-b border-gray-200 dark:border-gray-800"><HandHeart className="h-8 w-8 text-blue-600" /><span className="text-gray-800 dark:text-white text-xl font-bold ml-2">FaithFinance</span></div>
                <nav className="flex-1 mt-6 space-y-1 px-2 overflow-y-auto">
                    {navLinks.map((link) => (
                        <motion.button key={link.name} onClick={() => { setCurrentPage(link.page); if (window.innerWidth < 1024) setSidebarOpen(false); }} whileHover={{ scale: 1.02, x: 5 }} whileTap={{ scale: 0.98 }} className={`w-full flex items-center py-2.5 px-4 font-medium rounded-lg transition-all duration-200 ${currentPage === link.page ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                            <link.icon className="h-5 w-5 mr-3" />{link.name}
                        </motion.button>
                    ))}
                </nav>
                <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                     <motion.button onClick={() => setCurrentPage('settings')} whileHover={{ scale: 1.02, x: 5 }} whileTap={{ scale: 0.98 }} className={`w-full flex items-center py-2.5 px-4 font-medium rounded-lg transition-all duration-200 ${currentPage === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                        <Settings className="h-5 w-5 mr-3" />Settings
                    </motion.button>
                </div>
            </motion.div>
        </>
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
        <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center">
                 <button onClick={() => setSidebarOpen(true)} className="text-gray-500 dark:text-gray-400 focus:outline-none lg:hidden mr-4"><Menu className="h-6 w-6" /></button>
                <h1 className="text-xl font-semibold text-gray-800 dark:text-white">{pageTitle} View</h1>
            </div>
            <div className="flex items-center space-x-4">
                <div className="relative">
                    <button onClick={() => setNotificationsOpen(!notificationsOpen)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 relative">
                        <Bell className="h-6 w-6" />
                        <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
                    </button>
                    <AnimatePresence>
                        {notificationsOpen && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-20">
                                <div className="p-4 font-bold border-b dark:border-gray-700">Notifications</div>
                                <div className="divide-y dark:divide-gray-700">
                                    {notifications.map(n => (
                                        <div key={n.id} className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700 ${!n.read ? 'font-semibold' : ''}`}>
                                            <p className="text-sm">{n.text}</p>
                                            <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <div className="relative"><span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></span><User className="h-8 w-8 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300" /></div>
                <div className="text-right hidden sm:block"><p className="font-semibold text-sm text-gray-800 dark:text-white">{user.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p></div>
                <button onClick={handleLogout} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"><LogOut className="h-5 w-5" /></button>
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
        case 'manage_budgets': return <ManageBudgets />;
        case 'manage_pledges': return <ManagePledges />;
        case 'manage_events': return <ManageEvents />;
        case 'manage_assets': return <ManageAssets />;
        case 'manage_members': return <MemberManagement />;
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
    return <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950"><HandHeart className="h-16 w-16 text-blue-600 animate-pulse" /><p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">{message}</p></div>;
}

function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-800"><h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3><button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-6 w-6 text-gray-500" /></button></div>
                <div className="p-6 overflow-y-auto">{children}</div>
            </motion.div>
        </div>
    );
}

// --- Admin Components ---
function AdminDashboard() {
    const { db, appId } = useContext(AppContext);
    const [stats, setStats] = useState({ revenue: 0, expenses: 0, members: 0 });
    const [givingByFundData, setGivingByFundData] = useState([]);
    const [cashFlowData, setCashFlowData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            // Fetch donations for the current month
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

            // Fetch expenses for the current month
            const expensesQuery = query(
                collection(db, `artifacts/${appId}/public/data/expenses`),
                where('date', '>=', startOfMonth)
            );
            const expensesSnapshot = await getDocs(expensesQuery);
            let totalExpenses = 0;
            expensesSnapshot.forEach(doc => totalExpenses += doc.data().amount);

            // Fetch total members
            const membersSnapshot = await getDocs(collection(db, "users"));
            const totalMembers = membersSnapshot.size;

            setStats({ revenue: totalRevenue, expenses: totalExpenses, members: totalMembers });
            setGivingByFundData(Object.entries(fundMap).map(([name, value]) => ({ name, value })));
            
            // Note: Cash flow data requires more complex historical queries. This is a simplified version.
            setCashFlowData([
                { name: 'This Month', Inflow: totalRevenue, Outflow: totalExpenses }
            ]);

            setLoading(false);
        };

        fetchData();
    }, [db, appId]);
    
    if(loading) return <LoadingScreen message="Loading dashboard data..." />;

    const summaryData = [
        { name: 'Total Revenue (Month)', value: `Ksh ${stats.revenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-500' },
        { name: 'Total Expenses (Month)', value: `Ksh ${stats.expenses.toLocaleString()}`, icon: Receipt, color: 'text-red-500' },
        { name: 'Net Income (Month)', value: `Ksh ${(stats.revenue - stats.expenses).toLocaleString()}`, icon: TrendingUp, color: 'text-blue-500' },
        { name: 'Total Members', value: stats.members.toLocaleString(), icon: Users, color: 'text-purple-500' }
    ];
    
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Admin Dashboard</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {summaryData.map(item => (
                    <motion.div key={item.name} whileHover={{ y: -5, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" }} className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{item.name}</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{item.value}</p>
                            </div>
                            <div className={`p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 ${item.color}`}><item.icon className="h-6 w-6" /></div>
                        </div>
                    </motion.div>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md">
                    <h3 className="font-bold mb-4">Cash Flow Overview</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={cashFlowData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.3)" />
                            <XAxis dataKey="name" tick={{ fill: '#6b7280' }} />
                            <YAxis tick={{ fill: '#6b7280' }} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: 'none', borderRadius: '0.5rem' }} />
                            <Legend />
                            <Bar dataKey="Inflow" fill="#3b82f6" />
                            <Bar dataKey="Outflow" fill="#ef4444" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md">
                    <h3 className="font-bold mb-4">Giving by Fund</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart><Pie data={givingByFundData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name">{givingByFundData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: 'none', borderRadius: '0.5rem' }} /><Legend /></PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

function ManageDonations() {
    const { db, appId } = useContext(AppContext);
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

    const handleDeleteClick = async (id) => {
        if(window.confirm("Are you sure you want to delete this donation record?")){
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/donations`, id));
        }
    }

    const handleFormSubmit = async (donationData) => {
        try {
             const dataToSave = { ...donationData, date: Timestamp.fromDate(new Date(donationData.date)), amount: parseFloat(donationData.amount), lastUpdatedAt: Timestamp.now() };
            if(editingDonation){
                const docRef = doc(db, `artifacts/${appId}/public/data/donations`, editingDonation.id);
                await updateDoc(docRef, dataToSave);
            } else {
                 await addDoc(collection(db, `artifacts/${appId}/public/data/donations`), { ...dataToSave, createdAt: Timestamp.now() });
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
                <h2 className="text-3xl font-bold">Manage Donations</h2>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="Search donations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-blue-700 flex items-center space-x-2"><PlusCircle className="h-5 w-5" /><span>Add Offline Donation</span></motion.button>
                </div>
            </div>
            <Modal isOpen={isModalOpen} onClose={handleModalClose} title={editingDonation ? "Edit Donation" : "Add Offline Donation"}><DonationForm onSubmit={handleFormSubmit} onCancel={handleModalClose} donation={editingDonation} /></Modal>
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-md overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400"><tr><th scope="col" className="px-6 py-3">Date</th><th scope="col" className="px-6 py-3">Member Name</th><th scope="col" className="px-6 py-3">Fund</th><th scope="col" className="px-6 py-3">Amount (Ksh)</th><th scope="col" className="px-6 py-3">Type</th><th scope="col" className="px-6 py-3">Actions</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan="6" className="text-center p-8">Loading donations...</td></tr> : filteredDonations.length === 0 ? <tr><td colSpan="6" className="text-center p-8">No donations recorded yet.</td></tr> :
                            filteredDonations.map(d => (
                                <tr key={d.id} className="bg-white border-b dark:bg-gray-900 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-6 py-4">{d.date ? d.date.toDate().toLocaleDateString() : 'N/A'}</td><td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{d.memberName}</td><td className="px-6 py-4">{d.fund}</td><td className="px-6 py-4">{d.amount.toLocaleString()}</td><td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${d.type === 'Offline' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'}`}>{d.type}</span></td><td className="px-6 py-4 flex space-x-2"><button onClick={() => handleEditClick(d)} className="p-2 text-gray-500 hover:text-blue-600"><Edit className="h-4 w-4" /></button><button onClick={() => handleDeleteClick(d.id)} className="p-2 text-gray-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function DonationForm({ onSubmit, onCancel, donation }) {
    const [formData, setFormData] = useState({ memberName: '', amount: '', fund: 'Tithes & Offering', date: new Date().toISOString().split('T')[0], type: 'Offline' });
    
    useEffect(() => {
        if(donation){
            setFormData({
                memberName: donation.memberName || '',
                amount: donation.amount || '',
                fund: donation.fund || 'Tithes & Offering',
                date: donation.date ? donation.date.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                type: donation.type || 'Offline'
            });
        }
    }, [donation]);

    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Member Name</label><input type="text" name="memberName" value={formData.memberName} onChange={handleChange} placeholder="e.g., John Doe" required className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 focus:ring-0 text-gray-900 dark:text-white" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (Ksh)</label><input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="e.g., 5000" required className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 focus:ring-0 text-gray-900 dark:text-white" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fund</label><select name="fund" value={formData.fund} onChange={handleChange} className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 focus:ring-0 text-gray-900 dark:text-white"><option>Tithes & Offering</option><option>Building Fund</option><option>Missions</option><option>Welfare</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label><input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 focus:ring-0 text-gray-900 dark:text-white" /></div>
            <div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700">{donation ? 'Save Changes' : 'Add Donation'}</button></div>
        </form>
    );
}

function ManageExpenses() {
    const { db, appId, storage } = useContext(AppContext);
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
                // Delete the Firestore document
                await deleteDoc(doc(db, `artifacts/${appId}/public/data/expenses`, expense.id));
                
                // If there's a receipt, delete it from Storage
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
                // If there's a new file, upload it
                const storageRef = ref(storage, `receipts/${appId}/${Date.now()}_${receiptFile.name}`);
                await uploadBytes(storageRef, receiptFile);
                receiptUrl = await getDownloadURL(storageRef);
            }

            const dataToSave = { 
                ...expenseData, 
                date: Timestamp.fromDate(new Date(expenseData.date)), 
                amount: parseFloat(expenseData.amount), 
                receiptUrl, 
                lastUpdatedAt: Timestamp.now() 
            };
            
            if (editingExpense) {
                const docRef = doc(db, `artifacts/${appId}/public/data/expenses`, editingExpense.id);
                await updateDoc(docRef, dataToSave);
            } else {
                await addDoc(collection(db, `artifacts/${appId}/public/data/expenses`), { ...dataToSave, createdAt: Timestamp.now() });
            }
            
            handleModalClose();
        } catch (error) { console.error("Error adding expense: ", error); }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-bold">Manage Expenses</h2><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsModalOpen(true)} className="bg-red-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-red-700 flex items-center space-x-2"><PlusCircle className="h-5 w-5" /><span>Add Expense</span></motion.button></div>
            <Modal isOpen={isModalOpen} onClose={handleModalClose} title={editingExpense ? "Edit Expense" : "Add New Expense"}><ExpenseForm onSubmit={handleFormSubmit} onCancel={handleModalClose} expense={editingExpense} /></Modal>
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-md overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400"><tr><th scope="col" className="px-6 py-3">Date</th><th scope="col" className="px-6 py-3">Description</th><th scope="col" className="px-6 py-3">Fund</th><th scope="col" className="px-6 py-3">Category</th><th scope="col" className="px-6 py-3">Amount (Ksh)</th><th scope="col" className="px-6 py-3">Receipt</th><th scope="col" className="px-6 py-3">Actions</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan="7" className="text-center p-8">Loading expenses...</td></tr> : expenses.length === 0 ? <tr><td colSpan="7" className="text-center p-8">No expenses recorded yet.</td></tr> :
                            expenses.map(e => (
                                <tr key={e.id} className="bg-white border-b dark:bg-gray-900 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-6 py-4">{e.date ? e.date.toDate().toLocaleDateString() : 'N/A'}</td><td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{e.description}</td><td className="px-6 py-4">{e.fund}</td><td className="px-6 py-4">{e.category}</td><td className="px-6 py-4">{e.amount.toLocaleString()}</td><td className="px-6 py-4">{e.receiptUrl ? <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline"><LinkIcon className="h-5 w-5" /></a> : 'None'}</td><td className="px-6 py-4 flex space-x-2"><button onClick={() => handleEditClick(e)} className="p-2 text-gray-500 hover:text-blue-600"><Edit className="h-4 w-4" /></button><button onClick={() => handleDeleteClick(e)} className="p-2 text-gray-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></td>
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
        }
    }, [expense]);

    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
    const handleFileChange = (e) => { if (e.target.files[0]) { setReceiptFile(e.target.files[0]); } };
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData, receiptFile); };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label><input type="text" name="description" value={formData.description} onChange={handleChange} placeholder="e.g., Electricity Bill" required className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 focus:ring-0 text-gray-900 dark:text-white" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (Ksh)</label><input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="e.g., 12000" required className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 focus:ring-0 text-gray-900 dark:text-white" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fund</label><select name="fund" value={formData.fund} onChange={handleChange} className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800"><option>General Fund</option><option>Building Fund</option><option>Missions</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label><select name="category" value={formData.category} onChange={handleChange} className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800"><option>Utilities</option><option>Salaries</option><option>Ministry Costs</option><option>Rent</option><option>Maintenance</option><option>Other</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label><input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload Receipt (Optional)</label><div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md"><div className="space-y-1 text-center"><Upload className="mx-auto h-12 w-12 text-gray-400" /><div className="flex text-sm text-gray-600"><label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"><span>Upload a file</span><input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} /></label><p className="pl-1">or drag and drop</p></div><p className="text-xs text-gray-500">{receiptFile ? receiptFile.name : 'PNG, JPG, PDF up to 10MB'}</p></div></div></div>
            <div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700">{expense ? 'Save Changes' : 'Add Expense'}</button></div>
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
            setLoading(false);
        });
        const expensesUnsub = onSnapshot(collection(db, `artifacts/${appId}/public/data/expenses`), (snap) => {
            setExpenses(snap.docs.map(doc => doc.data()));
        });
        return () => {
            budgetsUnsub();
            expensesUnsub();
        };
    }, [db, appId]);

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingBudget(null);
    };

    const handleFormSubmit = async (budgetData) => {
        const data = { ...budgetData, allocated: parseFloat(budgetData.allocated) };
        if (editingBudget) {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/budgets`, editingBudget.id), data);
        } else {
            await addDoc(collection(db, `artifacts/${appId}/public/data/budgets`), data);
        }
        handleModalClose();
    };

    const handleDelete = async (id) => {
        if (window.confirm("Delete this budget?")) {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/budgets`, id));
        }
    };

    const getSpentAmount = (budget) => {
        const today = new Date();
        let startDate;

        switch (budget.period) {
            case 'Monthly':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
            case 'Quarterly':
                const quarter = Math.floor(today.getMonth() / 3);
                startDate = new Date(today.getFullYear(), quarter * 3, 1);
                break;
            case 'Annually':
                startDate = new Date(today.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(0); // a long time ago
        }

        return expenses
            .filter(e => e.category === budget.category && e.date.toDate() >= startDate)
            .reduce((sum, e) => sum + e.amount, 0);
    };
    
    if (loading) return <LoadingScreen message="Loading budgets..." />;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Budget vs. Actuals</h2>
                <motion.button onClick={() => setIsModalOpen(true)} whileHover={{ scale: 1.05 }} className="bg-green-600 text-white px-5 py-2.5 rounded-lg shadow-md flex items-center space-x-2">
                    <PlusCircle className="h-5 w-5" /><span>New Budget</span>
                </motion.button>
            </div>
            
            <Modal isOpen={isModalOpen} onClose={handleModalClose} title={editingBudget ? "Edit Budget" : "Create New Budget"}>
                <BudgetForm onSubmit={handleFormSubmit} onCancel={handleModalClose} budget={editingBudget} />
            </Modal>

            <div className="space-y-6">
                {budgets.map(budget => {
                    const spent = getSpentAmount(budget);
                    const percentage = budget.allocated > 0 ? (spent / budget.allocated) * 100 : 0;
                    const isOverBudget = percentage > 100;
                    const barColor = isOverBudget ? 'bg-red-500' : percentage > 85 ? 'bg-yellow-500' : 'bg-blue-500';
                    return (
                        <div key={budget.id} className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-lg">{budget.category} ({budget.fund})</h3>
                                    <p className="text-sm text-gray-500">{budget.period}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className={`font-semibold ${isOverBudget ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
                                        Ksh {spent.toLocaleString()} / {budget.allocated.toLocaleString()}
                                    </span>
                                    <button onClick={() => { setEditingBudget(budget); setIsModalOpen(true); }} className="text-gray-400 hover:text-blue-500"><Edit size={16}/></button>
                                    <button onClick={() => handleDelete(budget.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                                <motion.div className={`h-4 rounded-full ${barColor}`} initial={{ width: 0 }} animate={{ width: `${Math.min(percentage, 100)}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
                            </div>
                            {isOverBudget && <p className="text-red-500 text-sm mt-2 text-right flex items-center justify-end"><AlertTriangle className="h-4 w-4 mr-1"/>Over budget by Ksh {(spent - budget.allocated).toLocaleString()}</p>}
                        </div>
                    );
                })}
                 {budgets.length === 0 && <div className="text-center p-8 bg-white dark:bg-gray-900 rounded-xl shadow-md"><p>No budgets created yet. Click "New Budget" to start.</p></div>}
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

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div><label>Fund</label><select name="fund" value={formData.fund} onChange={handleChange} className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800"><option>General Fund</option><option>Building Fund</option><option>Missions</option></select></div>
            <div><label>Category</label><input type="text" name="category" value={formData.category} onChange={handleChange} required className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800" /></div>
            <div><label>Period</label><select name="period" value={formData.period} onChange={handleChange} className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800"><option>Monthly</option><option>Quarterly</option><option>Annually</option></select></div>
            <div><label>Allocated Amount (Ksh)</label><input type="number" name="allocated" value={formData.allocated} onChange={handleChange} required className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800" /></div>
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-200">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-white bg-green-600">{budget ? 'Save Changes' : 'Create Budget'}</button>
            </div>
        </form>
    );
}


function MemberManagement() {
    const { db } = useContext(AppContext);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingMember, setEditingMember] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "users"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => { 
            setMembers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); 
            setLoading(false); 
        });
        return () => unsubscribe();
    }, [db]);

    const handleRoleChange = async (member, newRole) => {
        const userDocRef = doc(db, "users", member.id);
        await updateDoc(userDocRef, { role: newRole });
    };

    const handleDelete = async (memberId) => {
        if (window.confirm("Are you sure? This will delete the user's profile. This action cannot be undone.")) {
            // Note: This only deletes the Firestore record. For a production app,
            // you would need a Cloud Function to delete the actual Firebase Auth user.
            await deleteDoc(doc(db, "users", memberId));
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Member Management</h2>
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-md overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400"><tr><th scope="col" className="px-6 py-3">Name</th><th scope="col" className="px-6 py-3">Email</th><th scope="col" className="px-6 py-3">Role</th><th scope="col" className="px-6 py-3">Joined On</th><th scope="col" className="px-6 py-3">Actions</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan="5" className="text-center p-8">Loading members...</td></tr> : members.map(m => (
                            <tr key={m.id} className="bg-white border-b dark:bg-gray-900 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{m.name}</td><td className="px-6 py-4">{m.email}</td>
                                <td className="px-6 py-4">
                                    <select value={m.role} onChange={(e) => handleRoleChange(m, e.target.value)} className="bg-transparent rounded p-1">
                                        <option value="member">Member</option>
                                        <option value="leader">Leader</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4">{m.createdAt ? m.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
                                <td className="px-6 py-4 flex space-x-2">
                                    <button onClick={() => handleDelete(m.id)} className="p-2 text-gray-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
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

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Financial Reports</h2>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Report Type</label>
                        <select value={reportType} onChange={e => setReportType(e.target.value)} className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800">
                            <option value="activities">Statement of Activities</option>
                            <option value="position">Statement of Financial Position</option>
                            <option value="cashflow">Cash Flow Statement</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Range</label>
                        <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800">
                            <option value="this_month">This Month</option>
                            <option value="last_month">Last Month</option>
                            <option value="this_quarter">This Quarter</option>
                            <option value="this_year">This Year</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fund</label>
                        <select value={fund} onChange={e => setFund(e.target.value)} className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800">
                            <option value="all">All Funds</option>
                            <option value="General Fund">General Fund</option>
                            <option value="Building Fund">Building Fund</option>
                            <option value="Missions">Missions</option>
                        </select>
                    </div>
                </div>
                <div className="mt-4 text-right">
                    <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Print Report</button>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-md">
                {renderReport()}
            </div>
        </div>
    );
}

function StatementOfActivities({ dateRange, fund }) {
    // This component would fetch data based on props. For now, it's a static example.
    const income = { tithes: 150000, buildingFund: 85000, missions: 30000, other: 10000 };
    const expenses = { salaries: 80000, utilities: 25000, ministry: 15000 };
    const totalIncome = Object.values(income).reduce((a, b) => a + b, 0);
    const totalExpenses = Object.values(expenses).reduce((a, b) => a + b, 0);
    const net = totalIncome - totalExpenses;

    return (
        <div>
            <h3 className="text-2xl font-bold text-center mb-2">Statement of Activities (Income Statement)</h3>
            <p className="text-center text-gray-500 mb-8">For {dateRange.replace('_', ' ')}</p>
            <div className="space-y-4">
                <h4 className="font-bold text-lg border-b pb-2">Revenue</h4>
                {Object.entries(income).map(([key, val]) => <div key={key} className="flex justify-between"><span className="capitalize">{key.replace('_', ' ')}</span><span>Ksh {val.toLocaleString()}</span></div>)}
                <div className="flex justify-between font-bold pt-2"><span >Total Revenue</span><span>Ksh {totalIncome.toLocaleString()}</span></div>

                <h4 className="font-bold text-lg border-b pb-2 mt-6">Expenses</h4>
                {Object.entries(expenses).map(([key, val]) => <div key={key} className="flex justify-between"><span className="capitalize">{key}</span><span>Ksh {val.toLocaleString()}</span></div>)}
                <div className="flex justify-between font-bold pt-2"><span>Total Expenses</span><span>Ksh {totalExpenses.toLocaleString()}</span></div>

                <div className={`flex justify-between items-center py-4 mt-6 ${net >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} px-4 rounded-lg`}><span className="font-extrabold text-xl">Net Change in Assets</span><span className={`font-extrabold text-xl ${net >= 0 ? 'text-green-700' : 'text-red-700'}`}>Ksh {net.toLocaleString()}</span></div>
            </div>
        </div>
    );
}

function StatementOfFinancialPosition() {
    // This component would fetch data. For now, it's a static example.
    const assets = { cash: 500000, equipment: 850000, vehicle: 2500000 };
    const liabilities = { loan: 300000 };
    const totalAssets = Object.values(assets).reduce((a, b) => a + b, 0);
    const totalLiabilities = Object.values(liabilities).reduce((a, b) => a + b, 0);
    const equity = totalAssets - totalLiabilities;

    return (
        <div>
            <h3 className="text-2xl font-bold text-center mb-2">Statement of Financial Position (Balance Sheet)</h3>
            <p className="text-center text-gray-500 mb-8">As of {new Date().toLocaleDateString()}</p>
            <div className="space-y-4">
                <h4 className="font-bold text-lg border-b pb-2">Assets</h4>
                {Object.entries(assets).map(([key, val]) => <div key={key} className="flex justify-between"><span className="capitalize">{key}</span><span>Ksh {val.toLocaleString()}</span></div>)}
                <div className="flex justify-between font-bold pt-2"><span>Total Assets</span><span>Ksh {totalAssets.toLocaleString()}</span></div>

                <h4 className="font-bold text-lg border-b pb-2 mt-6">Liabilities</h4>
                {Object.entries(liabilities).map(([key, val]) => <div key={key} className="flex justify-between"><span className="capitalize">{key}</span><span>Ksh {val.toLocaleString()}</span></div>)}
                <div className="flex justify-between font-bold pt-2"><span>Total Liabilities</span><span>Ksh {totalLiabilities.toLocaleString()}</span></div>

                <div className="flex justify-between font-bold text-lg pt-4 mt-4 border-t-2"><span>Net Assets (Equity)</span><span>Ksh {equity.toLocaleString()}</span></div>
            </div>
        </div>
    );
}

function CashFlowStatement() {
    // This component would fetch data. For now, it's a static example.
    const operating = { inflows: 275000, outflows: -120000 };
    const investing = { outflows: -50000 }; // e.g. new equipment
    const financing = { inflows: 100000 }; // e.g. new loan
    const netCashFlow = operating.inflows + operating.outflows + investing.outflows + financing.inflows;

    return (
        <div>
            <h3 className="text-2xl font-bold text-center mb-2">Cash Flow Statement</h3>
            <p className="text-center text-gray-500 mb-8">For This Month</p>
            <div className="space-y-2">
                <div className="flex justify-between font-bold text-lg border-b pb-2"><span>Cash Flow from Operating Activities</span><span>Ksh {(operating.inflows + operating.outflows).toLocaleString()}</span></div>
                <div className="flex justify-between pl-4"><span>Cash Inflows</span><span>Ksh {operating.inflows.toLocaleString()}</span></div>
                <div className="flex justify-between pl-4"><span>Cash Outflows</span><span>(Ksh {(-operating.outflows).toLocaleString()})</span></div>

                <div className="flex justify-between font-bold text-lg border-b pb-2 pt-4"><span>Cash Flow from Investing Activities</span><span>(Ksh {(-investing.outflows).toLocaleString()})</span></div>
                <div className="flex justify-between pl-4"><span>Purchase of Assets</span><span>(Ksh {(-investing.outflows).toLocaleString()})</span></div>
                
                <div className="flex justify-between font-bold text-lg border-b pb-2 pt-4"><span>Cash Flow from Financing Activities</span><span>Ksh {financing.inflows.toLocaleString()}</span></div>
                <div className="flex justify-between pl-4"><span>Loan Proceeds</span><span>Ksh {financing.inflows.toLocaleString()}</span></div>
                
                <div className="flex justify-between font-extrabold text-xl pt-4 mt-4 border-t-2"><span>Net Increase in Cash</span><span>Ksh {netCashFlow.toLocaleString()}</span></div>
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
            // Simulate matching logic
            setMatches([
                { book: bookTransactions[0], bank: bankTransactions[0], status: 'Matched' },
                { book: bookTransactions[1], bank: bankTransactions[1], status: 'Matched' },
            ]);
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Bank Reconciliation</h2>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md">
                <div className="mb-6">
                    <label htmlFor="bank-statement-upload" className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                        <Upload className="h-10 w-10 text-gray-400 mb-2" />
                        <span className="font-semibold">{statement ? statement.name : 'Upload Bank Statement'}</span>
                        <span className="text-sm text-gray-500">CSV or OFX file</span>
                        <input id="bank-statement-upload" type="file" className="hidden" onChange={handleFileUpload} accept=".csv,.ofx" />
                    </label>
                </div>
                {matches.length > 0 && (
                    <div>
                        <h3 className="font-bold text-xl mb-4">Reconciliation Summary</h3>
                        <table className="w-full">
                            <thead className="text-left bg-gray-50 dark:bg-gray-800"><tr><th className="p-2">Book Transaction</th><th className="p-2">Bank Transaction</th><th className="p-2">Status</th></tr></thead>
                            <tbody>
                                {matches.map((m, i) => (
                                    <tr key={i} className="border-b dark:border-gray-700">
                                        <td className="p-2">{m.book.desc} (Ksh {m.book.amount})</td>
                                        <td className="p-2">{m.bank.desc} (Ksh {m.bank.amount})</td>
                                        <td className="p-2"><span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">{m.status}</span></td>
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
            <h2 className="text-3xl font-bold mb-6">Leadership Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md"><h3 className="font-bold text-xl mb-4">Key Financials</h3></div><div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md"><h3 className="font-bold text-xl mb-4">Campaign Progress</h3></div></div>
            <div className="mt-8"><ReportsPage readOnly={true} /></div>
        </div>
    );
}

// --- Member Components ---
function MemberDashboard() {
    const { db, user, userData, appId } = useContext(AppContext);
    const [stats, setStats] = useState({ totalGiving: 0, lastDonation: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchStats = async () => {
            setLoading(true);
            const today = new Date();
            const startOfYear = new Date(today.getFullYear(), 0, 1);

            const donationsQuery = query(
                collection(db, `artifacts/${appId}/public/data/donations`),
                where("userId", "==", user.uid),
                where("date", ">=", startOfYear)
            );

            const querySnapshot = await getDocs(donationsQuery);
            let totalGiving = 0;
            let lastDonationAmount = 0;
            let lastDonationDate = new Date(0);

            querySnapshot.forEach(doc => {
                const data = doc.data();
                totalGiving += data.amount;
                if (data.date.toDate() > lastDonationDate) {
                    lastDonationDate = data.date.toDate();
                    lastDonationAmount = data.amount;
                }
            });

            setStats({ totalGiving, lastDonation: lastDonationAmount });
            setLoading(false);
        };
        fetchStats();
    }, [db, user, appId]);

    if (loading) return <LoadingScreen message="Loading your dashboard..."/>;

    const summaryData = [
        { name: 'Total Giving This Year', value: `Ksh ${stats.totalGiving.toLocaleString()}`, icon: DollarSign, color: 'text-green-500' },
        { name: 'Last Donation', value: `Ksh ${stats.lastDonation.toLocaleString()}`, icon: HandHeart, color: 'text-blue-500' }
    ];

    return (
        <div>
            <h2 className="text-3xl font-bold mb-2">Welcome, {userData.name}!</h2><p className="text-gray-600 dark:text-gray-400 mb-6">Here's a summary of your giving journey.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                {summaryData.map(item => (
                    <motion.div key={item.name} whileHover={{ y: -5 }} className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md flex items-center space-x-4">
                        <div className={`p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 ${item.color}`}><item.icon className="h-6 w-6" /></div>
                        <div><p className="text-sm text-gray-500 dark:text-gray-400">{item.name}</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{item.value}</p></div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function GiveNowPage({ setCurrentPage }) {
    const [step, setStep] = useState(1); // 1: Form, 2: Payment, 3: Success
    const [donationDetails, setDonationDetails] = useState(null);

    const handleFormSubmit = (details) => {
        setDonationDetails(details);
        setStep(2);
    };

    const handlePaymentSuccess = async () => {
        setStep(3);
        // After a delay, redirect to the history page
        setTimeout(() => {
            setCurrentPage('history');
        }, 3000);
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Make a Donation</h2>
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
    const [amount, setAmount] = useState('');
    const [fund, setFund] = useState('Tithes & Offering');
    const [paymentMethod, setPaymentMethod] = useState('M-Pesa');
    const [givingType, setGivingType] = useState('one-time');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ amount, fund, paymentMethod, givingType });
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-md">
            <div className="flex justify-center mb-6 border border-gray-200 dark:border-gray-700 rounded-lg p-1"><button onClick={() => setGivingType('one-time')} className={`w-1/2 py-2 rounded-md ${givingType === 'one-time' ? 'bg-blue-600 text-white' : ''}`}>One-Time</button><button onClick={() => setGivingType('recurring')} className={`w-1/2 py-2 rounded-md ${givingType === 'recurring' ? 'bg-blue-600 text-white' : ''}`}>Recurring</button></div>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount (Ksh)</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" required className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Designate to Fund</label><select value={fund} onChange={(e) => setFund(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800"><option>Tithes & Offering</option><option>Building Fund</option><option>Missions</option><option>Welfare</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</label><div className="flex space-x-4"><button type="button" onClick={() => setPaymentMethod('M-Pesa')} className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${paymentMethod === 'M-Pesa' ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}><Smartphone size={20}/> M-Pesa</button><button type="button" onClick={() => setPaymentMethod('Card')} className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${paymentMethod === 'Card' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}><CreditCard size={20}/> Card</button></div></div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="w-full flex justify-center py-4 px-4 rounded-lg shadow-md text-lg font-bold text-white bg-blue-600 hover:bg-blue-700">Proceed to Payment</motion.button>
            </form>
        </motion.div>
    );
}

function PaymentGateway({ details, onSuccess }) {
    const { db, user, userData, appId } = useContext(AppContext);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleFinalizePayment = async () => {
        setIsSubmitting(true);
        setError('');
        try {
            // Simulate a 2-second payment processing delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // This is where a real payment gateway API call would happen.
            // For this demo, we'll just assume it's successful and save to Firestore.
            
            const collectionName = details.givingType === 'one-time' ? 'donations' : 'recurring_donations';
            await addDoc(collection(db, `artifacts/${appId}/public/data/${collectionName}`), { 
                userId: user.uid, 
                memberName: userData.name, 
                amount: parseFloat(details.amount), 
                fund: details.fund, 
                paymentMethod: details.paymentMethod, 
                type: 'Online', 
                date: Timestamp.now(), 
                status: details.givingType === 'recurring' ? 'active' : 'completed' 
            });
            
            onSuccess();
        } catch (err) { 
            console.error("Error processing donation: ", err); 
            setError("Payment failed. Please try again.");
        } finally { 
            setIsSubmitting(false); 
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-md text-center">
            <h3 className="text-xl font-bold mb-4">Confirm Your Donation</h3>
            <p className="text-2xl font-bold text-blue-600 mb-2">Ksh {parseFloat(details.amount).toLocaleString()}</p>
            <p className="text-gray-500 mb-6">To: {details.fund}</p>

            {details.paymentMethod === 'M-Pesa' && (
                <div className="text-left bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <p className="font-semibold mb-2">M-Pesa Payment</p>
                    <p className="text-sm">A payment request of Ksh {parseFloat(details.amount).toLocaleString()} will be sent to your registered M-Pesa number.</p>
                    <p className="text-sm mt-2">Please enter your PIN on your phone to complete the transaction.</p>
                </div>
            )}

            {details.paymentMethod === 'Card' && (
                <div className="text-left bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
                    <input type="text" placeholder="Card Number" className="w-full p-2 rounded bg-white dark:bg-gray-700" />
                    <div className="flex gap-3">
                        <input type="text" placeholder="MM/YY" className="w-1/2 p-2 rounded bg-white dark:bg-gray-700" />
                        <input type="text" placeholder="CVC" className="w-1/2 p-2 rounded bg-white dark:bg-gray-700" />
                    </div>
                </div>
            )}
            
            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

            <motion.button 
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }} 
                onClick={handleFinalizePayment}
                disabled={isSubmitting} 
                className="w-full mt-6 flex justify-center py-3 px-4 rounded-lg shadow-md text-lg font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400"
            >
                {isSubmitting ? 'Processing...' : `Confirm & Pay Ksh ${parseFloat(details.amount).toLocaleString()}`}
            </motion.button>
        </div>
    );
}

function PaymentSuccess() {
    return (
        <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-md text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }}>
                <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
            </motion.div>
            <h3 className="text-2xl font-bold mb-2">Thank You!</h3>
            <p className="text-gray-600 dark:text-gray-400">Your generous donation has been received.</p>
            <p className="text-sm text-gray-500 mt-4">You will be redirected shortly...</p>
        </div>
    );
}

function GivingHistoryPage() {
    const { db, user, appId } = useContext(AppContext);
    const [donations, setDonations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        // CORRECTED: Added orderBy to let Firestore sort the data efficiently
        const q = query(
            collection(db, `artifacts/${appId}/public/data/donations`), 
            where("userId", "==", user.uid),
            orderBy("date", "desc") // Let Firestore do the sorting
        );
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const userDonations = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // REMOVED: No need to sort on the client anymore
            setDonations(userDonations);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db, user, appId]);

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Your Giving History</h2>
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-md">
                <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                    {loading ? <li className="p-4 text-center">Loading your history...</li> : donations.length === 0 ? <li className="p-4 text-center">You haven't made any donations yet.</li> :
                        donations.map(d => (
                            <li key={d.id} className="p-4 flex justify-between items-center">
                                <div><p className="font-bold text-lg">Ksh {d.amount.toLocaleString()}</p><p className="text-sm text-gray-500">{d.fund}</p></div>
                                <div className="text-right"><p className="font-semibold">{d.date ? d.date.toDate().toLocaleDateString() : 'N/A'}</p><p className="text-sm text-gray-500">{d.paymentMethod}</p></div>
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
            <h2 className="text-3xl font-bold mb-6">Your Profile Settings</h2>
            <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-md">
                <form onSubmit={handleSave} className="space-y-6">
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label><input type="email" value={userData.email} disabled className="w-full px-4 py-3 rounded-lg bg-gray-200 dark:bg-gray-700 cursor-not-allowed" /></div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isSaving || showSuccess} className="w-full flex justify-center py-3 px-4 rounded-lg shadow-md font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400">{isSaving ? 'Saving...' : showSuccess ? 'Saved!' : 'Save Changes'}</motion.button>
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
            <h2 className="text-3xl font-bold mb-6">Bulk Messaging</h2>
            <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-md">
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg"><h4 className="font-bold text-blue-800 dark:text-blue-300">How this works:</h4><p className="text-sm text-blue-700 dark:text-blue-400 mt-1">This form sends a message request to the server. A backend process will then deliver the message as an email to the selected group.</p></div>
                <form onSubmit={handleSend} className="space-y-6">
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recipients</label><select value={recipientGroup} onChange={(e) => setRecipientGroup(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700"><option value="all_members">All Members</option><option value="leaders">Leaders Only</option><option value="admins">Administrators Only</option></select></div>
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject</label><input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter message subject" required className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message Body</label><textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your message here..." required rows="8" className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700" /></div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isSending || showSuccess} className="w-full flex justify-center py-3 px-4 rounded-lg shadow-md font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400">{isSending ? 'Sending...' : showSuccess ? 'Message Sent!' : 'Send Message'}</motion.button>
                    <AnimatePresence>{showSuccess && <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="text-center text-green-600 flex items-center justify-center"><CheckCircle className="h-5 w-5 mr-2" /><span>Your message has been queued for delivery.</span></motion.div>}{error && <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="text-center text-red-600 flex items-center justify-center"><AlertTriangle className="h-5 w-5 mr-2" /><span>{error}</span></motion.div>}</AnimatePresence>
                </form>
            </div>
        </div>
    );
}

// --- NEW PROFESSIONAL-GRADE COMPONENTS ---

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
            <h2 className="text-3xl font-bold mb-6">Manage Pledges</h2>
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-md">
                {loading ? <p>Loading pledges...</p> : pledges.length === 0 ? <p className="p-4">No pledges have been made yet.</p> :
                    pledges.map(p => {
                        const percentage = (p.totalGiven / p.totalPledged) * 100;
                        return (
                            <div key={p.id} className="p-4 border-b dark:border-gray-800 last:border-b-0">
                                <div className="flex justify-between items-center mb-2">
                                    <div>
                                        <h3 className="font-bold">{p.memberName}</h3>
                                        <p className="text-sm text-gray-500">{p.fund}</p>
                                    </div>
                                    <span className="text-sm font-semibold capitalize">{p.frequency}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                                    <motion.div className="h-4 rounded-full bg-green-500" initial={{ width: 0 }} animate={{ width: `${percentage}%` }} />
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span>Ksh {p.totalGiven.toLocaleString()}</span>
                                    <span className="text-gray-500">of Ksh {p.totalPledged.toLocaleString()}</span>
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

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingEvent(null);
    };

    const handleFormSubmit = async (data) => {
        const eventData = {
            ...data,
            date: Timestamp.fromDate(new Date(data.date)),
            capacity: parseInt(data.capacity, 10),
            registered: editingEvent ? editingEvent.registered : 0,
        };
        if (editingEvent) {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/events`, editingEvent.id), eventData);
        } else {
            await addDoc(collection(db, `artifacts/${appId}/public/data/events`), eventData);
        }
        handleModalClose();
    };
    
    const handleDelete = async (id) => {
        if (window.confirm("Delete this event?")) {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/events`, id));
        }
    };

    if (loading) return <LoadingScreen message="Loading events..." />;

    return (
        <div>
            <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-bold">Manage Events</h2><motion.button onClick={() => setIsModalOpen(true)} whileHover={{ scale: 1.05 }} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-md flex items-center space-x-2"><PlusCircle className="h-5 w-5" /><span>Create Event</span></motion.button></div>
            <Modal isOpen={isModalOpen} onClose={handleModalClose} title={editingEvent ? "Edit Event" : "Create New Event"}>
                <EventForm onSubmit={handleFormSubmit} onCancel={handleModalClose} event={editingEvent} />
            </Modal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {events.map(e => (
                    <div key={e.id} className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-xl">{e.name}</h3>
                                <p className="text-gray-500">{e.date.toDate().toLocaleDateString()}</p>
                            </div>
                            <div className="flex space-x-2">
                                <button onClick={() => { setEditingEvent(e); setIsModalOpen(true); }} className="text-gray-400 hover:text-blue-500"><Edit size={18}/></button>
                                <button onClick={() => handleDelete(e.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={18}/></button>
                            </div>
                        </div>
                        <p className="mt-4 font-semibold">{e.registered || 0} / {e.capacity} Registered</p>
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
            setFormData({
                name: event.name,
                date: event.date.toDate().toISOString().split('T')[0],
                capacity: event.capacity
            });
        }
    }, [event]);

    const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div><label>Event Name</label><input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800" /></div>
            <div><label>Date</label><input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800" /></div>
            <div><label>Capacity</label><input type="number" name="capacity" value={formData.capacity} onChange={handleChange} required className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800" /></div>
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-200">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-white bg-blue-600">{event ? 'Save Changes' : 'Create Event'}</button>
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

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingAsset(null);
    };

    const handleFormSubmit = async (data) => {
        const assetData = {
            ...data,
            purchaseDate: Timestamp.fromDate(new Date(data.purchaseDate)),
            value: parseFloat(data.value),
        };
        if (editingAsset) {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/assets`, editingAsset.id), assetData);
        } else {
            await addDoc(collection(db, `artifacts/${appId}/public/data/assets`), assetData);
        }
        handleModalClose();
    };
    
    const handleDelete = async (id) => {
        if (window.confirm("Delete this asset record?")) {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/assets`, id));
        }
    };

    if (loading) return <LoadingScreen message="Loading assets..." />;

    return (
        <div>
            <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-bold">Asset Inventory</h2><motion.button onClick={() => setIsModalOpen(true)} whileHover={{ scale: 1.05 }} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-md flex items-center space-x-2"><PlusCircle className="h-5 w-5" /><span>Add Asset</span></motion.button></div>
            <Modal isOpen={isModalOpen} onClose={handleModalClose} title={editingAsset ? "Edit Asset" : "Add New Asset"}>
                <AssetForm onSubmit={handleFormSubmit} onCancel={handleModalClose} asset={editingAsset} />
            </Modal>
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-md overflow-x-auto">
                <table className="w-full">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800"><tr><th className="px-6 py-3">Asset Name</th><th className="px-6 py-3">Category</th><th className="px-6 py-3">Value (Ksh)</th><th className="px-6 py-3">Purchase Date</th><th className="px-6 py-3">Actions</th></tr></thead>
                    <tbody>
                        {assets.map(a => (
                            <tr key={a.id} className="border-b dark:border-gray-800">
                                <td className="px-6 py-4 font-bold">{a.name}</td>
                                <td className="px-6 py-4">{a.category}</td>
                                <td className="px-6 py-4">{a.value.toLocaleString()}</td>
                                <td className="px-6 py-4">{a.purchaseDate.toDate().toLocaleDateString()}</td>
                                <td className="px-6 py-4 flex space-x-2">
                                    <button onClick={() => { setEditingAsset(a); setIsModalOpen(true); }} className="text-gray-400 hover:text-blue-500"><Edit size={16}/></button>
                                    <button onClick={() => handleDelete(a.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
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
            setFormData({
                name: asset.name,
                category: asset.category,
                value: asset.value,
                purchaseDate: asset.purchaseDate.toDate().toISOString().split('T')[0]
            });
        }
    }, [asset]);

    const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div><label>Asset Name</label><input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800" /></div>
            <div><label>Category</label><select name="category" value={formData.category} onChange={handleChange} className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800"><option>Sound Equipment</option><option>Vehicle</option><option>Building</option><option>Furniture</option><option>Other</option></select></div>
            <div><label>Value (Ksh)</label><input type="number" name="value" value={formData.value} onChange={handleChange} required className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800" /></div>
            <div><label>Purchase Date</label><input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} required className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800" /></div>
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-200">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-white bg-blue-600">{asset ? 'Save Changes' : 'Add Asset'}</button>
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
                <h2 className="text-3xl font-bold">My Pledges</h2>
                <motion.button onClick={() => setIsModalOpen(true)} whileHover={{ scale: 1.05 }} className="bg-green-600 text-white px-5 py-2.5 rounded-lg shadow-md flex items-center space-x-2">
                    <PlusCircle className="h-5 w-5" />
                    <span>Make a New Pledge</span>
                </motion.button>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Make a New Pledge">
                <PledgeForm onSubmit={handleAddPledge} onCancel={() => setIsModalOpen(false)} />
            </Modal>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-md">
                {loading ? <p>Loading pledges...</p> : pledges.length === 0 ? <p className="p-4 text-center">You have not made any pledges yet.</p> :
                    pledges.map(p => {
                        const percentage = p.totalPledged > 0 ? (p.totalGiven / p.totalPledged) * 100 : 0;
                        return (
                            <div key={p.id} className="p-4 border-b dark:border-gray-800 last:border-b-0">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold">{p.fund}</h3>
                                    <span className="text-sm font-semibold capitalize">{p.frequency}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                                    <motion.div className="h-4 rounded-full bg-green-500" initial={{ width: 0 }} animate={{ width: `${percentage}%` }} />
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span>Ksh {p.totalGiven.toLocaleString()} Given</span>
                                    <span className="text-gray-500">of Ksh {p.totalPledged.toLocaleString()}</span>
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

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pledge towards</label>
                <select name="fund" value={formData.fund} onChange={handleChange} className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                    <option>Building Fund</option><option>Missions</option><option>Welfare</option><option>Tithes & Offering</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Amount (Ksh)</label>
                <input type="number" name="totalPledged" value={formData.totalPledged} onChange={handleChange} placeholder="e.g., 120000" required className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frequency</label>
                <select name="frequency" value={formData.frequency} onChange={handleChange} className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                    <option>One-Time</option><option>Weekly</option><option>Monthly</option><option>Annually</option>
                </select>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700">Submit Pledge</button>
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
            <h2 className="text-3xl font-bold mb-6">Upcoming Events</h2>
            <div className="space-y-6">
                {events.map(e => (
                    <div key={e.id} className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md flex justify-between items-center">
                        <div className="flex-grow">
                            <h3 className="font-bold text-xl">{e.name}</h3>
                            <p className="text-gray-500">{e.date.toDate().toLocaleDateString()}</p>
                            <p className="mt-2 text-sm">{e.description || 'No description provided.'}</p>
                        </div>
                        <button className="ml-4 bg-green-600 text-white px-4 py-2 rounded-lg">Register</button>
                    </div>
                ))}
                {events.length === 0 && <div className="text-center p-8 bg-white dark:bg-gray-900 rounded-xl shadow-md"><p>No upcoming events.</p></div>}
            </div>
        </div>
    );
}

function SmallGroupsPage() {
    // This component is kept static for the demo, but could be made dynamic in the same way as Events/Assets.
    const groups = [{ id: 1, name: 'Men\'s Fellowship', leader: 'John K.', meetingTime: 'Saturdays, 8 AM' }, { id: 2, name: 'Young Professionals', leader: 'Sarah M.', meetingTime: 'Wednesdays, 7 PM' }];
    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Find a Small Group</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groups.map(g => <div key={g.id} className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md"><h3 className="font-bold text-xl">{g.name}</h3><p>Leader: {g.leader}</p><p>{g.meetingTime}</p><button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg">Request to Join</button></div>)}
            </div>
        </div>
    );
}