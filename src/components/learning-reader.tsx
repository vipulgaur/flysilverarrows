import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Bookmark, BookOpen, CheckCircle2, ChevronRight, Clock, List, Save, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { chapterById, learningChapters, bookExtras, courseTitle, courseSubtitle } from '@/lib/learning-content';
import { courseProgress, learningRecord, saveLearningRecord } from '@/lib/learning-state';
import { useMe } from '@/lib/store';
import { LearningBlocks } from './learning-blocks';
export function LearningReader({ chapterId = 'chapter-01' }: { chapterId?: string }) {
 const { data, me, update, log } = useMe();
 const chapter = chapterById(chapterId);
 const record = learningRecord(data.learningRecords,me.id,chapterId);
 const [search,setSearch] = useState('');
 const [tab,setTab] = useState('chapter');
 const [notes,setNotes] = useState(record.notes);
 const [contentsOpen,setContentsOpen] = useState(false);
 const [active,setActive] = useState('section-1');
 const progress = courseProgress(data.learningRecords,me.id);
 const available = Boolean(chapter?.sections.length);
 const illustrationCount = chapter?.sections.flatMap(s=>s.blocks).filter(b=>b.type==='image').length ?? 0;
 function save(changes: {notes?:string; completed?:boolean; bookmarked?:boolean}, action: string) {
  update(d=>({...d,learningRecords:saveLearningRecord(d.learningRecords,me.id,chapterId,changes)}));
  log(action,'lesson',`${action.replaceAll('_',' ')} — ${chapter?.title}`,chapterId);
 }
 function jump(id:string) {setTab('chapter');setActive(id);setContentsOpen(false);setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:'instant',block:'start'}),30);log('learning_section_opened','lesson',`Opened ${id}`,chapterId);}
 return <div className="mx-auto max-w-[1440px]">
  <header className="mb-7 flex flex-wrap items-center justify-between gap-5 border-b pb-6"><div><p className="mb-2 flex items-center gap-2 text-sm text-primary"><BookOpen className="size-4"/>E-Learning</p><h1 className="text-3xl font-semibold">{courseTitle}</h1><p className="mt-2 text-sm text-muted-foreground">{courseSubtitle}</p></div><div className="w-60"><p className="mb-2 flex justify-between text-xs text-muted-foreground"><span>{progress.completed} / {progress.total} available chapters</span><span>{progress.percent}%</span></p><Progress value={progress.percent} aria-label="Available chapter progress"/></div></header>
  <Button variant="outline" className="mb-5 lg:hidden" aria-expanded={contentsOpen} onClick={()=>{setContentsOpen(!contentsOpen);log('learning_contents_toggled','lesson','Toggled course contents');}}><List/>Contents</Button>
  <div className="grid min-w-0 gap-8 lg:grid-cols-[285px_minmax(0,1fr)] xl:gap-12">
   <aside className={`${contentsOpen ? 'block' : 'hidden'} lg:block`}><div className="learning-contents lg:sticky lg:top-32"><h2 className="mb-4 flex justify-between text-sm font-semibold">Table of contents</h2><div className="relative mb-4"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input className="pl-9" aria-label="Search course contents" placeholder="Search contents" value={search} onChange={e=>setSearch(e.target.value)}/></div><nav aria-label="Course contents" className="space-y-1">
    {!search && <div className="flex justify-between px-3 py-3 text-xs text-muted-foreground"><span>Introduction</span></div>}
    {learningChapters.filter(c=>`${c.title} ${c.children.map(s=>s.title).join(' ')}`.toLowerCase().includes(search.toLowerCase())).map(c=><div key={c.id}>
     <Button asChild variant="ghost" className={`h-auto w-full justify-start whitespace-normal rounded-md px-3 py-3 text-left text-sm ${c.id === chapterId ? 'bg-accent text-accent-foreground' : ''}`}><Link to="/learning/$chapterId" params={{chapterId:c.id}} aria-current={c.id === chapterId ? 'page' : undefined} onClick={()=>{setContentsOpen(false);log('learning_opened','lesson',`Opened ${c.title}`,c.id);}}><span className="w-5 shrink-0 text-xs text-muted-foreground">{String(c.number).padStart(2,'0')}</span><span className="flex-1">{c.title}</span>{c.sections.length ? <ChevronRight className="size-3 shrink-0"/> : <Clock className="size-3 shrink-0 text-muted-foreground"/>}</Link></Button>
     {c.id === chapterId && c.sections.length > 0 && <nav aria-label="Chapter sections" className="my-2 ml-6 border-l pl-2">{c.sections.map(s=><Button key={s.id} variant="ghost" className={`h-auto w-full justify-start whitespace-normal px-3 py-2 text-left text-xs leading-5 ${active === s.id ? 'text-primary' : 'text-muted-foreground'}`} onClick={()=>jump(s.id)}>{s.title}</Button>)}</nav>}
     {c.id === chapterId && c.children.map(s=><div key={s.label} className="ml-6 flex justify-between gap-3 border-l px-3 py-2 text-xs leading-5 text-muted-foreground"><span>{s.label}. {s.title}</span></div>)}
    </div>)}
    {!search && bookExtras.slice(1).map(item=><div key={item.title} className="flex justify-between gap-3 px-3 py-3 text-xs text-muted-foreground"><span>{item.title}</span></div>)}
   </nav></div></aside>
   <main className="min-w-0 pb-12"><header className="mb-7 border-b pb-6"><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-muted-foreground">CHAPTER {chapter ? String(chapter.number).padStart(2,'0') : '—'}</p>{available && <Button variant="ghost" size="icon" aria-label={record.bookmarked ? 'Remove bookmark' : 'Bookmark chapter'} title="Bookmark chapter" aria-pressed={record.bookmarked} onClick={()=>save({bookmarked:!record.bookmarked},'learning_bookmarked')}><Bookmark className={record.bookmarked ? 'fill-primary text-primary' : ''}/></Button>}</div><h2 className="mt-3 text-3xl font-semibold leading-tight">{chapter?.title ?? 'Chapter unavailable'}</h2>{available && <p className="mt-3 text-sm text-muted-foreground">{chapter?.sections.length} sections · {illustrationCount} illustrations{record.completed && <span className="ml-3 text-success">Completed</span>}</p>}</header>
    {available && chapter ? <><Tabs value={tab} onValueChange={value=>{setTab(value);log('learning_view_changed','lesson',`Viewed ${value}`,chapterId);}}><TabsList className="mb-7"><TabsTrigger value="chapter">Chapter</TabsTrigger><TabsTrigger value="notes">My notes</TabsTrigger></TabsList><TabsContent value="chapter"><article className="space-y-12">{chapter.sections.map(s=><section key={s.id} id={s.id} className="scroll-mt-36"><h3 className="mb-5 text-xl font-semibold leading-8">{s.title}</h3><LearningBlocks blocks={s.blocks}/></section>)}</article></TabsContent><TabsContent value="notes"><label htmlFor="chapter-notes" className="mb-4 block font-semibold">My notes</label><Textarea id="chapter-notes" rows={14} value={notes} onChange={e=>setNotes(e.target.value)}/><div className="mt-4 flex items-center gap-4"><Button disabled={notes===record.notes} onClick={()=>{save({notes},'learning_notes_saved');toast.success('Notes saved');}}><Save/>Save notes</Button><span className="text-sm text-muted-foreground">{notes===record.notes ? 'Saved' : 'Unsaved changes'}</span></div></TabsContent></Tabs><footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-6"><Button variant={record.completed ? 'outline' : 'default'} onClick={()=>save({completed:!record.completed},'learning_completion_changed')}><CheckCircle2/>{record.completed ? 'Mark incomplete' : 'Mark complete'}</Button><span className="text-sm text-muted-foreground">End of Chapter {chapter.number}</span></footer></> : <div className="border-y py-16"><Clock className="mb-4 size-8 text-primary"/><h3 className="text-xl font-semibold">Awaiting chapter content</h3><p className="mt-3 text-sm text-muted-foreground">{chapter ? `Chapter ${chapter.number} is coming soon.` : 'This chapter is not part of the course.'}</p></div>}
   </main>
  </div>
 </div>;
}
