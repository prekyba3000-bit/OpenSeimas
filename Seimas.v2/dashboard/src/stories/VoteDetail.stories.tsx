import type { Meta, StoryObj } from '@storybook/react-vite';
import VoteDetailView from '../views/VoteDetailView';

// Wrapper to provide voteId prop or context if needed.
// VoteDetailView expects 'voteId' prop
const VoteDetailWrapper = ({ voteId }: { voteId: string }) => <VoteDetailView voteId={voteId} />;

const meta = {
    title: 'Views/VoteDetail',
    component: VoteDetailWrapper,
    parameters: {
        layout: 'fullscreen',
        backgrounds: { default: 'dark' },
    },
} satisfies Meta<typeof VoteDetailWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
    args: {
        voteId: '1',
    },
};
