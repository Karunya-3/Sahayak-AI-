import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { AudioWaveform } from './AudioWaveform';
import { WavRecorder } from '../utils/audioRecorder';
import {
  Mic,
  Square,
  Send,
  Volume2,
  VolumeX,
  Trash2,
  Paperclip,
  CheckCircle,
  Clock,
  Sparkles,
  FileText,
  User,
  CheckSquare,
  AlertCircle,
  Copy,
  RotateCcw,
} from 'lucide-react';

export const ChatInterface = () => {
  const {
    currentLanguage,
    currentConversationId,
    setCurrentConversationId,
    refreshConversations,
    isSpeaking,
    playAudio,
    stopSpeaking,
    showToast,
    refreshTasks,
  } = useApp();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activePlayingId, setActivePlayingId] = useState(null);
  const [attachedDocText, setAttachedDocText] = useState(null);
  const [attachedDocName, setAttachedDocName] = useState(null);

  const wavRecorderRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Load conversation when conversationId changes
  useEffect(() => {
    const loadConversation = async () => {
      if (currentConversationId) {
        try {
          const conv = await api.getConversation(currentConversationId);
          if (conv && conv.messages) {
            setMessages(conv.messages);
          }
        } catch (err) {
          console.error('Failed to load conversation:', err);
        }
      } else {
        // Clear message thread for new conversation
        setMessages([
          {
            message_id: 'welcome_msg',
            role: 'assistant',
            content:
              'Namaste! I am Sahayak AI (सहायक). How can I assist you today? You can ask a question, request a translation, manage your to-dos, or upload a document to examine.',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    };
    loadConversation();
  }, [currentConversationId]);

  // Handle Send Message
  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    setInputText('');

    // Optimistic user message
    const tempUserMsg = {
      message_id: `temp_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const res = await api.sendMessage({
        conversationId: currentConversationId,
        message: text,
        language: currentLanguage,
        generateSpeech: true, // Generate Timbre audio by default for voice assistant
        documentContext: attachedDocText,
      });

      if (!currentConversationId && res.conversation_id) {
        setCurrentConversationId(res.conversation_id);
      }

      // Update messages with actual server assistant response
      setMessages((prev) => [
        ...prev.filter((m) => m.message_id !== tempUserMsg.message_id),
        res.user_message,
        res.assistant_message,
      ]);

      // Play audio response automatically if returned
      if (res.audio_base64) {
        setActivePlayingId(res.assistant_message.message_id);
        playAudio(res.audio_base64);
      }

      await refreshConversations();
    } catch (err) {
      console.error('Chat error:', err);
      showToast('Error communicating with assistant. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Voice recording inside chat interface with 16kHz PCM WAV
  const startRecording = async () => {
    if (isSpeaking) stopSpeaking();
    try {
      const recorder = new WavRecorder();
      wavRecorderRef.current = recorder;
      await recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.warn('WavRecorder fallback to MediaRecorder:', err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          await handleTranscribeAndSend(blob);
        };

        recorder.start(250);
        setIsRecording(true);
      } catch (fallbackErr) {
        showToast('Microphone access denied or unavailable', 'error');
        setIsRecording(false);
      }
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);

    if (wavRecorderRef.current && wavRecorderRef.current.recording) {
      try {
        const wavBlob = await wavRecorderRef.current.stop();
        await handleTranscribeAndSend(wavBlob);
      } catch (err) {
        console.error('Error stopping WavRecorder:', err);
        showToast('Error recording audio', 'error');
      }
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleTranscribeAndSend = async (blob) => {
    setIsLoading(true);
    try {
      const sttRes = await api.transcribeAudio(blob, currentLanguage);
      if (sttRes && sttRes.transcript) {
        handleSendMessage(sttRes.transcript);
      } else if (sttRes?.is_mock) {
        showToast(sttRes.error, 'info');
      } else if (sttRes?.error) {
        showToast(`Prisma error: ${sttRes.error}`, 'error');
      } else {
        showToast('No speech detected. Please speak clearly into the mic.', 'info');
      }
    } catch (e) {
      showToast('Speech transcription failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayMessageAudio = async (msg) => {
    if (isSpeaking && activePlayingId === msg.message_id) {
      stopSpeaking();
      setActivePlayingId(null);
      return;
    }

    if (msg.audio_url) {
      setActivePlayingId(msg.message_id);
      playAudio(msg.audio_url);
    } else {
      // Synthesize audio on demand with Timbre
      try {
        const res = await api.synthesizeSpeech({
          text: msg.content.substring(0, 300),
          language: msg.language || currentLanguage,
        });
        if (res.success && res.audio_base64) {
          msg.audio_url = res.audio_base64;
          setActivePlayingId(msg.message_id);
          playAudio(res.audio_base64);
        } else {
          showToast('Could not synthesize speech', 'error');
        }
      } catch (err) {
        showToast('TTS error', 'error');
      }
    }
  };

  const handleClearConversation = async () => {
    if (currentConversationId) {
      await api.deleteConversation(currentConversationId);
      await refreshConversations();
    }
    setCurrentConversationId(null);
    setMessages([
      {
        message_id: 'welcome_msg',
        role: 'assistant',
        content:
          'Namaste! I am Sahayak AI. How can I assist you today? You can ask a question, request a translation, manage your to-dos, or upload a document to examine.',
        timestamp: new Date().toISOString(),
      },
    ]);
    showToast('Conversation cleared', 'info');
  };

  const handleCreateTaskFromAction = async (taskAction) => {
    try {
      await api.createTask({
        task_description: taskAction.task_description,
        due_date: taskAction.due_date || 'Today',
        priority: taskAction.priority || 'medium',
        category: taskAction.category || 'general',
      });
      await refreshTasks();
      showToast(`Task created: "${taskAction.task_description}"`, 'success');
    } catch (err) {
      showToast('Failed to create task', 'error');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-4xl mx-auto px-4 py-4">
      {/* Top Conversation Header */}
      <div className="flex items-center justify-between pb-3 border-b border-warm-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-secondary text-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-charcoal text-sm">AI Assistant</h2>
            <p className="text-[11px] text-charcoal-muted">
              Powered by Gnani Prisma & Evon
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {attachedDocName && (
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-1 rounded-full">
              <FileText className="w-3.5 h-3.5" />
              <span className="truncate max-w-[120px]">{attachedDocName}</span>
              <button
                onClick={() => {
                  setAttachedDocName(null);
                  setAttachedDocText(null);
                }}
                className="text-xs hover:text-red-500 font-bold ml-1"
              >
                ✕
              </button>
            </div>
          )}

          <button
            onClick={handleClearConversation}
            className="flex items-center gap-1 text-xs text-charcoal-subtle hover:text-red-500 px-2 py-1 rounded hover:bg-warm-100 transition-colors"
            title="Clear this conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const taskAction = msg.metadata?.extracted_action?.is_task
            ? msg.metadata.extracted_action
            : null;

          return (
            <div
              key={msg.message_id || Math.random()}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-primary text-white flex-shrink-0 flex items-center justify-center font-bold text-xs shadow-sm mt-0.5">
                  स
                </div>
              )}

              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-sm text-sm ${
                  isUser
                    ? 'bg-primary text-white rounded-br-none'
                    : 'bg-white text-charcoal border border-warm-200 rounded-bl-none'
                }`}
              >
                {/* Message Body */}
                <div className="whitespace-pre-wrap leading-relaxed space-y-1">
                  {msg.content}
                </div>

                {/* Evon Extracted Task Confirmation Card */}
                {!isUser && taskAction && (
                  <div className="mt-3 p-3 rounded-xl bg-warm-50 border border-warm-200 text-xs text-charcoal">
                    <div className="flex items-center gap-1.5 font-semibold text-primary mb-1">
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Task Detected</span>
                    </div>
                    <p className="font-medium">{taskAction.task_description}</p>
                    <p className="text-charcoal-muted text-[11px] mt-0.5">
                      Due: {taskAction.due_date || 'Today'}
                    </p>
                    <button
                      onClick={() => handleCreateTaskFromAction(taskAction)}
                      className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Confirm & Save to Tasks
                    </button>
                  </div>
                )}

                {/* Message Footer Controls */}
                <div
                  className={`mt-2.5 pt-1.5 flex items-center justify-between text-[11px] border-t ${
                    isUser
                      ? 'border-white/20 text-white/80'
                      : 'border-warm-200 text-charcoal-subtle'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {msg.timestamp
                      ? new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Just now'}
                  </span>

                  {!isUser && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePlayMessageAudio(msg)}
                        className="flex items-center gap-1 hover:text-primary transition-colors font-medium p-0.5"
                        title={
                          isSpeaking && activePlayingId === msg.message_id
                            ? 'Stop reading'
                            : 'Read aloud with Timbre TTS'
                        }
                      >
                        {isSpeaking && activePlayingId === msg.message_id ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-primary" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Listen</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                          showToast('Copied to clipboard', 'info');
                        }}
                        className="hover:text-charcoal p-0.5"
                        title="Copy text"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-full bg-warm-200 text-charcoal flex-shrink-0 flex items-center justify-center font-bold text-xs mt-0.5">
                  <User className="w-4 h-4 text-charcoal-muted" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex-shrink-0 flex items-center justify-center font-bold text-xs shadow-sm">
              स
            </div>
            <div className="bg-white border border-warm-200 rounded-2xl rounded-bl-none p-4 shadow-sm text-xs text-charcoal-muted flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
              <span>Sahayak is thinking with Evon...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice / Text Bottom Input Bar */}
      <div className="pt-2 border-t border-warm-200 bg-warm-100">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Mic Button */}
          {isRecording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="w-12 h-12 rounded-2xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md animate-pulse flex-shrink-0"
              title="Stop recording"
            >
              <Square className="w-5 h-5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              disabled={isLoading}
              className="w-12 h-12 rounded-2xl bg-secondary hover:bg-secondary-dark text-primary flex items-center justify-center shadow-sm flex-shrink-0 transition-transform active:scale-95 disabled:opacity-50"
              title="Speak with Prisma STT"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}

          {/* Text Input Field */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask anything, or click mic to speak..."
              disabled={isLoading || isRecording}
              className="w-full bg-white border border-warm-300 rounded-2xl px-4 py-3 text-sm text-charcoal placeholder-charcoal-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading || isRecording}
            className="w-12 h-12 rounded-2xl bg-primary hover:bg-primary-hover disabled:opacity-40 text-white flex items-center justify-center shadow-sm flex-shrink-0 transition-transform active:scale-95"
            title="Send"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
