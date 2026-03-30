const apiUrl = import.meta.env.VITE_API_URL as string | undefined;

if (!apiUrl) {
  throw new Error("Missing required VITE_API_URL environment variable");
}

export const API_URL = apiUrl;
