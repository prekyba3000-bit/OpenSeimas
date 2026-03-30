import type { Meta, StoryObj } from '@storybook/react-vite';
import { DashboardView } from '../views/DashboardView';

const meta = {
    title: 'Views/Dashboard',
    component: DashboardView,
    parameters: {
        layout: 'fullscreen',
        backgrounds: { default: 'dark' },
    },
    // Mock API responses would be handled by MSW or similar in a real setup,
    // for now we rely on the component handling empty/loading states gracefully or mocking fetch globally if needed.
    // DashboardView fetches on mount, so without mocks it might fail or show loading forever.
    // For this demonstration, we assume it's acceptable for verification of layout.
} satisfies Meta<typeof DashboardView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
