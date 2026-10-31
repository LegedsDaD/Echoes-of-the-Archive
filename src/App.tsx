import React from 'react';
import { ArchiveProvider, useArchive } from './context/ArchiveContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { GalleryView } from './components/gallery/GalleryView';
import { CreatePortraitWizard } from './components/create/CreatePortraitWizard';
import { ConversationView } from './components/chat/ConversationView';
import { MemoryVaultView } from './components/vault/MemoryVaultView';
import { ModelManagerView } from './components/models/ModelManagerView';
import { ActivityMonitorView } from './components/monitor/ActivityMonitorView';
import { SettingsView } from './components/settings/SettingsView';
import { CorsGuideModal } from './components/common/CorsGuideModal';

const MainContent: React.FC = () => {
  const { activeTab, showCorsModal, setShowCorsModal } = useArchive();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'gallery':
        return <GalleryView />;
      case 'create':
        return <CreatePortraitWizard />;
      case 'vault':
        return <MemoryVaultView />;
      case 'conversations':
        return <ConversationView />;
      case 'models':
        return <ModelManagerView />;
      case 'monitor':
        return <ActivityMonitorView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0c0d10] text-[#e8e4dc] overflow-hidden bg-archive-texture select-none">
      {/* 8-Tab Archival Sidebar */}
      <Sidebar />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden select-text">
        <TopNav />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {renderActiveView()}
        </main>
      </div>

      {/* Direct Ollama & CORS Help Modal */}
      <CorsGuideModal
        isOpen={showCorsModal}
        onClose={() => setShowCorsModal(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <ArchiveProvider>
      <MainContent />
    </ArchiveProvider>
  );
}

export default App;
