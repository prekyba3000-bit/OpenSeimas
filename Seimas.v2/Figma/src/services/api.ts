import { 
  MP, 
  Vote, 
  PlayerStats, 
  MatchResult, 
  RankedEntry,
  ApiResponse 
} from '../types';
import { 
  MOCK_MPS, 
  MOCK_STATS, 
  MOCK_VOTES, 
  MOCK_MATCH_RESULT, 
  MOCK_RANKED_LADDER 
} from './mocks';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const USE_MOCKS = true; // Flag to toggle mock data

/**
 * Generic request wrapper for the API.
 * Handles JSON parsing and error throwing.
 */
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error(`Request failed for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * API Service Methods
 */
export const api = {
  /**
   * Fetches high-level dashboard statistics
   * Endpoint: /stats
   */
  getDashboardStats: async (): Promise<{
    active_legislation: number;
    avg_attendance: number;
    top_performer: MP;
  }> => {
    if (USE_MOCKS) {
      await new Promise(r => setTimeout(r, 600)); // Simulate network latency
      return {
        active_legislation: 12,
        avg_attendance: 94.2,
        top_performer: MOCK_MPS[0]
      };
    }
    return request('/stats');
  },

  /**
   * Fetches the Ranked Ladder (Leaderboard)
   * Endpoint: /mps
   */
  getLeaderboard: async (): Promise<RankedEntry[]> => {
    if (USE_MOCKS) {
      await new Promise(r => setTimeout(r, 800));
      return MOCK_RANKED_LADDER;
    }
    const mps = await request<MP[]>('/mps');
    // In a real scenario, the backend might return the ranked entry structure directly.
    // If it returns just MPs, we might need to transform it here.
    // Assuming backend returns RankedEntry[] for this specific call for now.
    return mps as unknown as RankedEntry[]; 
  },

  /**
   * Fetches a specific MP's profile ("Champion Profile")
   * Endpoint: /mps/{id}
   */
  getChampionProfile: async (id: string): Promise<{ mp: MP; stats: PlayerStats }> => {
    if (USE_MOCKS) {
      await new Promise(r => setTimeout(r, 500));
      const mp = MOCK_MPS.find(m => m.id === id) || MOCK_MPS[0];
      return { mp, stats: MOCK_STATS };
    }
    return request(`/mps/${id}`);
  },

  /**
   * Fetches the Match History (Votes)
   * Endpoint: /votes
   */
  getMatchHistory: async (limit: number = 20): Promise<Vote[]> => {
    if (USE_MOCKS) {
      await new Promise(r => setTimeout(r, 700));
      return MOCK_VOTES.slice(0, limit);
    }
    return request(`/votes?limit=${limit}`);
  },

  /**
   * Fetches comparison data between two MPs
   * Endpoint: /mps/compare
   */
  getComparison: async (idA: string, idB: string): Promise<{
    mpA: { mp: MP; stats: PlayerStats };
    mpB: { mp: MP; stats: PlayerStats };
    common_votes: number;
    agreement_rate: number;
  }> => {
    if (USE_MOCKS) {
      await new Promise(r => setTimeout(r, 1000));
      const mpA = MOCK_MPS.find(m => m.id === idA) || MOCK_MPS[0];
      const mpB = MOCK_MPS.find(m => m.id === idB) || MOCK_MPS[1];
      
      return {
        mpA: { mp: mpA, stats: MOCK_STATS },
        mpB: { mp: mpB, stats: { ...MOCK_STATS, attendance_rate: 85, kda_ratio: 10.5 } },
        common_votes: 142,
        agreement_rate: 76
      };
    }
    return request(`/mps/compare?a=${idA}&b=${idB}`);
  }
};
