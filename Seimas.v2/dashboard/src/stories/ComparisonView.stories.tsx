
import type { Meta, StoryObj } from '@storybook/react';
import { ComparisonView } from '../components/ComparisonView';

const meta: Meta<typeof ComparisonView> = {
    title: 'UX/ComparisonView',
    component: ComparisonView,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ComparisonView>;

export const Default: Story = {
    args: {
        mp1: {
            name: 'Andrius Kubilius',
            party: 'Tėvynės sąjunga',
        },
        mp2: {
            name: 'Gintautas Paluckas',
            party: 'LSDP',
        },
        alignmentScore: 85,
        isLoading: false,
    },
};

export const Loading: Story = {
    args: {
        isLoading: true,
    },
};
