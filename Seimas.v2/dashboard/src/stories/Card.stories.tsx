import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from '../components/Card';

const meta = {
    title: 'Components/Card',
    component: Card,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
    },
    tags: ['autodocs'],
    argTypes: {
        hover: { control: 'boolean' },
    },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        children: (
            <div className="text-gray-200">
                <h3 className="text-lg font-bold mb-2">Card Title</h3>
                <p>This is a standard card component with some content inside.</p>
            </div>
        ),
        className: 'w-80',
    },
};

export const WithHover: Story = {
    args: {
        children: (
            <div className="text-gray-200">
                <h3 className="text-lg font-bold mb-2">Hover Me</h3>
                <p>This card has a hover effect enabled.</p>
            </div>
        ),
        hover: true,
        className: 'w-80 cursor-pointer',
    },
};
