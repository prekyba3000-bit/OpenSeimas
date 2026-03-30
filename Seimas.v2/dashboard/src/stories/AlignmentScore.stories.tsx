
import type { Meta, StoryObj } from '@storybook/react';
import { AlignmentScore } from '../components/AlignmentScore';

const meta: Meta<typeof AlignmentScore> = {
    title: 'UX/AlignmentScore',
    component: AlignmentScore,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AlignmentScore>;

export const HighMatch: Story = {
    args: {
        score: 85,
        size: 160,
    },
};

export const MediumMatch: Story = {
    args: {
        score: 65,
        size: 160,
    },
};

export const LowMatch: Story = {
    args: {
        score: 45,
        size: 160,
    },
};

export const Loading: Story = {
    args: {
        score: 0,
        isLoading: true,
        size: 160,
    },
};
