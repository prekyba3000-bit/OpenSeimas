import type { Meta, StoryObj } from '@storybook/react-vite';
import { Header } from '../components/Header';
import { BrowserRouter } from 'react-router-dom'; // Mock router context if needed, but Header uses <a> currently

// Wrapper to provide any context if Header changes to use Link
const HeaderWrapper = (args: any) => (
    <div className="w-full max-w-5xl mx-auto p-4">
        <Header {...args} />
    </div>
);

const meta = {
    title: 'Components/Header',
    component: Header,
    render: (args) => <HeaderWrapper {...args} />,
    parameters: {
        layout: 'fullscreen',
        backgrounds: { default: 'dark' },
    },
    tags: ['autodocs'],
    argTypes: {
        view: {
            control: { type: 'select' },
            options: ['dashboard', 'mps-list', 'votes-list', 'compare'],
        },
    },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DashboardActive: Story = {
    args: {
        view: 'dashboard',
    },
};

export const MPsActive: Story = {
    args: {
        view: 'mps-list',
    },
};

export const VotesActive: Story = {
    args: {
        view: 'votes-list',
    },
};

export const CompareActive: Story = {
    args: {
        view: 'compare',
    },
};
