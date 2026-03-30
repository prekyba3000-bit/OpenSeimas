export type SortOption =
  | "name_asc"
  | "name_desc"
  | "attendance_desc"
  | "attendance_asc"
  | "votes_desc"
  | "votes_asc";

export interface MpData {
  id: string;
  name: string;
  display_name?: string;
  vote_count?: number;
  attendance?: number;
  [key: string]: any;
}

export const sortMps = (mps: MpData[], sortBy: SortOption): MpData[] => {
  return [...mps].sort((a, b) => {
    const nameA = (a.name || a.display_name || "").toLowerCase();
    const nameB = (b.name || b.display_name || "").toLowerCase();

    // Handle missing stats safely (treat as 0)
    const attendanceA = a.attendance || 0;
    const attendanceB = b.attendance || 0;
    const votesA = a.vote_count || 0;
    const votesB = b.vote_count || 0;

    switch (sortBy) {
      case "name_asc":
        return nameA.localeCompare(nameB, "lt");
      case "name_desc":
        return nameB.localeCompare(nameA, "lt");
      case "attendance_desc":
        return attendanceB - attendanceA; // High to Low
      case "attendance_asc":
        return attendanceA - attendanceB; // Low to High
      case "votes_desc":
        return votesB - votesA;
      case "votes_asc":
        return votesA - votesB;
      default:
        return 0;
    }
  });
};

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name_asc", label: "Vardas (A-Ž)" },
  { value: "name_desc", label: "Vardas (Ž-A)" },
  { value: "attendance_desc", label: "Lankomumas (Didžiausias)" },
  { value: "attendance_asc", label: "Lankomumas (Mažiausias)" },
  { value: "votes_desc", label: "Aktyvumas (Balsai)" },
];
