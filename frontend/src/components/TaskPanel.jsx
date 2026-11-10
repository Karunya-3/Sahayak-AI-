import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  CheckSquare,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  Circle,
  AlertCircle,
  Tag,
  Mic,
  Loader2,
} from 'lucide-react';

export const TaskPanel = () => {
  const { currentLanguage, tasks, refreshTasks, showToast, isSpeaking, stopSpeaking } = useApp();

  const [filter, setFilter] = useState('all'); // all | pending | completed
  const [taskDescription, setTaskDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Natural Language Voice/Text Task Extraction State
  const [quickQuery, setQuickQuery] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedCandidate, setExtractedCandidate] = useState(null);

  useEffect(() => {
    refreshTasks();
  }, []);

  const handleManualCreateTask = async (e) => {
    e?.preventDefault();
    if (!taskDescription.trim()) return;

    setIsSubmitting(true);
    try {
      await api.createTask({
        task_description: taskDescription.trim(),
        due_date: dueDate.trim() || 'Today',
        category,
        priority,
        status: 'pending',
      });
      setTaskDescription('');
      setDueDate('');
      await refreshTasks();
      showToast('Task added to your list!', 'success');
    } catch (err) {
      showToast('Failed to add task', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExtractTask = async (e) => {
    e?.preventDefault();
    if (!quickQuery.trim()) return;

    setIsExtracting(true);
    try {
      const res = await api.extractTask(quickQuery.trim(), currentLanguage);
      if (res && res.is_task) {
        setExtractedCandidate(res);
      } else {
        showToast('Could not extract a clear task from the sentence. Please enter manually.', 'info');
      }
    } catch (err) {
      showToast('Error extracting task details', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleConfirmCandidate = async () => {
    if (!extractedCandidate) return;
    try {
      await api.createTask({
        task_description: extractedCandidate.task_description,
        due_date: extractedCandidate.due_date || 'Today',
        priority: extractedCandidate.priority || 'medium',
        category: extractedCandidate.category || 'general',
      });
      setExtractedCandidate(null);
      setQuickQuery('');
      await refreshTasks();
      showToast('Task confirmed and saved to MongoDB!', 'success');
    } catch (err) {
      showToast('Failed to save task', 'error');
    }
  };

  const handleToggleTaskStatus = async (task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await api.updateTask(task.task_id, { status: newStatus });
      await refreshTasks();
      showToast(newStatus === 'completed' ? 'Task completed!' : 'Task reopened', 'info');
    } catch (err) {
      showToast('Failed to update task status', 'error');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await api.deleteTask(taskId);
      await refreshTasks();
      showToast('Task deleted', 'info');
    } catch (err) {
      showToast('Failed to delete task', 'error');
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending') return t.status === 'pending';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-warm-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <CheckSquare className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-charcoal">Everyday Task Manager</h1>
          </div>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Voice-enabled to-do list & reminders saved securely in MongoDB.
          </p>
        </div>

        {/* Tab Counters */}
        <div className="flex items-center gap-1 bg-warm-200/70 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === 'all' ? 'bg-white text-charcoal shadow-sm' : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === 'pending' ? 'bg-white text-charcoal shadow-sm' : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === 'completed' ? 'bg-white text-charcoal shadow-sm' : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Done ({completedCount})
          </button>
        </div>
      </div>

      {/* Natural Language Voice/Text Task Extraction Banner */}
      <div className="card-soft rounded-2xl p-5 border-amber-200/60 bg-gradient-to-r from-amber-50/40 via-white to-transparent space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Quick Natural Speech / Text Task Extraction</span>
        </div>
        <p className="text-xs text-charcoal-muted">
          Say or type everyday statements like: <em>"Remind me to pay my electricity bill on Monday"</em> or <em>"Submit college project tomorrow"</em>.
        </p>

        <form onSubmit={handleExtractTask} className="flex items-center gap-2">
          <input
            type="text"
            value={quickQuery}
            onChange={(e) => setQuickQuery(e.target.value)}
            placeholder="Type your sentence here, e.g. 'Pay school fees on Friday'..."
            className="flex-1 bg-white border border-warm-300 rounded-xl px-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={isExtracting || !quickQuery.trim()}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
          >
            {isExtracting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Extract Details</span>
          </button>
        </form>

        {/* Confirmation Candidate Modal/Banner */}
        {extractedCandidate && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-charcoal space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Confirm Task Details Before Saving:
              </span>
              <button
                onClick={() => setExtractedCandidate(null)}
                className="text-xs text-charcoal-subtle hover:text-charcoal"
              >
                ✕ Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-1">
              <div className="bg-white p-2.5 rounded-lg border border-amber-100">
                <span className="text-[10px] text-charcoal-subtle uppercase block font-semibold">
                  Task
                </span>
                <span className="font-semibold text-charcoal text-xs">
                  {extractedCandidate.task_description}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-amber-100">
                <span className="text-[10px] text-charcoal-subtle uppercase block font-semibold">
                  Scheduled Due Date
                </span>
                <span className="font-semibold text-charcoal text-xs">
                  {extractedCandidate.due_date || 'Today'}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setExtractedCandidate(null)}
                className="px-3 py-1.5 rounded-lg border border-warm-300 text-charcoal-muted hover:bg-warm-100 font-medium"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleConfirmCandidate}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-transform active:scale-95 flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirm & Add Task
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Add Task Form */}
      <form onSubmit={handleManualCreateTask} className="card-soft rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-subtle">
          Add a Task Manually
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <input
            type="text"
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            placeholder="What needs to be done? (e.g. Electricity bill payment)"
            className="sm:col-span-6 bg-white border border-warm-300 rounded-xl px-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <input
            type="text"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            placeholder="Due date (e.g. Monday, 15th Nov)"
            className="sm:col-span-3 bg-white border border-warm-300 rounded-xl px-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="sm:col-span-2 bg-white border border-warm-300 rounded-xl px-2 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="general">General</option>
            <option value="bill">Bill Payment</option>
            <option value="work">Work/Office</option>
            <option value="school">School/College</option>
          </select>
          <button
            type="submit"
            disabled={isSubmitting || !taskDescription.trim()}
            className="sm:col-span-1 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-semibold rounded-xl text-xs flex items-center justify-center p-2 shadow-sm transition-transform active:scale-95"
            title="Add task"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Tasks List */}
      <div className="card-soft rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-warm-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-subtle">
            Tasks ({filteredTasks.length})
          </h3>
          <span className="text-[11px] text-charcoal-subtle italic">
            Saved due dates & reminders are tracked inside Sahayak
          </span>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-charcoal-subtle">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400 opacity-60" />
            <p className="text-sm font-medium">No tasks found in this view.</p>
            <p className="text-xs text-charcoal-muted mt-1">
              Add a new task using the box above or via the Voice Assistant!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map((t) => {
              const isDone = t.status === 'completed';
              return (
                <div
                  key={t.task_id}
                  className={`flex items-start justify-between p-3 rounded-xl border transition-all ${
                    isDone
                      ? 'bg-warm-50 border-warm-200 opacity-60'
                      : 'bg-white border-warm-200 hover:border-primary/40 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0 pr-3">
                    <button
                      onClick={() => handleToggleTaskStatus(t)}
                      className="mt-0.5 text-charcoal-subtle hover:text-emerald-600 transition-colors flex-shrink-0"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5 hover:text-emerald-500" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium text-charcoal break-words ${
                          isDone ? 'line-through text-charcoal-subtle' : ''
                        }`}
                      >
                        {t.task_description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-charcoal-muted">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: {t.due_date || 'No due date'}
                        </span>
                        {t.category && (
                          <span className="px-1.5 py-0.5 bg-warm-100 rounded text-[10px] font-semibold uppercase text-charcoal">
                            {t.category}
                          </span>
                        )}
                        {t.priority === 'high' && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold uppercase">
                            High Priority
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteTask(t.task_id)}
                    className="p-1.5 text-charcoal-subtle hover:text-red-500 rounded-lg hover:bg-warm-100 transition-colors flex-shrink-0"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
