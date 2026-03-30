import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../components/Button';
import { Plus, Trash, Save } from 'lucide-react';

const meta = {
    title: 'Components/Button',
    component: Button,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
    },
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: { type: 'select' },
            options: ['primary', 'secondary', 'ghost', 'danger'],
        },
        size: {
            control: { type: 'select' },
            options: ['sm', 'md', 'lg'],
        },
        loading: { control: 'boolean' },
        disabled: { control: 'boolean' },
        onClick: { action: 'clicked' },
    },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
    args: {
        children: 'Primary Button',
        variant: 'primary',
    },
};

export const Secondary: Story = {
    args: {
        children: 'Secondary Button',
        variant: 'secondary',
    },
};

export const Ghost: Story = {
    args: {
        children: 'Ghost Button',
        variant: 'ghost',
    },
};

export const Danger: Story = {
    args: {
        children: 'Delete Item',
        variant: 'danger',
        icon: Trash,
    },
};

export const WithIcon: Story = {
    args: {
        children: 'Add New',
        icon: Plus,
    },
};

export const Loading: Story = {
    args: {
        children: 'Saving...',
        loading: true,
        icon: Save,
    },
};

export const Small: Story = {
    args: {
        children: 'Small Button',
        size: 'sm',
    },
};

export const Large: Story = {
    args: {
        children: 'Large Button',
        size: 'lg',
    },
};
