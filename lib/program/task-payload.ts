export type TaskType =
  | "ders"
  | "deneme"
  | "bras_deneme"
  | "soru_cozumu"
  | "video_izleme"
  | "tekrar"
  | "yanlis_analizi"
  | "odev"
  | "manuel"
  | "kitap_okuma";

export type TaskTitleSubject = {
  name: string;
  exam?: string | null;
};

export function pruneDetails(details: Record<string, string | number>) {
  return Object.fromEntries(
    Object.entries(details).filter(([, v]) => {
      if (v === "" || v === null || v === undefined) return false;
      if (typeof v === "number" && Number.isNaN(v)) return false;
      return true;
    })
  ) as Record<string, string | number>;
}

export function buildSuggestedTitle(
  taskType: TaskType,
  subject: TaskTitleSubject | undefined,
  topicName: string | undefined
) {
  if (taskType === "deneme") return "Deneme";
  if (taskType === "bras_deneme") {
    return subject ? `${subject.name} Branş Denemesi` : "Branş Denemesi";
  }
  if (subject && topicName) {
    const prefix = subject.exam ? `${subject.exam} ` : "";
    return `${prefix}${subject.name} — ${topicName}`;
  }
  if (subject) {
    const prefix = subject.exam ? `${subject.exam} ` : "";
    return `${prefix}${subject.name}`;
  }
  return "Ders";
}

export interface BuildTaskPayloadArgs {
  studentId: string;
  teacherId: string;
  planDate: string;
  taskType: TaskType;
  title: string;
  subjectId: number | null;
  topicId: number | null;
  studyResourceId: number | null;
  studyResourceTopicId: number | null;
  details: Record<string, string | number>;
  orderIndex: number;
  draftMode: boolean;
}

export type TaskInsertPayload = {
  student_id: string;
  teacher_id: string;
  plan_date: string;
  subject_id: number | null;
  topic_id: number | null;
  task_type: TaskType;
  title: string;
  start_time: null;
  end_time: null;
  break_minutes: null;
  order_index: number;
  is_completed: false;
  study_resource_id: number | null;
  study_resource_topic_id: number | null;
  details: Record<string, string | number>;
  is_published: boolean;
};

export function buildTaskInsertPayload(
  args: BuildTaskPayloadArgs
): TaskInsertPayload {
  // Genel Deneme derse bağlı değil — seçilmiş olsa bile null gönder.
  const isGeneralMock = args.taskType === "deneme";
  const cleanedDetails = pruneDetails(args.details);

  return {
    student_id: args.studentId,
    teacher_id: args.teacherId,
    plan_date: args.planDate,
    subject_id: isGeneralMock ? null : args.subjectId,
    topic_id: isGeneralMock ? null : args.topicId,
    task_type: args.taskType,
    title: args.title,
    start_time: null,
    end_time: null,
    break_minutes: null,
    order_index: args.orderIndex,
    is_completed: false,
    study_resource_id: args.studyResourceId,
    study_resource_topic_id: args.studyResourceTopicId,
    details: cleanedDetails,
    is_published: !args.draftMode,
  };
}
