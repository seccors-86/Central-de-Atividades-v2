import React, { useState } from "react";
import { authService } from "../services/auth";
import { mfaService } from '../services/mfa';
import { Loader2, LogIn, KeyRound, Phone, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [loginField, setLoginField] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'password' | 'challenge' | 'setup' | 'recovery-codes'>('password');
  const [mfaCode, setMfaCode] = useState('');
  const [setupData, setSetupData] = useState<{ qrCodeDataUrl: string; manualKey: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  // Recovery modal
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryField, setRecoveryField] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginField || !password) {
      setError("Preencha o CPF/Telefone e a senha.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      // Remove formatting (only digits)
      const cleanLogin = loginField.replace(/\D/g, "");
      const result = await authService.login(cleanLogin, password);
      if (result.mfaRequired) {
        setStage('challenge');
      } else if (result.mfaSetupRequired) {
        setSetupData(await mfaService.beginSetup());
        setStage('setup');
      } else {
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Erro ao realizar login. Verifique suas credenciais.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setIsLoading(true);
    try { await authService.verifyMfa(mfaCode); onLoginSuccess(); }
    catch (err: any) { setError(err.message || 'Código inválido.'); }
    finally { setIsLoading(false); }
  };

  const handleMfaSetup = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setIsLoading(true);
    try {
      const result = await mfaService.confirmSetup(mfaCode);
      setRecoveryCodes(result.recoveryCodes || []);
      setStage('recovery-codes');
    } catch (err: any) { setError(err.message || 'Código inválido.'); }
    finally { setIsLoading(false); }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('Por segurança, a recuperação automática está desativada. Contate um administrador do NUVYO.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8f9fb] via-[#f0f4f8] to-[#e8eef4] p-4 relative overflow-hidden">
      {/* Background decorative circles */}
      <div className="absolute top-[-80px] left-[-80px] w-[320px] h-[320px] bg-[#0E1116]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] right-[-80px] w-[320px] h-[320px] bg-[#374A67]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#0E1116] via-[#2B3C57] to-[#374A67]" />

          <div className="p-8">
            {/* Logo + Title */}
            <div className="flex flex-col items-center mb-8">
              <img
                src={`${import.meta.env.BASE_URL}nuvyo.png`}
                alt="NUVYO - Gestão Inteligente"
                className="w-64 max-w-full h-auto object-contain mb-3"
              />
              <span className="sr-only">NUVYO - Gestão Inteligente</span>
              <p className="text-sm text-[#6b7280] mt-1 font-medium">
                Acesse com seu CPF ou Telefone
              </p>
            </div>

            {/* Form */}
            {stage === 'password' && <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#374151] uppercase tracking-wider mb-1.5">
                  CPF ou Telefone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={loginField}
                    onChange={(e) => setLoginField(e.target.value)}
                    placeholder="Digite seu CPF ou telefone"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0E1116]/30 focus:border-[#0E1116] transition-all bg-[#f9fafb] placeholder-gray-400"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#374151] uppercase tracking-wider mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0E1116]/30 focus:border-[#0E1116] transition-all bg-[#f9fafb] placeholder-gray-400"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm animate-fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#0E1116] to-[#374A67] text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:from-[#080A0D] hover:to-[#2B3C57] transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                {isLoading ? "Entrando..." : "Entrar"}
              </button>
            </form>}

            {stage === 'challenge' && <form onSubmit={handleMfaVerify} className="space-y-4">
              <div className="text-center"><h2 className="font-bold text-lg">Verificação em duas etapas</h2><p className="text-sm text-gray-500 mt-1">Digite o código do seu aplicativo autenticador ou um código de recuperação.</p></div>
              <input value={mfaCode} onChange={e => setMfaCode(e.target.value)} autoFocus autoComplete="one-time-code" placeholder="000000 ou código de recuperação"
                className="w-full px-4 py-3 border rounded-xl text-center tracking-widest" />
              {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
              <button disabled={isLoading} className="w-full py-3 bg-[#0E1116] text-white font-bold rounded-xl">{isLoading ? 'Verificando...' : 'Verificar'}</button>
              <button type="button" onClick={() => { setStage('password'); setMfaCode(''); setError(null); }} className="w-full text-sm text-gray-500">Voltar</button>
            </form>}

            {stage === 'setup' && setupData && <form onSubmit={handleMfaSetup} className="space-y-4 text-center">
              <h2 className="font-bold text-lg">Ative seu autenticador</h2>
              <p className="text-sm text-gray-500">Escaneie com Microsoft Authenticator, Google Authenticator, 1Password, Authy ou Duo.</p>
              <img src={setupData.qrCodeDataUrl} alt="QR Code MFA" className="w-48 h-48 mx-auto border rounded-xl" />
              <details className="text-xs text-gray-500"><summary>Não consigo escanear</summary><code className="block break-all mt-2 select-all">{setupData.manualKey}</code></details>
              <input value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus autoComplete="one-time-code" placeholder="Código de 6 dígitos"
                className="w-full px-4 py-3 border rounded-xl text-center tracking-[0.4em]" />
              {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
              <button disabled={isLoading || mfaCode.length !== 6} className="w-full py-3 bg-[#0E1116] text-white font-bold rounded-xl disabled:opacity-50">Confirmar e ativar</button>
            </form>}

            {stage === 'recovery-codes' && <div className="space-y-4 text-center">
              <h2 className="font-bold text-lg">Guarde seus códigos de recuperação</h2>
              <p className="text-sm text-gray-500">Cada código funciona uma única vez. Guarde-os em um gerenciador de senhas.</p>
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl font-mono text-xs select-all">{recoveryCodes.map(code => <code key={code}>{code}</code>)}</div>
              <button onClick={onLoginSuccess} className="w-full py-3 bg-[#0E1116] text-white font-bold rounded-xl">Já guardei os códigos</button>
            </div>}

            {/* Recovery link */}
            {stage === 'password' && <div className="mt-5 text-center">
              <button
                onClick={() => {
                  setIsRecoveryOpen(true);
                  setRecoverySuccess(null);
                  setRecoveryError(null);
                  setRecoveryField("");
                }}
                className="text-sm text-[#0E1116] hover:text-[#374A67] font-semibold transition-colors underline-offset-2 hover:underline"
              >
                Esqueci minha senha
              </button>
            </div>}

            {/* HMG Tag */}
            <div className="mt-6 flex items-center justify-center">
              <span className="px-3 py-1 bg-orange-50 border border-orange-200 rounded-full text-xs font-bold text-[#374A67] tracking-widest uppercase">
                Ambiente de Homologação
              </span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          NUVYO - Gestão Inteligente © {new Date().getFullYear()}
        </p>
      </div>

      {/* Recovery Modal */}
      {isRecoveryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#374A67] to-[#4A6286]" />
            <div className="p-6">
              <h3 className="text-lg font-bold text-[#1f2937] mb-1">Recuperar Senha</h3>
              <p className="text-sm text-gray-500 mb-5">
                Por segurança, senhas e MFA não são redefinidos automaticamente por CPF ou telefone. Contate um administrador do NUVYO.
              </p>

              <form onSubmit={handleRecover} className="space-y-3">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={recoveryField}
                    onChange={(e) => setRecoveryField(e.target.value)}
                    placeholder="CPF ou Telefone"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#374A67]/30 focus:border-[#374A67] transition-all bg-[#f9fafb] placeholder-gray-400"
                  />
                </div>

                {recoveryError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{recoveryError}</span>
                  </div>
                )}

                {recoverySuccess && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl text-green-700 text-sm">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{recoverySuccess}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsRecoveryOpen(false)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isRecovering || !!recoverySuccess}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#374A67] text-white rounded-xl text-sm font-bold hover:bg-[#2B3C57] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isRecovering ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {isRecovering ? "Redefinindo..." : "Redefinir Senha"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
