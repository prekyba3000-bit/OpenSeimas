import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within, userEvent, screen } from '@storybook/test';
import { http, HttpResponse, delay } from 'msw';
import MpProfileView from '../views/MpProfileView';
import { API_URL } from '../config';

// --- Types & Mock Data ---

const mockMp = {
    id: '123',
    name: 'Andrius Kubilius',
    party: 'Tėvynės sąjunga',
    photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Andrius_Kubilius_2019.jpg/440px-Andrius_Kubilius_2019.jpg',
    active: true,
    vote_count: 1543,
    attendance: 98,
    loyalty: 100,
    term_start: '2020-11-14',
    seimas_id: '123'
};

const mockVotes = [
    { title: 'Law on Tax Reform', date: '2024-03-15', choice: 'Už' },
    { title: 'Budget Allocation 2024', date: '2024-02-20', choice: 'Prieš' },
    { title: 'Education Policy Amendment', date: '2024-01-10', choice: 'Susilaikė' },
    { title: 'Energy Sector Regulations', date: '2023-12-05', choice: 'Nedalyvavo' },
];

// --- Decorators ---

const ThemeDecorator = (Story: any) => (
    <div className="bg-[#0a0a0c] min-h-screen text-white p-8">
        <Story />
    </div>
);

// --- Meta Configuration ---

const meta = {
    title: 'Views/MpProfileView (Advanced)',
    component: MpProfileView,
    parameters: {
        layout: 'fullscreen',
        backgrounds: { default: 'dark' },
        docs: {
            description: {
                component: 'Primary profile view for Members of Parliament. Displays biographical data, statistics, and recent voting history. Handles data fetching internally.'
            }
        },
    },
    decorators: [ThemeDecorator],
    tags: ['autodocs'],
    argTypes: {
        mpId: {
            control: 'text',
            description: 'ID of the MP to fetch',
            table: {
                defaultValue: { summary: '123' },
            }
        }
    }
} satisfies Meta<typeof MpProfileView>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Stories ---

/**
 * **Default State**: Simulates a successful API response with complete MP data and voting history.
 * Verifies that all profile sections are rendered correctly.
 */
export const Default: Story = {
    args: {
        mpId: '123',
    },
    parameters: {
        msw: {
            handlers: [
                http.get(`${API_URL}/api/mps/123`, () => {
                    return HttpResponse.json(mockMp);
                }),
                http.get(`${API_URL}/api/mps/123/votes`, () => {
                    return HttpResponse.json(mockVotes);
                }),
            ],
        },
    },
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);

        await step('Verify Profile Header', async () => {
            await expect(await canvas.findByText('Andrius Kubilius')).toBeInTheDocument();
            await expect(await canvas.findByText('Tėvynės sąjunga')).toBeInTheDocument();
            await expect(await canvas.findByText('ACTIVE')).toBeInTheDocument();
        });

        await step('Verify Stats', async () => {
            await expect(await canvas.findByText('98%')).toBeInTheDocument(); // Attendance
            await expect(await canvas.findByText('100%')).toBeInTheDocument(); // Loyalty
        });

        await step('Verify Voting History', async () => {
            await expect(canvas.getByText('Law on Tax Reform')).toBeInTheDocument();
            await expect(canvas.getByText('Už')).toBeInTheDocument();
        });

        await step('Accessibility Check', async () => {
            // Basic check - ensuring main landmarks are present
            // More rigorous checks usually via addon-a11y panel which runs automatically
            await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent('Andrius Kubilius');
        });
    },
};


/**
 * **Loading State**: Forces an infinite loading state to verify the suspense UI.
 * Uses MSW `delay('infinite')`.
 */
export const Loading: Story = {
    args: { ...Default.args },
    parameters: {
        msw: {
            handlers: [
                http.get(`${API_URL}/api/mps/123`, async () => {
                    await delay('infinite');
                    return HttpResponse.json(mockMp);
                }),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Loading profile data...')).toBeInTheDocument();
    }
};


/**
 * **Empty State**: Simulates a valid MP profile with NO voting history.
 * Verifies the empty state message is displayed.
 */
export const EmptyHistory: Story = {
    args: { ...Default.args },
    parameters: {
        msw: {
            handlers: [
                http.get(`${API_URL}/api/mps/123`, () => HttpResponse.json(mockMp)),
                http.get(`${API_URL}/api/mps/123/votes`, () => HttpResponse.json([])), // Empty array
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Andrius Kubilius')).toBeInTheDocument();
        await expect(await canvas.findByText('No voting records available for this term.')).toBeInTheDocument();
    }
};


/**
 * **Error Boundary (User Not Found)**: Simulates a 404 error from the API.
 * Verifies the error message and back navigation button.
 */
export const UserNotFound: Story = {
    args: { mpId: '999' },
    parameters: {
        msw: {
            handlers: [
                http.get(`${API_URL}/api/mps/999`, () => {
                    return new HttpResponse(null, { status: 404 });
                }),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('MP not found')).toBeInTheDocument();
        const backButton = canvas.getByRole('button', { name: /Back to list/i });
        await expect(backButton).toBeInTheDocument();
    }
};


/**
 * **Responsive Mobile**: Validates layout on a small viewport.
 */
export const MobileLayout: Story = {
    ...Default,
    parameters: {
        ...Default.parameters,
        viewport: {
            defaultViewport: 'mobile1', // Basic Storybook viewport
        },
    },
};
