import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { InputSanitizer } from '../utils/inputSanitizer';
import { AuthMode } from '../types';

const AuthPage: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>(AuthMode.LOGIN);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const { login, signup, loginWithGoogle, error: authError, isAuthenticated } = useAuth();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Validate inputs
    if (!email || !password) {
      setLocalError('Email and password are required');
      return;
    }

    if (authMode === AuthMode.SIGNUP && !name) {
      setLocalError('Name is required for sign up');
      return;
    }

    // Sanitize inputs
    const sanitizedEmail = InputSanitizer.sanitizeEmail(email);
    if (!sanitizedEmail) {
      setLocalError('Please enter a valid email address');
      return;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      if (authMode === AuthMode.LOGIN) {
        await login(sanitizedEmail, password);
      } else {
        const sanitizedName = InputSanitizer.sanitizeText(name, 100);
        await signup(sanitizedEmail, password, sanitizedName);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setLocalError(err.message || `${authMode === AuthMode.LOGIN ? 'Login' : 'Sign up'} failed`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLocalError(null);
    setIsLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      setLocalError(err.message || 'Google login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="flex flex-1 items-center justify-center py-5">
      <div className="flex w-full max-w-6xl flex-1 flex-col lg:flex-row">
        {/* Left Panel */}
        <div className="hidden lg:flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="flex flex-col gap-6 px-4 py-10">
              <div className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-lg" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCbiqgztOEA1EbSyLtWH6G7HlmnOHKa1ljbi8HiI9KAweNr1KoibLz6aMVx5TprOW_xZIXq9WAQCOk9b5ktyGG4sAa7TRkAwz8XbZMQ71ezYhTSZRGFHt6VkXTR1C2jabk829SlC3AxUQwtnyh-DZuSruUusNkgi6566k8yo1d_9lY5tdYn2PRImuI2XXyPacYV7lMSzKNTuoODocyXR2yfzXBPlyV_2qPZk-Cn-c4n2M2dYvh2cvoreCVZz_rx0_tobQJx9UGD_YQ")'}}></div>
              <div className="flex flex-col gap-2 text-left">
                <h1 className="text-slate-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                  Effortless Lesson Planning, Powered by AI.
                </h1>
                <h2 className="text-slate-600 dark:text-slate-400 text-base font-normal leading-normal">
                  Save time, inspire students, and align with standards. Join the future of education today.
                </h2>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
          <div className="flex w-full max-w-md flex-col gap-6 rounded-xl bg-white dark:bg-[#111722] p-6 sm:p-8 shadow-sm">
            <div className="flex flex-wrap justify-between gap-3">
              <p className="text-slate-900 dark:text-white text-3xl font-black leading-tight tracking-[-0.033em] min-w-72">Welcome Back</p>
            </div>
            
            <div className="flex">
              <div className="flex h-10 flex-1 items-center justify-center rounded-lg bg-slate-200 dark:bg-[#232f48] p-1">
                <button
                  onClick={() => setAuthMode(AuthMode.LOGIN)}
                  className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-2 text-sm font-medium leading-normal ${authMode === AuthMode.LOGIN ? 'bg-white dark:bg-[#101622] shadow-[0_1px_3px_rgba(0,0,0,0.1)] text-slate-900 dark:text-white' : 'text-slate-500 dark:text-[#92a4c9]'}`}
                >
                  Log In
                </button>
                 <button
                  onClick={() => setAuthMode(AuthMode.SIGNUP)}
                  className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-2 text-sm font-medium leading-normal ${authMode === AuthMode.SIGNUP ? 'bg-white dark:bg-[#101622] shadow-[0_1px_3px_rgba(0,0,0,0.1)] text-slate-900 dark:text-white' : 'text-slate-500 dark:text-[#92a4c9]'}`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              {displayError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm font-medium flex items-start gap-3">
                  <span className="material-symbols-outlined flex-shrink-0 text-lg">error</span>
                  <span>{displayError}</span>
                </div>
              )}
              {authMode === AuthMode.SIGNUP && (
                <label className="flex flex-col w-full">
                  <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">Full Name</p>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-300 dark:border-[#324467] bg-white dark:bg-[#192233] focus:border-primary dark:focus:border-primary h-12 placeholder:text-slate-400 dark:placeholder:text-[#92a4c9] p-[15px] text-base font-normal leading-normal" 
                    placeholder="Enter your name"
                    disabled={isLoading}
                  />
                </label>
              )}
              <label className="flex flex-col w-full">
                <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">Email Address</p>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-300 dark:border-[#324467] bg-white dark:bg-[#192233] focus:border-primary dark:focus:border-primary h-12 placeholder:text-slate-400 dark:placeholder:text-[#92a4c9] p-[15px] text-base font-normal leading-normal" 
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </label>
              <label className="flex flex-col w-full">
                <div className="flex justify-between items-center pb-2">
                  <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal">Password</p>
                  {authMode === AuthMode.LOGIN && <a href="#" className="text-primary text-sm font-medium hover:underline">Forgot Password?</a>}
                </div>
                <div className="flex w-full flex-1 items-stretch rounded-lg">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg rounded-r-none border-r-0 text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-300 dark:border-[#324467] bg-white dark:bg-[#192233] focus:border-primary dark:focus:border-primary h-12 placeholder:text-slate-400 dark:placeholder:text-[#92a4c9] p-[15px] text-base font-normal leading-normal" 
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-500 dark:text-[#92a4c9] flex border border-slate-300 dark:border-[#324467] bg-white dark:bg-[#192233] items-center justify-center pr-[15px] rounded-r-lg border-l-0 focus:outline-0 focus:ring-2 focus:ring-primary"
                    disabled={isLoading}
                  >
                    <span className="material-symbols-outlined text-base">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
                {authMode === AuthMode.SIGNUP && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Minimum 8 characters</p>
                )}
              </label>

              <button 
                type="submit" 
                disabled={isLoading}
                className="flex min-w-[84px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-light dark:focus:ring-offset-background-dark focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin mr-2">refresh</span>
                    {authMode === AuthMode.LOGIN ? 'Logging in...' : 'Signing up...'}
                  </>
                ) : (
                  authMode === AuthMode.LOGIN ? 'Log In' : 'Sign Up'
                )}
              </button>
            </form>

            <div className="flex items-center gap-4">
              <hr className="flex-1 border-t border-slate-200 dark:border-slate-700"/>
              <p className="text-xs text-slate-500 dark:text-slate-400">OR</p>
              <hr className="flex-1 border-t border-slate-200 dark:border-slate-700"/>
            </div>

            <button 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-3 min-w-[84px] w-full cursor-pointer overflow-hidden rounded-lg h-12 px-5 bg-white dark:bg-[#192233] text-slate-900 dark:text-white text-base font-medium leading-normal border border-slate-300 dark:border-[#324467] hover:bg-slate-50 dark:hover:bg-[#232f48] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-light dark:focus:ring-offset-background-dark focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g clipPath="url(#clip0_303_76)"><path d="M21.9999 12.24C21.9999 11.43 21.9299 10.64 21.7999 9.87H12.2399V14.3H17.7799C17.5299 15.69 16.8299 16.86 15.8199 17.56V20.12H19.3499C20.9999 18.63 21.9999 16.14 21.9999 12.24Z" fill="#4285F4"></path><path d="M12.2399 22.0001C15.2599 22.0001 17.7499 21.0101 19.3499 19.4101L15.8199 16.8501C14.8199 17.5501 13.5999 18.0001 12.2399 18.0001C9.60988 18.0001 7.37988 16.2001 6.59988 13.8401L3.06988 16.4001C4.66988 19.6901 8.13988 22.0001 12.2399 22.0001Z" fill="#34A853"></path><path d="M6.5999 13.84C6.3799 13.17 6.2499 12.46 6.2499 11.73C6.2499 11 6.3799 10.29 6.5899 9.62V7.06L3.0599 4.5C2.1599 6.36 1.6399 8.47 1.6399 10.73C1.6399 13 2.1599 15.11 3.0599 16.97L6.5999 13.84Z" fill="#FBBC05"></path><path d="M12.2399 5.48C13.7399 5.48 15.1099 6.01 16.1999 6.99L19.4199 3.77C17.7399 2.17 15.2599 1.18 12.2399 1.18C8.1399 1.18 4.6699 3.49 3.0699 6.78L6.5999 9.34C7.3799 6.98 9.6099 5.48 12.2399 5.48Z" fill="#EA4335"></path></g><defs><clipPath id="clip0_303_76"><rect fill="white" height="21.12" transform="translate(1.63989 1.18005)" width="21.12"></rect></clipPath></defs></svg>
                  <span className="truncate">Continue with Google</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;