import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('hi-IN');
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | assistant | documents | tasks | translate
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [pendingTaskConfirmation, setPendingTaskConfirmation] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [systemHealth, setSystemHealth] = useState(null);
  const [toasts, setToasts] = useState([]);

  const audioRef = useRef(new Audio());

  // Show Toast notification
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Audio Playback controls
  const playAudio = (audioSrc) => {
    if (!audioSrc) return;
    try {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = audioSrc;
      setIsSpeaking(true);
      audioRef.current.play().catch((err) => {
        console.warn('Audio play error:', err);
        setIsSpeaking(false);
      });
      audioRef.current.onended = () => setIsSpeaking(false);
      audioRef.current.onerror = () => setIsSpeaking(false);
    } catch (e) {
      console.error('Audio playback failed', e);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    try {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    } catch (e) {
      console.error('Stop speaking error', e);
    }
  };

  // Load initial system data
  const loadInitialData = async () => {
    try {
      const [healthRes, tasksRes, convsRes] = await Promise.allSettled([
        api.getHealth(),
        api.getTasks(),
        api.getConversations(),
      ]);

      if (healthRes.status === 'fulfilled') setSystemHealth(healthRes.value);
      if (tasksRes.status === 'fulfilled') setTasks(tasksRes.value || []);
      if (convsRes.status === 'fulfilled') setConversations(convsRes.value || []);
    } catch (err) {
      console.warn('Initial data load warning:', err);
    }
  };

  const refreshTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(data || []);
    } catch (err) {
      console.error('Failed to refresh tasks:', err);
    }
  };

  const refreshConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data || []);
    } catch (err) {
      console.error('Failed to refresh conversations:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentLanguage,
        setCurrentLanguage,
        activeTab,
        setActiveTab,
        conversations,
        setConversations,
        currentConversationId,
        setCurrentConversationId,
        tasks,
        setTasks,
        pendingTaskConfirmation,
        setPendingTaskConfirmation,
        isSpeaking,
        playAudio,
        stopSpeaking,
        showToast,
        systemHealth,
        refreshTasks,
        refreshConversations,
      }}
    >
      {children}

      {/* Floating Toast notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all transform animate-in slide-in-from-bottom duration-200 flex items-center justify-between ${
              toast.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-white text-charcoal border-warm-300'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="ml-3 text-xs opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
