
import type { Meta, StoryObj } from '@storybook/react';
import { UniversalButton } from '../components/UniversalButton';
import { Plus, Save, Trash2 } from 'lucide-react';

const meta: Meta<typeof UniversalButton> = {
    title: 'UX/UniversalButton',
    component: UniversalButton,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof UniversalButton>;

export const Primary: Story = {
    args: {
        variant: 'primary',
        children: 'Primary Button',
        icon: Plus,
    },
};

export const Secondary: Story = {
    args: {
        variant: 'secondary',
        children: 'Secondary Button',
        icon: Save,
    },
    parameters: {
        backgrounds: { default: 'dark' },
    }
};

export const Ghost: Story = {
    args: {
        variant: 'ghost',
        children: 'Ghost Button',
    },
    parameters: {
        backgrounds: { default: 'dark' },
    }
};

export const Danger: Story = {
    args: {
        variant: 'danger',
        children: 'Delete Item',
        icon: Trash2,
    },
};
