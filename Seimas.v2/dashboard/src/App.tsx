import React from 'react';
import { HashRouter, Routes, Route, Navigate, useParams, Outlet } from 'react-router';
import { MainLayout } from './components/MainLayout';
import { LandingPage } from './components/LandingPage';

import MpProfileView from './views/MpProfileView';
import VotesListView from './views/VotesListView';
import VoteDetailView from './views/VoteDetailView';
import ComparisonView from './views/ComparisonView';
import MpsListView from './views/MpsListView';
import LeaderboardView from './views/LeaderboardView';
import { DashboardView } from './views/DashboardView';
import FactionsView from './views/FactionsView';
import SessionsView from './views/SessionsView';
import SkaidrumasHubView from './views/SkaidrumasHubView';
import { MethodologyView } from './views/MethodologyView';
import { SourcesView } from './views/SourcesView';
import { CorrectionsView } from './views/CorrectionsView';

const MpProfileRoute = () => {
    const { id } = useParams();
    return <MpProfileView mpId={id!} />;
};

const VoteDetailRoute = () => {
    const { id } = useParams();
    return <VoteDetailView voteId={id!} />;
};

function App() {
    React.useEffect(() => {
        document.documentElement.classList.add('dark');
    }, []);

    return (
        <HashRouter>
            <Routes>
                <Route path="/" element={<LandingPage />} />

                <Route path="/dashboard" element={<MainLayout />}>
                    <Route index element={<DashboardView />} />

                    <Route path="mps" element={<Outlet />}>
                        <Route index element={<MpsListView />} />
                        <Route path=":id" element={<MpProfileRoute />} />
                    </Route>

                    <Route path="votes" element={<Outlet />}>
                        <Route index element={<VotesListView />} />
                        <Route path=":id" element={<VoteDetailRoute />} />
                    </Route>

                    <Route path="factions" element={<FactionsView />} />
                    <Route path="sessions" element={<SessionsView />} />
                    <Route path="compare" element={<ComparisonView />} />
                    <Route path="leaderboard" element={<LeaderboardView />} />
                    <Route path="skaidrumas" element={<SkaidrumasHubView />} />
                    <Route path="methodology" element={<MethodologyView />} />
                    <Route path="sources" element={<SourcesView />} />
                    <Route path="corrections" element={<CorrectionsView />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </HashRouter>
    );
}

export default App;
