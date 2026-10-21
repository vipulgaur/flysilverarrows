import { availableChapters, chapterById } from "./learning-content";
import type { LearningRecord } from "./types";
export function learningRecord(records: LearningRecord[], userId: string, chapterId: string): LearningRecord {
 return records.find(r => r.userId === userId && r.chapterId === chapterId) ?? { userId, chapterId, completed: false, bookmarked: false, notes: "", answers: {} };
}
export function saveLearningRecord(records: LearningRecord[], userId: string, chapterId: string, changes: Partial<Pick<LearningRecord, "completed" | "bookmarked" | "notes" | "answers">>): LearningRecord[] {
 const chapter = chapterById(chapterId);
 if (!chapter || chapter.sections.length === 0) return records;
 const record = { ...learningRecord(records, userId, chapterId), ...changes };
 return [...records.filter(r => r.userId !== userId || r.chapterId !== chapterId), record];
}
export function courseProgress(records: LearningRecord[], userId: string) {
 const completed = availableChapters.filter(c => learningRecord(records, userId, c.id).completed).length;
 const total = availableChapters.length;
 return { completed, total, percent: total ? Math.round(completed / total * 100) : 0 };
}
