import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import DAMPage from './pages/DAMPage';

function App() {
  return (
    <div id="app-container">
      <Sidebar />
      <main id="main-content">
        <header className="main-header">
          <h1>DAS Control Panel</h1>
        </header>
        <div id="chat-container">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dam" element={<DAMPage />} />
            <Route path="/eapp" element={() => <div>EAPP Module Page - Coming Soon</div>} />
            <Route path="/taid" element={() => <div>TAID Module Page - Coming Soon</div>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;