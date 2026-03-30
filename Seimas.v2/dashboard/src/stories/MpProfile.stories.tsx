import type { Meta, StoryObj } from '@storybook/react-vite';
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

const mockHero = {
    mp: {
        id: '123',
        name: 'Andrius Kubilius',
        party: 'Tėvynės sąjunga',
        photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Andrius_Kubilius_2019.jpg/440px-Andrius_Kubilius_2019.jpg',
        active: true,
        seimas_id: '123',
    },
    level: 4,
    xp: 1950,
    xp_current_level: 1200,
    xp_next_level: 3200,
    alignment: 'Lawful Good',
    attributes: {
        STR: 82,
        WIS: 74,
        CHA: 61,
        INT: 88,
        STA: 79,
    },
    artifacts: [
        { name: 'Gavel of Command', rarity: 'Epic' },
        { name: 'Sentinel Sigil', rarity: 'Rare' },
    ],
    forensic_breakdown: {
        base_risk_score: 12.5,
        base_risk_penalty: -12.5,
        benford: {
            status: 'clean',
            p_value: 0.22,
            penalty: 0,
            explanation: 'Benford analysis is within expected range.',
        },
        chrono: {
            status: 'warning',
            worst_zscore: -2.4,
            penalty: -8,
            explanation: 'Amendment drafting speed is suspiciously fast in recent profile.',
        },
        vote_geometry: {
            status: 'clean',
            max_deviation_sigma: 1.2,
            penalty: 0,
            explanation: 'No statistically unusual vote geometry signals.',
        },
        phantom_network: {
            status: 'warning',
            procurement_links: 0,
            closest_hop_count: null,
            debtor_links: 1,
            penalty: -5,
            explanation: 'Linked company has tax debtor signal.',
        },
        loyalty_bonus: {
            status: 'warning',
            independent_voting_days_pct: 24.6,
            bonus: 5,
            explanation: 'Voted against party line on 24.6% of voting days, indicating independent judgment.',
        },
        total_forensic_adjustment: -8,
        final_integrity_score: 79.5,
    },
};

export const Loading: Story = {
    args: {
        loading: true,
        hero: null,
    },
};

export const ErrorState: Story = {
    args: {
        loading: false,
        hero: null,
    },
};

export const FullProfile: Story = {
    args: {
        loading: false,
        hero: mockHero,
    },
};

export const NoArtifacts: Story = {
    args: {
        loading: false,
        hero: { ...mockHero, artifacts: [] },
    },
};

export const InactiveMP: Story = {
    args: {
        loading: false,
        hero: {
            ...mockHero,
            mp: { ...mockHero.mp, active: false, name: 'Inactive Member' },
            alignment: 'Chaotic Neutral',
        },
    },
};
