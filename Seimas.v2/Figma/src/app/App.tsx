import React from 'react';
import { HashRouter, Routes, Route, Navigate, useParams, useNavigate, Outlet } from 'react-router';
import { MainLayout } from './components/MainLayout';
import { DashboardView } from './components/DashboardView';
import { MpDirectory } from './components/MpDirectory';
import { MpProfileView } from './components/MpProfileView';
import { VotesListView } from './components/VotesListView';
import { VoteDetail } from './components/VoteDetail';
import { SessionOverview } from './components/SessionOverview';
import { ComparisonView } from './components/ComparisonView';
import { LandingPage } from './components/LandingPage';

// Wrapper for Profile to handle route params
const MpProfileRoute = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  // In a real app, we would fetch data based on ID here
  console.log("Viewing MP Profile for ID:", id);
  return <MpProfileView onBack={() => navigate('/dashboard/mps')} />;
};

// Wrapper for Vote Detail to handle route params
const VoteDetailRoute = () => {
  const { id } = useParams();
  return <VoteDetail />;
};

function App() {
  // Force dark mode
  React.useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        {/* Dashboard Layout Routes */}
        <Route path="/dashboard" element={<MainLayout />}>
          <Route index element={<DashboardView />} />
          
          <Route path="mps" element={<Outlet />}>
            <Route index element={<MpDirectory />} />
            <Route path=":id" element={<MpProfileRoute />} />
          </Route>

          <Route path="votes" element={<Outlet />}>
            <Route index element={<VotesListView />} />
            <Route path=":id" element={<VoteDetailRoute />} />
          </Route>

          <Route path="sessions" element={<SessionOverview />} />
          <Route path="compare" element={<ComparisonView />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
