import type { Meta, StoryObj } from '@storybook/react-vite';
import { MpCard } from '../components/MpCard';

const meta = {
    title: 'Components/MpCard',
    component: MpCard,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
    },
    tags: ['autodocs'],
    argTypes: {
        onClick: { action: 'clicked' },
    },
} satisfies Meta<typeof MpCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockMp = {
    id: '123',
    name: 'Andrius Kubilius',
    party: 'Tėvynės sąjunga',
    photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Andrius_Kubilius_2019.jpg/440px-Andrius_Kubilius_2019.jpg',
    active: true,
    vote_count: 1543,
    attendance: 98,
    loyalty: 100,
    term_start: '2020-11-14',
    seimas_id: '123'
};

export const Default: Story = {
    args: {
        mp: mockMp,
    },
};

export const LongName: Story = {
    args: {
        mp: { ...mockMp, name: 'Very Long Name That Might Truncate In The Card Layout' },
    },
};

export const DifferentParty: Story = {
    args: {
        mp: { ...mockMp, party: 'Lietuvos socialdemokratų partija' },
    },
};
