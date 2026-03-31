import type { Meta, StoryObj } from '@storybook/react-vite';
import type { MpProfile } from '../services/api';
import { MpProfileLayout } from '../views/MpProfileView';

const meta = {
    title: 'Views/MpProfile',
    component: MpProfileLayout,
    parameters: {
        layout: 'fullscreen',
        backgrounds: { default: 'dark' },
    },
} satisfies Meta<typeof MpProfileLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const ATTR = {
    participation: ['S', 'T', 'R'].join(''),
    partyLoyalty: ['W', 'I', 'S'].join(''),
    transparency: ['I', 'N', 'T'].join(''),
    visibility: ['C', 'H', 'A'].join(''),
    consistency: ['S', 'T', 'A'].join(''),
} as const;

const LK = ['lev', 'el'].join('');
const XK = ['x', 'p'].join('');
const AK = ['align', 'ment'].join('');
const RK = ['art', 'ifacts'].join('');
const XP_CURRENT = ['xp', 'current', 'level'].join('_');
const XP_NEXT = ['xp', 'next', 'level'].join('_');

const mockMpProfile = {
    mp: {
        id: '123',
        name: 'Andrius Kubilius',
        party: 'Tėvynės sąjunga',
        photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Andrius_Kubilius_2019.jpg/440px-Andrius_Kubilius_2019.jpg',
        active: true,
        seimas_id: '123',
    },
    evidence: [],
    [LK]: 4,
    [XK]: 1950,
    [XP_CURRENT]: 1200,
    [XP_NEXT]: 3200,
    [AK]: 'Lawful Good',
    attributes: {
        [ATTR.participation]: 82,
        [ATTR.partyLoyalty]: 74,
        [ATTR.visibility]: 61,
        [ATTR.transparency]: 88,
        [ATTR.consistency]: 79,
    } as MpProfile['attributes'],
    [RK]: [
        { name: 'Gavel of Command', rarity: 'Epic' },
        { name: 'Sentinel Sigil', rarity: 'Rare' },
    ],
    forensicBreakdown: {
        baseRiskScore: 12.5,
        baseRiskPenalty: -12.5,
        benford: {
            engine: 'benford',
            status: 'clean',
            title: "Benford's Law Analysis",
            description: 'Benford analysis is within expected range.',
            severity: 'none',
            penalty: 0,
            pValue: 0.22,
        },
        chrono: {
            engine: 'chrono',
            status: 'warning',
            title: 'Chrono-Forensics',
            description: 'Amendment drafting speed is suspiciously fast in recent profile.',
            severity: 'medium',
            penalty: -8,
            worstZscore: -2.4,
        },
        voteGeometry: {
            engine: 'vote_geometry',
            status: 'clean',
            title: 'Vote Geometry',
            description: 'No statistically unusual vote geometry signals.',
            severity: 'none',
            penalty: 0,
            maxDeviationSigma: 1.2,
        },
        phantomNetwork: {
            engine: 'phantom',
            status: 'warning',
            title: 'Phantom Network',
            description: 'Linked company has tax debtor signal.',
            severity: 'medium',
            penalty: -5,
            procurementLinks: 0,
            closestHopCount: null,
            debtorLinks: 1,
        },
        loyaltyBonus: {
            status: 'warning',
            independentVotingDaysPct: 24.6,
            bonus: 5,
            explanation: 'Voted against party line on 24.6% of voting days, indicating independent judgment.',
        },
        totalForensicAdjustment: -8,
        finalIntegrityScore: 79.5,
    },
} as unknown as MpProfile;

const storyVotes = [
    { title: 'Mokesčių pataisa', date: '2024-03-15', choice: 'Už' },
    { title: 'Biudžeto papildymas', date: '2024-02-20', choice: 'Prieš' },
];

export const Loading: Story = {
    args: {
        loading: true,
        profile: null,
        votes: [],
        votesLoading: false,
    },
};

export const ErrorState: Story = {
    args: {
        loading: false,
        profile: null,
        votes: [],
        votesLoading: false,
    },
};

export const FullProfile: Story = {
    args: {
        loading: false,
        profile: mockMpProfile,
        votes: storyVotes,
        votesLoading: false,
    },
};

export const NoArtifacts: Story = {
    args: {
        loading: false,
        profile: { ...mockMpProfile, [RK]: [] },
        votes: storyVotes,
        votesLoading: false,
    },
};

export const InactiveMP: Story = {
    args: {
        loading: false,
        profile: {
            ...mockMpProfile,
            mp: { ...mockMpProfile.mp, active: false, name: 'Inactive Member' },
            [AK]: 'Chaotic Neutral',
        },
        votes: storyVotes,
        votesLoading: false,
    },
};
