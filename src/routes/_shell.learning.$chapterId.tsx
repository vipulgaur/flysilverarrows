import { createFileRoute } from '@tanstack/react-router';
import { chapterById, learningMeta } from '@/lib/learning-content';
import { LearningReader } from '@/components/learning-reader';
export const Route = createFileRoute('/_shell/learning/$chapterId')({
 head:({params})=>learningMeta(chapterById(params.chapterId)?.title ?? 'Chapter unavailable',`Flying training lesson: ${chapterById(params.chapterId)?.title ?? 'chapter unavailable'}. Flying Training chapter, personal notes and learning progress.`),
 component:ChapterPage,
});
function ChapterPage(){const {chapterId}=Route.useParams();return <LearningReader key={chapterId} chapterId={chapterId}/>;}
