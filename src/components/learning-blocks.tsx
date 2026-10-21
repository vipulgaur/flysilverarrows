import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { LearningBlock } from '@/lib/learning-content';
import { InteractiveLearningImage } from './interactive-learning-image';
export function LearningBlocks({ blocks }: { blocks: LearningBlock[] }) {
 return <div className="learning-prose space-y-6">{blocks.map((block,i)=> block.type === 'image' ? <InteractiveLearningImage key={block.figure.id} figure={block.figure}/> : <ReactMarkdown key={i} remarkPlugins={[remarkGfm,remarkMath]} rehypePlugins={[rehypeKatex]} components={{table:({children})=><div className="overflow-x-auto rounded-md border"><table>{children}</table></div>}}>{block.text}</ReactMarkdown>)}</div>;
}
