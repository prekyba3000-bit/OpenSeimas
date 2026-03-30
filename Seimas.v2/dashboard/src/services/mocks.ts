import { MP, Vote, MatchResult, PlayerStats, RankedEntry } from '../figma-types';

export const MOCK_MPS: MP[] = [
  {
    id: 'mp-1',
    seimas_id: '141',
    name: 'Gabrielius Landsbergis',
    party: 'Tėvynės Sąjunga',
    photo_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200&h=200',
    party_color: '#0054A6',
    is_active: true,
    archetype: 'The Maverick'
  },
  {
    id: 'mp-2',
    seimas_id: '142',
    name: 'Viktorija Čmilytė-Nielsen',
    party: 'Liberalų Sąjūdis',
    photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200',
    party_color: '#F47920',
    is_active: true,
    archetype: 'Party Soldier'
  },
  {
    id: 'mp-3',
    seimas_id: '143',
    name: 'Aušrinė Armonaitė',
    party: 'Laisvės Partija',
    photo_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200&h=200',
    party_color: '#E1058C',
    is_active: true,
    archetype: 'The Ghost'
  },
  {
    id: 'mp-4',
    seimas_id: '144',
    name: 'Saulius Skvernelis',
    party: 'Demokratai Vardan Lietuvos',
    photo_url: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=200&h=200',
    party_color: '#122247',
    is_active: true,
    archetype: 'Iron Man'
  }
];

export const MOCK_STATS: PlayerStats = {
  attendance_rate: 92,
  participation_rate: 88,
  rebellion_rate: 4.5,
  loyalty_rate: 95.5,
  kda_ratio: 14.2,
  win_rate: 68,
  net_worth: 150000,
  delta_net_worth: 12000
};

export const MOCK_VOTES: Vote[] = [
  {
    id: 'vote-1',
    title: 'Healthcare Reform Bill 2026-A',
    description: 'Comprehensive overhaul of the public hospital funding structure.',
    date: '2026-02-01',
    result_type: 'Accepted',
    status_badge: 'Priimta'
  },
  {
    id: 'vote-2',
    title: 'Taxation Amendment (Digital Assets)',
    description: 'Regulation framework for cryptocurrency and digital asset taxation.',
    date: '2026-01-28',
    result_type: 'Rejected',
    status_badge: 'Atmesta'
  },
  {
    id: 'vote-3',
    title: 'Education Budget Supplement',
    description: 'Additional funding for regional schools infrastructure.',
    date: '2026-01-25',
    result_type: 'Accepted',
    status_badge: 'Priimta'
  },
  {
    id: 'vote-4',
    title: 'Defense Spending Act',
    description: 'Increasing defense budget to 3.5% of GDP.',
    date: '2026-01-20',
    result_type: 'Accepted',
    status_badge: 'Priimta'
  },
  {
    id: 'vote-5',
    title: 'Environmental Protection - Baltic Sea',
    description: 'Stricter regulations on industrial waste in coastal zones.',
    date: '2026-01-15',
    result_type: 'Other',
    status_badge: 'Svarstoma'
  }
];

export const MOCK_RANKED_LADDER: RankedEntry[] = MOCK_MPS.map((mp, index) => ({
  rank: index + 1,
  mp,
  tier: index === 0 ? 'Challenger' : index === 1 ? 'Diamond' : 'Platinum',
  score: 1000 - (index * 50),
  trend: index % 2 === 0 ? 'up' : 'down'
}));

export const MOCK_MATCH_RESULT: MatchResult = {
  vote_id: 'vote-1',
  winning_side: 'For',
  total_votes: 138,
  stats: {
    for: 85,
    against: 40,
    abstain: 13,
    missed: 3
  },
  turnout_percentage: 97.8,
  party_breakdown: {
    'Tėvynės Sąjunga': { for: 45, against: 2, abstain: 3 },
    'Liberalų Sąjūdis': { for: 12, against: 0, abstain: 1 },
    'Laisvės Partija': { for: 10, against: 0, abstain: 1 },
    'Opozicija': { for: 18, against: 38, abstain: 8 }
  }
};
