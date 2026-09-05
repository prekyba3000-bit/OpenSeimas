import type { Meta, StoryObj } from '@storybook/react';
import type { MpProfile } from '../services/api';
import { MpProfileLayout } from '../views/MpProfileView';

const meta = {
    title: 'Views/MpProfile',
    component: MpProfileLayout,
    parameters: {
        layout: 'fullscreen',
    },
} satisfies Meta<typeof MpProfileLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The RPG scaffolding this fixture carried — level, xp, alignment, artifacts
 * and the STR/WIS/CHA/INT/STA block, all behind string-splitting so the
 * abbreviations never appeared literally in source — went with the wire
 * format. What remains is the three chamber-relative dimensions, named.
 */
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
    dimensions: {
        legislative_activity: 82,
        experience: 74,
        visibility: 61,
    },
    metrics: {
        attendance_percentage: 88.4,
        party_loyalty: 74.2,
    },
    metrics_provenance: {
        legislative_activity: 'direct',
        experience: 'direct',
        visibility: 'direct',
    },
    forensicBreakdown: {
        benford: {
            engine: 'benford',
            status: 'clean',
            title: 'Benfordo dėsnio analizė',
            description: 'Benford analysis is within expected range.',
            severity: 'none',
            penalty: 0,
            pValue: 0.22,
        },
        chrono: {
            engine: 'chrono',
            status: 'warning',
            title: 'Pataisų laiko analizė',
            description: 'Amendment drafting speed is suspiciously fast in recent profile.',
            severity: 'medium',
            penalty: -8,
            worstZscore: -2.4,
        },
        voteGeometry: {
            engine: 'vote_geometry',
            status: 'clean',
            title: 'Balsavimo geometrija',
            description: 'No statistically unusual vote geometry signals.',
            severity: 'none',
            penalty: 0,
            maxDeviationSigma: 1.2,
        },
        phantomNetwork: {
            engine: 'phantom',
            status: 'warning',
            title: 'Paslėptų ryšių tinklas',
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
    },
} as unknown as MpProfile;

const storyVotes = [
    { title: 'Mokesčių pataisa', date: '2024-03-15', choice: 'Už' },
    { title: 'Biudžeto papildymas', date: '2024-02-20', choice: 'Prieš' },
];

export const Loading: Story = {
    args: { loading: true, profile: null, votes: [], votesLoading: false },
};

export const ErrorState: Story = {
    args: { loading: false, profile: null, votes: [], votesLoading: false },
};

export const FullProfile: Story = {
    args: { loading: false, profile: mockMpProfile, votes: storyVotes, votesLoading: false },
};

/** Two of five dimensions unsourced — the state most members are actually in. */
export const PartiallySourced: Story = {
    args: {
        loading: false,
        profile: {
            ...mockMpProfile,
            metrics_provenance: {
                legislative_activity: 'unavailable',
                experience: 'direct',
                visibility: 'unavailable',
            },
        } as unknown as MpProfile,
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
        } as unknown as MpProfile,
        votes: storyVotes,
        votesLoading: false,
    },
};
