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
import { AppErrorBoundary } from './components/AppErrorBoundary';

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
                    <Route
                        index
                        element={(
                            <AppErrorBoundary>
                                <DashboardView />
                            </AppErrorBoundary>
                        )}
                    />

                    <Route path="mps" element={<Outlet />}>
                        <Route
                            index
                            element={(
                                <AppErrorBoundary>
                                    <MpsListView />
                                </AppErrorBoundary>
                            )}
                        />
                        <Route
                            path=":id"
                            element={(
                                <AppErrorBoundary>
                                    <MpProfileRoute />
                                </AppErrorBoundary>
                            )}
                        />
                    </Route>

                    <Route path="votes" element={<Outlet />}>
                        <Route
                            index
                            element={(
                                <AppErrorBoundary>
                                    <VotesListView />
                                </AppErrorBoundary>
                            )}
                        />
                        <Route
                            path=":id"
                            element={(
                                <AppErrorBoundary>
                                    <VoteDetailRoute />
                                </AppErrorBoundary>
                            )}
                        />
                    </Route>

                    <Route path="factions" element={<AppErrorBoundary><FactionsView /></AppErrorBoundary>} />
                    <Route path="sessions" element={<AppErrorBoundary><SessionsView /></AppErrorBoundary>} />
                    <Route path="compare" element={<AppErrorBoundary><ComparisonView /></AppErrorBoundary>} />
                    <Route path="stebejimas" element={<AppErrorBoundary><LeaderboardView /></AppErrorBoundary>} />
                    <Route path="leaderboard" element={<Navigate to="/dashboard/stebejimas" replace />} />
                    <Route path="skaidrumas" element={<AppErrorBoundary><SkaidrumasHubView /></AppErrorBoundary>} />
                    <Route path="methodology" element={<AppErrorBoundary><MethodologyView /></AppErrorBoundary>} />
                    <Route path="sources" element={<AppErrorBoundary><SourcesView /></AppErrorBoundary>} />
                    <Route path="corrections" element={<AppErrorBoundary><CorrectionsView /></AppErrorBoundary>} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </HashRouter>
    );
}

export default App;
