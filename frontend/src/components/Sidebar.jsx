import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LanguageSelector } from './LanguageSelector';
import {
  MessageSquare,
  FileText,
  CheckSquare,
  Sparkles,
  Plus,
  Trash2,
  Menu,
  X,
  Languages,
  LayoutDashboard,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { api } from '../services/api';

export const Sidebar = () => {
  const {
    activeTab,
    setActiveTab,
    conversations,
    currentConversationId,
    setCurrentConversationId,
    refreshConversations,
    showToast,
    systemHealth,
  } = useApp();

  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assistant', label: 'AI Assistant', icon: Sparkles, badge: 'Voice' },
    { id: 'documents', label: 'Documents & OCR', icon: FileText },
    { id: 'tasks', label: 'My Tasks', icon: CheckSquare },
    { id: 'translate', label: 'Translate & Draft', icon: Languages },
  ];

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setActiveTab('assistant');
    setIsOpenMobile(false);
    showToast('Started new conversation', 'info');
  };

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
    setActiveTab('assistant');
    setIsOpenMobile(false);
  };

  const handleDeleteConversation = async (e, id) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(id);
      await refreshConversations();
      if (currentConversationId === id) {
        setCurrentConversationId(null);
      }
      showToast('Conversation deleted', 'info');
    } catch (err) {
      showToast('Failed to delete conversation', 'error');
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between bg-white border-r border-warm-200">
      {/* Top Header & Logo */}
      <div className="p-4 border-b border-warm-200 flex items-center justify-between">
        <div
          onClick={() => {
            setActiveTab('dashboard');
            setIsOpenMobile(false);
          }}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
            स
          </div>
          {!isCollapsed && (
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-charcoal tracking-tight text-lg">Sahayak AI</span>
                <span className="text-[10px] bg-secondary text-primary font-semibold px-1.5 py-0.5 rounded">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-charcoal-muted">Everyday Voice Assistant</p>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        <button
          onClick={() => setIsOpenMobile(false)}
          className="md:hidden p-1.5 text-charcoal-muted hover:text-charcoal rounded-lg hover:bg-warm-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* New Conversation Button */}
      <div className="p-3">
        <button
          onClick={handleNewConversation}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-2.5 px-4 rounded-xl font-medium text-sm transition-all shadow-sm active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          {!isCollapsed && <span>New Conversation</span>}
        </button>
      </div>

      {/* Navigation List */}
      <div className="px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsOpenMobile(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? 'bg-secondary text-primary shadow-sm font-semibold'
                  : 'text-charcoal-muted hover:text-charcoal hover:bg-warm-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-charcoal-muted'}`} />
                {!isCollapsed && <span>{item.label}</span>}
              </div>
              {!isCollapsed && item.badge && (
                <span className="text-[10px] bg-accent/60 text-charcoal font-semibold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Recent Conversations */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto px-3 py-3 border-t border-warm-200">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-subtle">
              Recent Conversations
            </span>
          </div>

          <div className="space-y-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-charcoal-subtle px-2 py-3 italic">
                No conversations yet. Start by speaking!
              </p>
            ) : (
              conversations.map((c) => {
                const isSelected = currentConversationId === c.conversation_id && activeTab === 'assistant';
                return (
                  <div
                    key={c.conversation_id}
                    onClick={() => handleSelectConversation(c.conversation_id)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-warm-200 text-charcoal font-semibold'
                        : 'text-charcoal-muted hover:bg-warm-100 hover:text-charcoal'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-1">
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                      <span className="truncate">{c.title || 'Conversation'}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(e, c.conversation_id)}
                      className="opacity-0 group-hover:opacity-100 text-charcoal-subtle hover:text-red-500 p-1 rounded transition-opacity"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Footer & Status */}
      <div className="p-3 border-t border-warm-200 space-y-3 bg-warm-50">
        {!isCollapsed && (
          <div>
            <span className="text-[11px] font-semibold text-charcoal-subtle block mb-1 px-1">
              Preferred Language
            </span>
            <LanguageSelector />
          </div>
        )}

        {/* System Engine Indicators */}
        {!isCollapsed && (
          <div className="pt-2 border-t border-warm-200/60 flex items-center justify-between text-[11px] text-charcoal-muted px-1">
            <div className="flex items-center gap-1.5" title="Gnani AI Integration">
              <Cpu className="w-3.5 h-3.5 text-primary" />
              <span>Gnani Stack</span>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {systemHealth?.database?.mode === 'in_memory_mock' ? 'Local DB' : 'Atlas Ready'}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar with Hamburger */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-warm-200 sticky top-0 z-30">
        <div
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm">
            स
          </div>
          <span className="font-bold text-charcoal">Sahayak AI</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSelector compact />
          <button
            onClick={() => setIsOpenMobile(true)}
            className="p-2 rounded-lg text-charcoal-muted hover:bg-warm-100"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block transition-all duration-300 z-20 flex-shrink-0 ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpenMobile(false)}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
