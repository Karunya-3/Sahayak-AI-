import React from 'react';
import { useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ChatInterface } from './components/ChatInterface';
import { DocumentWorkspace } from './components/DocumentWorkspace';
import { TaskPanel } from './components/TaskPanel';
import { TranslationPanel } from './components/TranslationPanel';

export function App() {
  const { activeTab } = useApp();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-warm-100 font-sans selection:bg-secondary selection:text-primary">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'assistant' && <ChatInterface />}
        {activeTab === 'documents' && <DocumentWorkspace />}
        {activeTab === 'tasks' && <TaskPanel />}
        {activeTab === 'translate' && <TranslationPanel />}
      </main>
    </div>
  );
}

export default App;
