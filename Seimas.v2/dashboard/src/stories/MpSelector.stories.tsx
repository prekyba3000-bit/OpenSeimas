
import type { Meta, StoryObj } from '@storybook/react';
import { MpSelector } from '../components/MpSelector';

const meta: Meta<typeof MpSelector> = {
    title: 'UX/MpSelector',
    component: MpSelector,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MpSelector>;

export const Empty: Story = {
    args: {
        placeholder: 'Select an MP...',
    },
};

export const Populated: Story = {
    args: {
        mp: {
            name: 'Andrius Kubilius',
            party: 'Tėvynės sąjunga',
        },
    },
};
