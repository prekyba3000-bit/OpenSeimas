import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatCard } from '../components/StatCard';
import { Users, Activity, FileText } from 'lucide-react';

const meta = {
    title: 'Components/StatCard',
    component: StatCard,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
    },
    tags: ['autodocs'],
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        title: 'Total Users',
        value: 1234,
        icon: Users,
    },
};

export const WithTrend: Story = {
    args: {
        title: 'Active Sessions',
        value: '89.5%',
        icon: Activity,
        trend: '12.5',
    },
};

export const LargeNumber: Story = {
    args: {
        title: 'Total Votes',
        value: '1,234,567',
        icon: FileText,
        trend: '5.2',
    },
};
