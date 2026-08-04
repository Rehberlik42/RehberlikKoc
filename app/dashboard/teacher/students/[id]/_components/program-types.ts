export interface ProgramSubject {
  id: number;
  name: string;
  exam?: string | null;
  color?: string | null;
  topics: { id: number; name: string; parent_id: number | null }[];
}
