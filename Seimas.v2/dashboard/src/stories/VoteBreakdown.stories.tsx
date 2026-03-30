
import type { Meta, StoryObj } from '@storybook/react';
import { VoteBreakdown } from '../components/VoteBreakdown';

const meta: Meta<typeof VoteBreakdown> = {
    title: 'UX/VoteBreakdown',
    component: VoteBreakdown,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof VoteBreakdown>;

export const Default: Story = {
    args: {
        title: 'Budget Amendment 2026',
        stats: {
            for: 85,
            against: 42,
            abstain: 14,
        },
    },
};

export const Unanimous: Story = {
    args: {
        title: 'National Holiday Act',
        stats: {
            for: 140,
            against: 0,
            abstain: 1,
        },
    },
};
