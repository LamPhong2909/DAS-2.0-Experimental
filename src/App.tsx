import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import DAMPage from './pages/DAMPage';
// Placeholder pages for EAPP and TAID
const EAPPPage = () => <div>EAPP Module Page - Coming Soon</div>;
const TAIDPage = () => <div>TAID Module Page - Coming Soon</div>;


function App() {
  return (
    <div id="app-container">
      <Sidebar />
      <main id="main-content">
        <header className="main-header">
            {/* Header could be dynamic based on route */}
            <h1>DAS Control Panel</h1>
        </header>
        <div id="chat-container"> {/* Reusing this class for padding and scroll */}
            <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/dam" element={<DAMPage />} />
                <Route path="/eapp" element={<EAPPPage />} />
                <Route path="/taid" element={<TAIDPage />} />
            </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
