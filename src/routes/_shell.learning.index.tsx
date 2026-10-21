import { createFileRoute } from '@tanstack/react-router';
import { learningMeta } from '@/lib/learning-content';
import { LearningReader } from '@/components/learning-reader';
export const Route = createFileRoute('/_shell/learning/')({
 head:()=>learningMeta('Private Pilot Ground School','Interactive flying training lessons with labelled diagrams, notes and progress across 19 chapters.'),
 component:()=> <LearningReader/>,
});
