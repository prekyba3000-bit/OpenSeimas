
import type { Meta, StoryObj } from '@storybook/react';
import { NavItem } from '../components/NavItem';
import { LayoutDashboard, Users, Settings } from 'lucide-react';

const meta: Meta<typeof NavItem> = {
    title: 'UX/NavItem',
    component: NavItem,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof NavItem>;

export const Default: Story = {
    args: {
        label: 'Dashboard',
        icon: LayoutDashboard,
        isActive: false,
    },
};

export const Active: Story = {
    args: {
        label: 'Members',
        icon: Users,
        isActive: true,
    },
};
