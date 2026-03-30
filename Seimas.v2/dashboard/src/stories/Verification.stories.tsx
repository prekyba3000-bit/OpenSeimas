import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from '../components/Card';

const meta = {
    title: 'Verification/Card',
    component: Card,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InstallationCheck: Story = {
    args: {
        children: (
            <div className="text-white p-4">
                <h3 className="font-bold text-green-400">Installation Verified</h3>
                <p>If you see this, Storybook is working correctly.</p>
            </div>
        ),
        className: 'border border-green-500/50',
    },
};
