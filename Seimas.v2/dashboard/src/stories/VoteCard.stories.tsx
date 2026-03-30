import type { Meta, StoryObj } from '@storybook/react-vite';
import { VoteCard } from '../views/VotesListView';

const meta = {
    title: 'Components/VoteCard',
    component: VoteCard,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
    },
    tags: ['autodocs'],
    argTypes: {
        onClick: { action: 'clicked' },
    },
} satisfies Meta<typeof VoteCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockVote = {
    id: '1',
    date: '2024-01-01',
    title: 'Law on Transparency and Open Data',
    result: 'Priimta', // Approved
};

export const Approved: Story = {
    args: {
        vote: mockVote,
    },
};

export const Rejected: Story = {
    args: {
        vote: { ...mockVote, result: 'Nepriimta' },
    },
};

export const Abstained: Story = {
    args: {
        vote: { ...mockVote, result: 'Susilaikė' },
    },
};

export const LongTitle: Story = {
    args: {
        vote: {
            ...mockVote,
            title: 'Law on the implementation of the European Union regulation regarding the harmonization of digital transparency standards across member states and internal territories of the republic to ensure compliance with global best practices'
        },
    },
};
