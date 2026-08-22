import type { Meta, StoryObj } from '@storybook/react';
import { VoteCard } from '../views/VotesListView';
import type { VoteSummary } from '../services/api';

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
    // `onClick` is required on the component and supplied at runtime by the
    // action above, which the typechecker cannot see. Declaring it here keeps
    // every story's args assignable without loosening the component's props.
    args: {
        onClick: () => {},
    },
} satisfies Meta<typeof VoteCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockVote: VoteSummary = {
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
