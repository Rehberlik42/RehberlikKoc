export type MistakeCauseType = "dikkatsizlik" | "bilgi_eksigi";

export interface QuickAddRow {
  id: string;
  questionNumber: string;
  causeType: MistakeCauseType;
}

export interface MistakeSubjectOption {
  id: number;
  name: string;
  exam_id: number;
  examName: string | null;
  color: string | null;
  topics: {
    id: number;
    name: string;
    order_index: number | null;
    parent_id: number | null;
  }[];
}

export interface MistakeResourceOption {
  id: number;
  name: string;
}
