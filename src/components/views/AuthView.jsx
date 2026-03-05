// /src/components/views/AuthView.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LogIn, UserPlus, Mail, Lock, MailCheck, Beaker, Chrome, Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { getThemeForCategory } from '../../utils/helpers';

export default function AuthView() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [isResetMode, setIsResetMode] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    const {
        currentUser, login, signup, resetPassword, loginWithGoogle,
        loginAsGuest, loadingAuth
    } = useAuth();

    const navigate = useNavigate();

    // Redirección si ya está auntenticado
    useEffect(() => {
        if (currentUser) {
            navigate('/dashboard', { replace: true });
        }
    }, [currentUser, navigate]);

    const { darkMode } = useAppContext();

    const handleAuth = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        try {
            if (isResetMode) {
                await resetPassword(email);
                setResetSent(true);
            } else if (isLogin) {
                await login(email, password);
            } else {
                await signup(email, password);
            }
        } catch (error) {
            if (error.code === 'auth/invalid-credential') setErrorMsg('Credenciales incorrectas');
            else if (error.code === 'auth/email-already-in-use') setErrorMsg('El correo ya está registrado');
            else if (error.code === 'auth/weak-password') setErrorMsg('La contraseña es muy débil (Mínimo 6 carácteres)');
            else if (error.code === 'auth/invalid-email') setErrorMsg('El formato del correo es inválido');
            else setErrorMsg(error.message);
        }
    };

    const handleGoogleLogin = async () => {
        setErrorMsg('');
        try {
            await loginWithGoogle();
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/unauthorized-domain') {
                setErrorMsg('Dominio no autorizado por Google. Ingresa desde http://localhost:4173/ en lugar de 127.0.0.1');
            } else if (error.code === 'auth/popup-closed-by-user') {
                setErrorMsg('Inicio de sesión cancelado.');
            } else {
                setErrorMsg('Error de Google: ' + error.message);
            }
        }
    };

    const handleGuestLogin = async () => {
        setErrorMsg('');
        try {
            await loginAsGuest();
        } catch (error) {
            console.error(error);
            setErrorMsg('Error de invitado: ' + error.message);
        }
    };

    const currentTheme = getThemeForCategory('IPA');

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 bg-slate-950 font-sans ${darkMode ? 'dark' : ''}`}>
            {/* Fondo Animado Decorativo */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-8 md:p-12 rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10">

                <div className="text-center mb-10">
                    <div className={`mx-auto w-24 h-24 ${currentTheme.bg} rounded-3xl mb-6 flex items-center justify-center shadow-lg border border-white/20 transform rotate-3 hover:rotate-6 transition-transform duration-300`}>
                        <Beaker size={48} className={currentTheme.text} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-2">BrewMaster</h1>
                    <p className="text-slate-400 font-medium">Software Profesional Cervecero</p>
                </div>

                {errorMsg && (
                    <div className="bg-red-900/30 border border-red-800/50 text-red-400 p-4 rounded-xl mb-6 text-center font-bold text-sm shadow-inner">
                        {errorMsg}
                    </div>
                )}

                {resetSent ? (
                    <div className="bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 p-6 rounded-2xl mb-6 text-center flex flex-col items-center">
                        <MailCheck size={48} className="mb-4 text-emerald-500" />
                        <h3 className="font-black text-xl mb-2">Correo Enviado</h3>
                        <p className="text-sm font-medium mb-6">Revisa tu bandeja de entrada o la carpeta de SPAM para restablecer tu contraseña.</p>
                        <button
                            onClick={() => { setIsResetMode(false); setResetSent(false); setErrorMsg(''); }}
                            className="text-emerald-300 hover:text-white font-bold underline"
                        >
                            Volver al inicio de sesión
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleAuth} className="space-y-5">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Correo Electrónico</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-700 text-white rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all placeholder:text-slate-600 font-medium"
                                    placeholder="maestro@cerveceria.com"
                                    required
                                />
                            </div>
                        </div>

                        {!isResetMode && (
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-700 text-white rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all placeholder:text-slate-600 font-medium"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loadingAuth}
                            className={`w-full ${currentTheme.badge} text-white font-black py-4 rounded-2xl transition-transform hover:-translate-y-1 active:translate-y-0 shadow-lg flex justify-center items-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {loadingAuth ? <Loader2 size={24} className="animate-spin" /> : (
                                isResetMode ? <MailCheck size={24} /> : (isLogin ? <LogIn size={24} /> : <UserPlus size={24} />)
                            )}
                            {loadingAuth ? 'Procesando...' : (
                                isResetMode ? 'Enviar Link de Recuperación' : (isLogin ? 'Ingresar a la Fábrica' : 'Crear Cuenta Cervecera')
                            )}
                        </button>
                    </form>
                )}

                <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col gap-4">
                    {isResetMode ? (
                        <button
                            type="button"
                            onClick={() => { setIsResetMode(false); setErrorMsg(''); }}
                            className="text-slate-400 hover:text-white text-sm font-bold transition-colors"
                        >
                            Oh, recordé mi contraseña. <span className="text-amber-500 group-hover:underline">Volver atraś.</span>
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={loadingAuth}
                                className="w-full bg-white text-slate-900 hover:bg-gray-100 font-black py-3.5 rounded-2xl transition-all shadow-md flex justify-center items-center gap-3 disabled:opacity-50"
                            >
                                <Chrome size={20} /> Continuar con Google
                            </button>
                            <button
                                type="button"
                                onClick={handleGuestLogin}
                                disabled={loadingAuth}
                                className="w-full bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold py-3.5 rounded-2xl transition-all shadow-sm border border-slate-700 disabled:opacity-50"
                            >
                                Probar sin registrarse (Invitado)
                            </button>

                            <div className="flex flex-col gap-3 mt-4 text-center">
                                <button
                                    onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}
                                    className="text-slate-400 hover:text-white text-sm font-bold transition-colors"
                                >
                                    {isLogin ? '¿No tienes cuenta? Registrate aquí.' : '¿Ya eres Maestro? Inicia Sesión.'}
                                </button>
                                {isLogin && (
                                    <button
                                        onClick={() => { setIsResetMode(true); setErrorMsg(''); }}
                                        className="text-slate-500 hover:text-amber-400 text-xs font-bold transition-colors uppercase tracking-wider underline underline-offset-4"
                                    >
                                        Olvidé mi contraseña
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
