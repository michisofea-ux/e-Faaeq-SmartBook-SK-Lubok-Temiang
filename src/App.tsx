import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  LogOut, 
  LayoutDashboard, 
  History, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Monitor,
  Users,
  BarChart3,
  TrendingUp,
  Award,
  X,
  Download,
  Filter,
  Trash2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { format, addDays, startOfWeek, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'teacher';
}

interface Booking {
  id: number;
  user_id: number;
  user_name?: string;
  space: string;
  date: string;
  time: string;
  class: string;
  purpose: string;
  created_at: string;
}

// --- Constants ---
const SPACES = ['Pusat Sumber', 'Bilik Tayangan'];
const DAYS = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat'];
const TIME_SLOTS = Array.from({ length: 13 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7;
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

const LOGO_SCHOOL = "https://lh3.googleusercontent.com/d/1ToceRMdkCRh0N0chykIazhK8cEJ9PSuB";
const LOGO_PSS = "https://lh3.googleusercontent.com/d/1iAhO_Bc1BOoM_7N_irCx8TSSTG_Wz7qz";
const BG_IMAGE = "https://lh3.googleusercontent.com/d/1T3ZDqM02Bm_YSCN_xO5KkfAKUWtcHkiC";

// --- Components ---

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6", className)}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className, 
  disabled,
  type = 'button'
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) => {
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200",
    secondary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-600",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

const Input = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="space-y-1">
    <label className="text-sm font-semibold text-gray-700">{label}</label>
    <input
      {...props}
      className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
    />
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [view, setView] = useState<'login' | 'register' | 'dashboard' | 'history' | 'admin'>(user ? (user.role === 'admin' ? 'admin' : 'dashboard') : 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auth Handlers
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        setView(data.user.role === 'admin' ? 'admin' : 'dashboard');
      } else {
        setError(data.error || 'Gagal log masuk');
      }
    } catch (err) {
      console.error('Login fetch error:', err);
      setError('Ralat sambungan ke pelayan. Sila cuba sebentar lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        setView('dashboard');
      } else {
        setError(data.error || 'Gagal mendaftar akaun');
      }
    } catch (err) {
      console.error('Registration fetch error:', err);
      setError('Ralat sambungan ke pelayan. Sila cuba sebentar lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setView('login');
  };

  return (
    <div className="min-h-screen bg-fixed bg-cover bg-center font-sans text-gray-900" style={{ backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.6)), url(${BG_IMAGE})` }}>
      {/* Navbar */}
      {user && (
        <nav className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center gap-3">
                <img src={LOGO_SCHOOL} alt="Logo" className="h-10 w-10 object-contain" referrerPolicy="no-referrer" />
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-emerald-800 leading-tight">e-Faaeq SmartBook</h1>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">SK Lubok Temiang</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-4">
                {user.role === 'admin' ? (
                  <Button variant="ghost" onClick={() => setView('admin')} className={cn(view === 'admin' && "bg-emerald-50 text-emerald-700")}>
                    <LayoutDashboard className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Admin</span>
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" onClick={() => setView('dashboard')} className={cn(view === 'dashboard' && "bg-emerald-50 text-emerald-700")}>
                      <Calendar className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Tempahan</span>
                    </Button>
                    <Button variant="ghost" onClick={() => setView('history')} className={cn(view === 'history' && "bg-emerald-50 text-emerald-700")}>
                      <History className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Sejarah</span>
                    </Button>
                  </>
                )}
                <div className="h-8 w-[1px] bg-gray-200 mx-1" />
                <div className="flex items-center gap-2">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-gray-700">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.role}</p>
                  </div>
                  <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-rose-600 transition-colors">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </nav>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {view === 'login' && (
            <motion.div key="login" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-md mx-auto">
              <Card className="text-center">
                <div className="flex justify-center gap-4 mb-6">
                  <img src={LOGO_SCHOOL} alt="School" className="h-16 w-16 object-contain" referrerPolicy="no-referrer" />
                  <img src={LOGO_PSS} alt="PSS" className="h-16 w-16 object-contain" referrerPolicy="no-referrer" />
                </div>
                <h2 className="text-2xl font-bold text-emerald-800 mb-1">e-Faaeq SmartBook</h2>
                <p className="text-sm text-gray-500 mb-8 font-medium">SK Lubok Temiang</p>
                
                <form onSubmit={handleLogin} className="space-y-4 text-left">
                  <Input label="Email DeLIMa / Username" name="email" type="text" placeholder="email@moe-dl.edu.my" required />
                  <Input label="Kata Laluan" name="password" type="password" placeholder="••••••••" required />
                  {error && <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Memproses...' : 'Log Masuk'}</Button>
                </form>
                
                <p className="mt-6 text-sm text-gray-500">
                  Guru baru? <button onClick={() => setView('register')} className="text-emerald-600 font-bold hover:underline">Daftar di sini</button>
                </p>
              </Card>
            </motion.div>
          )}

          {view === 'register' && (
            <motion.div key="register" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-md mx-auto">
              <Card className="text-center">
                <h2 className="text-2xl font-bold text-emerald-800 mb-1">e-Faaeq SmartBook</h2>
                <p className="text-sm text-gray-500 mb-8 font-medium">Daftar Akaun Guru - SK Lubok Temiang</p>
                
                <form onSubmit={handleRegister} className="space-y-4 text-left">
                  <Input label="Nama Penuh" name="name" type="text" placeholder="Nama mengikut kad pengenalan" required />
                  <Input label="Email DeLIMa" name="email" type="email" placeholder="email@moe-dl.edu.my" required />
                  <Input label="Kata Laluan" name="password" type="password" placeholder="••••••••" required />
                  {error && <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Mendaftar...' : 'Daftar Sekarang'}</Button>
                </form>
                
                <p className="mt-6 text-sm text-gray-500">
                  Sudah ada akaun? <button onClick={() => setView('login')} className="text-emerald-600 font-bold hover:underline">Log masuk</button>
                </p>
              </Card>
            </motion.div>
          )}

          {view === 'dashboard' && user && <TeacherDashboard user={user} />}
          {view === 'history' && user && <TeacherHistory user={user} />}
          {view === 'admin' && user && <AdminDashboard user={user} />}
        </AnimatePresence>
      </main>

      <footer className="py-8 text-center text-gray-500 text-xs">
        <p>Dicipta oleh Guru Perpustakaan dan Media. Pusat Sumber Al-Faaeq. SK Lubok Temiang. © 2026</p>
      </footer>
    </div>
  );
}

// --- Dashboard Components ---

function TeacherDashboard({ user }: { user: User }) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSpace, setSelectedSpace] = useState(SPACES[0]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showBookingModal, setShowBookingModal] = useState<{ time: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchBookings = async () => {
    const res = await fetch(`/api/bookings?date=${selectedDate}&space=${selectedSpace}`);
    const data = await res.json();
    setBookings(data);
  };

  useEffect(() => {
    fetchBookings();
  }, [selectedDate, selectedSpace]);

  const handleBookingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(e.currentTarget);
    
    const payload = {
      user_id: user.id,
      space: selectedSpace,
      date: selectedDate,
      time: showBookingModal?.time,
      class: formData.get('class'),
      purpose: formData.get('purpose'),
    };

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Tempahan berjaya!');
        setTimeout(() => {
          setSuccess('');
          setShowBookingModal(null);
          fetchBookings();
        }, 1500);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Gagal membuat tempahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <Card className="w-full md:w-80 shrink-0">
          <h3 className="text-lg font-bold text-emerald-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Pilihan Tempahan
          </h3>
          <div className="space-y-4">
            <Input label="Tarikh" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} />
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Ruang</label>
              <div className="grid grid-cols-1 gap-2">
                {SPACES.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedSpace(s)}
                    className={cn(
                      "px-4 py-3 rounded-xl border text-left transition-all flex items-center justify-between",
                      selectedSpace === s 
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm" 
                        : "bg-white border-gray-200 text-gray-600 hover:border-emerald-300"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {s === 'Pusat Sumber' ? <BookOpen className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                      <span className="font-medium">{s}</span>
                    </div>
                    {selectedSpace === s && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div className="flex-1 w-full">
          <Card className="overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{selectedSpace}</h3>
                <p className="text-sm text-gray-500">{format(parseISO(selectedDate), 'EEEE, d MMMM yyyy')}</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="flex items-center gap-1 text-emerald-600"><div className="w-3 h-3 bg-emerald-100 rounded" /> Tersedia</span>
                <span className="flex items-center gap-1 text-rose-600"><div className="w-3 h-3 bg-rose-100 rounded" /> Ditempah</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TIME_SLOTS.map(time => {
                const booking = bookings.find(b => b.time === time);
                return (
                  <button
                    key={time}
                    disabled={!!booking}
                    onClick={() => setShowBookingModal({ time })}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all text-left relative group",
                      booking 
                        ? "bg-rose-50 border-rose-100 text-rose-800 cursor-not-allowed" 
                        : "bg-emerald-50/50 border-emerald-100 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-50"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 font-bold">
                        <Clock className="w-4 h-4" /> {time}
                      </div>
                      {booking ? (
                        <span className="text-[10px] bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full uppercase font-bold">Ditempah</span>
                      ) : (
                        <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                    {booking && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold truncate">{booking.purpose}</p>
                        <p className="text-[10px] opacity-70">Oleh: {booking.user_name || 'Guru'}</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {showBookingModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowBookingModal(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md">
              <Card className="relative">
                <button 
                  onClick={() => setShowBookingModal(null)}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-rose-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-bold text-emerald-800 mb-4">Butiran Tempahan</h3>
                <div className="bg-emerald-50 p-4 rounded-xl mb-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Ruang:</span>
                    <span className="font-bold text-emerald-700">{selectedSpace}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tarikh:</span>
                    <span className="font-bold text-emerald-700">{format(parseISO(selectedDate), 'dd/MM/yyyy')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Masa:</span>
                    <span className="font-bold text-emerald-700">{showBookingModal.time}</span>
                  </div>
                </div>

                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <Input label="Nama Guru" value={user.name} readOnly className="bg-gray-100" />
                  <Input label="Kelas" name="class" placeholder="Contoh: 6 Gemilang" required />
                  <Input label="Tujuan" name="purpose" placeholder="Contoh: PdPc Sains" required />
                  
                  {error && <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}
                  {success && <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {success}</div>}
                  
                  <div className="flex gap-3 pt-2">
                    <Button variant="secondary" className="flex-1" onClick={() => setShowBookingModal(null)}>Batal</Button>
                    <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Menyimpan...' : 'Sahkan Tempahan'}</Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TeacherHistory({ user }: { user: User }) {
  const [history, setHistory] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    const res = await fetch(`/api/bookings/history/${user.id}`);
    const data = await res.json();
    setHistory(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [user.id]);

  const handleCancel = async (id: number) => {
    if (window.confirm('Adakah anda pasti ingin membatalkan tempahan ini?')) {
      try {
        const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          fetchHistory();
        }
      } catch (err) {
        alert('Gagal membatalkan tempahan');
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-emerald-800">Sejarah Tempahan</h2>
        <div className="text-sm text-gray-500">Jumlah: {history.length} tempahan</div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-emerald-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-emerald-800 uppercase tracking-wider">Tarikh & Masa</th>
                <th className="px-6 py-4 text-xs font-bold text-emerald-800 uppercase tracking-wider">Ruang</th>
                <th className="px-6 py-4 text-xs font-bold text-emerald-800 uppercase tracking-wider">Kelas</th>
                <th className="px-6 py-4 text-xs font-bold text-emerald-800 uppercase tracking-wider">Tujuan</th>
                <th className="px-6 py-4 text-xs font-bold text-emerald-800 uppercase tracking-wider text-right">Status / Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">Memuatkan data...</td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">Tiada rekod tempahan dijumpai.</td></tr>
              ) : (
                history.map(b => {
                  const isPast = new Date(`${b.date}T${b.time}`) < new Date();
                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-800">{format(parseISO(b.date), 'dd/MM/yyyy')}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {b.time}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          b.space === 'Pusat Sumber' ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"
                        )}>
                          {b.space}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{b.class}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{b.purpose}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {isPast ? (
                            <span className="flex items-center gap-1 text-gray-400 text-xs font-medium"><CheckCircle2 className="w-3 h-3" /> Selesai</span>
                          ) : (
                            <>
                              <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold"><TrendingUp className="w-3 h-3" /> Akan Datang</span>
                              <button 
                                onClick={() => handleCancel(b.id)}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors group"
                                title="Batal Tempahan"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}

function AdminDashboard({ user }: { user: User }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const ITEMS_PER_PAGE = 10;

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const list = [];
    for (let y = 2024; y <= 2055; y++) {
      list.push(y);
    }
    return list;
  }, []);

  const months = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Mac' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Jun' },
    { value: 7, label: 'Julai' },
    { value: 8, label: 'Ogos' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Disember' },
  ];

  const fetchStats = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/stats?month=${selectedMonth}&year=${selectedYear}`);
    const data = await res.json();
    setStats(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, [selectedMonth, selectedYear]);

  const totalPages = Math.ceil((stats?.recentBookings?.length || 0) / ITEMS_PER_PAGE);
  const paginatedBookings = stats?.recentBookings?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Transform daily stats for grouped chart
  const dailyData = useMemo(() => {
    if (!stats?.daily) return [];
    const map = new Map();
    stats.daily.forEach((item: any) => {
      if (!map.has(item.date)) {
        map.set(item.date, { date: item.date, 'Pusat Sumber': 0, 'Bilik Tayangan': 0 });
      }
      map.get(item.date)[item.space] = item.count;
    });
    return Array.from(map.values()).reverse();
  }, [stats?.daily]);

  const yearlyData = useMemo(() => {
    if (!stats?.yearlyTrend) return [];
    const monthNames = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
    const map = new Map();
    
    // Initialize all months
    monthNames.forEach((name, i) => {
      map.set((i + 1).toString().padStart(2, '0'), { month: name, 'Pusat Sumber': 0, 'Bilik Tayangan': 0 });
    });

    stats.yearlyTrend.forEach((item: any) => {
      if (map.has(item.month_num)) {
        map.get(item.month_num)[item.space] = item.count;
      }
    });
    return Array.from(map.values());
  }, [stats?.yearlyTrend]);

  const downloadPDF = async () => {
    const doc = new jsPDF();
    const monthLabel = months.find(m => m.value === selectedMonth)?.label;

    const loadImage = (url: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = url;
      });
    };

    try {
      const [schoolLogo, pssLogo] = await Promise.all([
        loadImage(LOGO_SCHOOL),
        loadImage(LOGO_PSS)
      ]);

      // Add logos
      doc.addImage(schoolLogo, 'PNG', 14, 10, 20, 20);
      doc.addImage(pssLogo, 'PNG', 176, 10, 20, 20);

      doc.setFontSize(16);
      doc.text('Laporan Penggunaan e-Faaeq SmartBook', 40, 20);
      doc.setFontSize(12);
      doc.text(`SK Lubok Temiang`, 40, 28);
      doc.text(`Tempoh: ${monthLabel} ${selectedYear}`, 40, 34);
    } catch (error) {
      console.error('Error loading logos:', error);
      doc.setFontSize(18);
      doc.text('Laporan Penggunaan e-Faaeq SmartBook', 14, 20);
      doc.setFontSize(12);
      doc.text(`SK Lubok Temiang`, 14, 28);
      doc.text(`Tempoh: ${monthLabel} ${selectedYear}`, 14, 34);
    }
    
    doc.text('Ringkasan Penggunaan:', 14, 45);
    const pssTotal = stats?.spaceStats?.find((s: any) => s.space === 'Pusat Sumber')?.count || 0;
    const btTotal = stats?.spaceStats?.find((s: any) => s.space === 'Bilik Tayangan')?.count || 0;
    
    autoTable(doc, {
      startY: 50,
      head: [['Ruang', 'Jumlah Tempahan']],
      body: [
        ['Pusat Sumber', pssTotal],
        ['Bilik Tayangan', btTotal],
        ['Jumlah Keseluruhan', pssTotal + btTotal]
      ],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }
    });

    doc.text('Senarai Tempahan:', 14, (doc as any).lastAutoTable.finalY + 15);
    
    const tableData = stats.recentBookings.map((b: any) => [
      b.user_name,
      b.space,
      `${format(parseISO(b.date), 'dd/MM/yyyy')} (${b.time})`,
      b.purpose
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Guru', 'Ruang', 'Tarikh & Masa', 'Tujuan']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] }
    });

    doc.save(`Laporan_eFaaeq_${monthLabel}_${selectedYear}.pdf`);
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Memuatkan dashboard admin...</div>;

  const pssTotal = stats?.spaceStats?.find((s: any) => s.space === 'Pusat Sumber')?.count || 0;
  const btTotal = stats?.spaceStats?.find((s: any) => s.space === 'Bilik Tayangan')?.count || 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-emerald-800">Dashboard Analitik</h2>
          <p className="text-sm text-gray-500">Laporan Penggunaan SK Lubok Temiang</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
            <Filter className="w-4 h-4 text-emerald-600" />
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-sm font-medium bg-transparent border-none focus:ring-0 cursor-pointer"
            >
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-sm font-medium bg-transparent border-none focus:ring-0 cursor-pointer max-h-40"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          
          <Button onClick={downloadPDF} className="flex items-center gap-2">
            <Download className="w-4 h-4" /> Muat Turun PDF
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-emerald-100 text-sm font-medium mb-1">Pusat Sumber (Total)</p>
              <h4 className="text-4xl font-bold">{pssTotal}</h4>
            </div>
            <div className="p-3 bg-white/20 rounded-2xl">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-none">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-indigo-100 text-sm font-medium mb-1">Bilik Tayangan (Total)</p>
              <h4 className="text-4xl font-bold">{btTotal}</h4>
            </div>
            <div className="p-3 bg-white/20 rounded-2xl">
              <Monitor className="w-6 h-6" />
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-none">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-amber-100 text-sm font-medium mb-1">Pengguna Aktif</p>
              <h4 className="text-4xl font-bold">{stats?.topUsers.length || 0}</h4>
            </div>
            <div className="p-3 bg-white/20 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Trend Chart - Pusat Sumber */}
        <Card>
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" /> Trend Pusat Sumber
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" tickFormatter={(val) => format(parseISO(val), 'dd/MM')} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={(val) => format(parseISO(val as string), 'dd MMMM yyyy')}
                />
                <Bar dataKey="Pusat Sumber" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Daily Trend Chart - Bilik Tayangan */}
        <Card>
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-indigo-600" /> Trend Bilik Tayangan
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" tickFormatter={(val) => format(parseISO(val), 'dd/MM')} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={(val) => format(parseISO(val as string), 'dd MMMM yyyy')}
                />
                <Bar dataKey="Bilik Tayangan" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Yearly Trend Chart */}
      <Card>
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" /> Pelaporan Keseluruhan Tahun {selectedYear}
        </h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="Pusat Sumber" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
              <Bar dataKey="Bilik Tayangan" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-8 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full" />
            <span className="text-sm font-medium">Pusat Sumber</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-indigo-500 rounded-full" />
            <span className="text-sm font-medium">Bilik Tayangan</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Users */}
        <Card>
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" /> Pengunjung Paling Aktif
          </h3>
          <div className="space-y-4">
            {stats.topUsers.map((u: any, i: number) => (
              <div key={u.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                    i === 0 ? "bg-amber-100 text-amber-700" : 
                    i === 1 ? "bg-gray-200 text-gray-700" : 
                    i === 2 ? "bg-orange-100 text-orange-700" : "bg-white text-gray-400"
                  )}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-500">Guru SK Lubok Temiang</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-600">{u.count}</p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Tempahan</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Space Distribution */}
        <Card>
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" /> Agihan Penggunaan Ruang
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Pusat Sumber', value: pssTotal },
                    { name: 'Bilik Tayangan', value: btTotal }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#6366f1" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-8 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span className="text-sm font-medium">Pusat Sumber</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-500 rounded-full" />
                <span className="text-sm font-medium">Bilik Tayangan</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">Aktiviti Terkini</h3>
          <div className="text-xs text-gray-500">
            Menunjukkan {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, stats.recentBookings.length)} daripada {stats.recentBookings.length}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-3">Guru</th>
                <th className="px-6 py-3">Ruang</th>
                <th className="px-6 py-3">Tarikh & Masa</th>
                <th className="px-6 py-3">Tujuan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedBookings.map((b: any) => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                        {b.user_name[0]}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{b.user_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{b.space}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-800">{format(parseISO(b.date), 'dd/MM/yyyy')}</div>
                    <div className="text-[10px] text-gray-400">{b.time}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{b.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="text-xs"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Sebelumnya
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                    currentPage === page 
                      ? "bg-emerald-600 text-white shadow-md" 
                      : "text-gray-500 hover:bg-gray-200"
                  )}
                >
                  {page}
                </button>
              ))}
            </div>

            <Button 
              variant="ghost" 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="text-xs"
            >
              Seterusnya <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

