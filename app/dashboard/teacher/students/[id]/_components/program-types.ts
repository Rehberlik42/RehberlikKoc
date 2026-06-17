export interface ProgramSubject {
  id: number;
  name: string;
  exam?: string | null;
  topics: { id: number; name: string }[];
}
