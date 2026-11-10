import React from 'react';
import { useApp } from '../context/AppContext';
import { VoiceInteractionArea } from './VoiceInteractionArea';
import {
  Sparkles,
  FileText,
  Languages,
  CheckSquare,
  ArrowRight,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { api } from '../services/api';

export const Dashboard = () => {
  const {
    setActiveTab,
    setCurrentConversationId,
    tasks,
    refreshTasks,
    conversations,
    showToast,
  } = useApp();

  const handleVoiceQuery = (query) => {
    // Navigate to Assistant with the query preloaded
    setActiveTab('assistant');
  };

  const handleQuickAction = (tabId) => {
    setActiveTab(tabId);
  };

  const handleToggleTask = async (task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await api.updateTask(task.task_id, { status: newStatus });
      await refreshTasks();
      showToast(newStatus === 'completed' ? 'Task marked as completed!' : 'Task reopened', 'success');
    } catch (err) {
      showToast('Failed to update task', 'error');
    }
  };

  // Filter tasks for today or pending
  const pendingTasks = tasks.filter((t) => t.status !== 'completed').slice(0, 4);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      {/* Welcoming Headline */}
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-primary text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multilingual Voice AI for Everyday Life</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-charcoal tracking-tight">
          Your day, made simpler.
        </h1>
        <p className="text-charcoal-muted text-base md:text-lg max-w-xl mx-auto">
          Speak naturally. I'll help you figure things out.
        </p>
      </div>

      {/* Hero Voice Interaction Area */}
      <div className="py-2">
        <VoiceInteractionArea
          onQuerySubmitted={(query) => {
            // When user speaks on dashboard, jump into assistant with prompt
            setActiveTab('assistant');
          }}
        />
      </div>

      {/* Four Quick Feature Cards */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal-subtle px-1">
          Explore What Sahayak Can Do
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Ask Sahayak */}
          <div
            onClick={() => handleQuickAction('assistant')}
            className="card-soft card-soft-hover p-5 rounded-2xl cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-charcoal text-base mb-1 group-hover:text-primary transition-colors">
                Ask Sahayak
              </h3>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Ask any question, understand electricity bills, or request advice in your mother tongue.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
              <span>Start speaking</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Understand a Document */}
          <div
            onClick={() => handleQuickAction('documents')}
            className="card-soft card-soft-hover p-5 rounded-2xl cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-charcoal text-base mb-1 group-hover:text-emerald-600 transition-colors">
                Understand a Document
              </h3>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Upload PDFs, bills, bank statements, or scanned notices for smart OCR and instant explanations.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <span>Upload document</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Translate Text */}
          <div
            onClick={() => handleQuickAction('translate')}
            className="card-soft card-soft-hover p-5 rounded-2xl cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Languages className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-charcoal text-base mb-1 group-hover:text-purple-600 transition-colors">
                Translate & Draft
              </h3>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Draft polite emails, WhatsApp messages, or translate between Telugu, Hindi, and English.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-purple-600">
              <span>Draft a message</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: Manage Tasks */}
          <div
            onClick={() => handleQuickAction('tasks')}
            className="card-soft card-soft-hover p-5 rounded-2xl cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CheckSquare className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-charcoal text-base mb-1 group-hover:text-amber-600 transition-colors">
                Manage Tasks
              </h3>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Say "Remind me to pay bills on Monday" and let Sahayak automatically schedule your to-dos.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-amber-600">
              <span>View to-dos</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Bottom Section: Upcoming Tasks Preview & Recent Conversations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Today's Tasks Preview */}
        <div className="card-soft p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-charcoal text-base">Today's & Upcoming Tasks</h3>
              </div>
              <button
                onClick={() => setActiveTab('tasks')}
                className="text-xs font-semibold text-primary hover:underline"
              >
                View all ({tasks.length})
              </button>
            </div>

            {pendingTasks.length === 0 ? (
              <div className="py-8 text-center text-charcoal-subtle">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs text-charcoal-muted mt-1">
                  Tell Sahayak: "Remind me to buy groceries tomorrow" to add a task.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingTasks.map((task) => (
                  <div
                    key={task.task_id}
                    onClick={() => handleToggleTask(task)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-warm-50 cursor-pointer transition-colors border border-transparent hover:border-warm-200"
                  >
                    <Circle className="w-4 h-4 text-charcoal-subtle flex-shrink-0 mt-0.5 hover:text-emerald-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-charcoal truncate">
                        {task.task_description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-charcoal-muted">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {task.due_date || 'No due date'}
                        </span>
                        {task.category && task.category !== 'general' && (
                          <span className="px-1.5 py-0.2 bg-warm-200 rounded text-[10px] uppercase font-semibold text-charcoal">
                            {task.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-warm-200">
            <button
              onClick={() => setActiveTab('tasks')}
              className="w-full text-center text-xs font-semibold text-charcoal-muted hover:text-primary transition-colors"
            >
              + Add a new task or reminder
            </button>
          </div>
        </div>

        {/* Recent Activity / Example Voice Commands */}
        <div className="card-soft p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-charcoal text-base">Example Everyday Questions</h3>
            </div>
            <p className="text-xs text-charcoal-muted mb-3">
              You can ask in English, Hindi, or Telugu. Try saying:
            </p>

            <div className="space-y-2">
              {[
                { en: 'Explain this electricity bill.', hi: 'इस बिजली के बिल को समझाइए।' },
                { en: 'Translate this message into Telugu.', hi: 'ఈ సందేశాన్ని తెలుగులోకి అనువదించండి.' },
                { en: 'Help me write an email requesting leave.', hi: 'छुट्टी के लिए औपचारिक ईमेल लिखने में मदद करें।' },
                { en: 'What should I complete today?', hi: 'आज मुझे कौन से काम पूरे करने हैं?' },
              ].map((ex, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setActiveTab('assistant');
                  }}
                  className="p-2.5 rounded-xl bg-warm-50 hover:bg-secondary/40 border border-warm-200 text-xs cursor-pointer transition-colors"
                >
                  <p className="font-medium text-charcoal">"{ex.en}"</p>
                  <p className="text-[11px] text-charcoal-muted mt-0.5">{ex.hi}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-warm-200 text-center">
            <span className="text-[11px] text-charcoal-subtle">
              Powered by Gnani Prisma (STT), Evon (LLM), and Timbre (TTS)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
