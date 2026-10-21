import { useState, type CSSProperties } from 'react';
import { useMe } from '@/lib/store';
import type { LearningFigure } from '@/lib/learning-source';
import { figureAssets } from '@/lib/learning-illustrations';

/** Static illustration; pointing at (or focusing/tapping) a numbered marker reveals what that part is. */
export function InteractiveLearningImage({ figure }: { figure: LearningFigure }) {
 const { log } = useMe();
 const [active, setActive] = useState('');
 const asset = figureAssets[figure.id];
 if (!asset) return <p role="status">Illustration being prepared.</p>;
 const width = asset.width ?? 1536, height = asset.height ?? 1024;
 const current = asset.parts.find(p => p.label === active);
 function show(label: string) { if (label !== active) { setActive(label); log('learning_part_selected','lesson',`Viewed ${label}`,figure.id); } }
 return <figure className="my-8 overflow-hidden rounded-lg border bg-card" aria-label={figure.caption}>
  <div className={`learning-still relative mx-auto ${height > width ? 'max-w-md' : 'w-full'}`} style={{'--figure-ratio':`${width} / ${height}`} as CSSProperties} onMouseLeave={() => setActive('')}>
   <img src={asset.src} width={width} height={height} loading="lazy" alt={figure.context} className="h-full w-full object-contain" />
   {asset.parts.map((part,i)=>{
    const on = part.label === active;
    return <div key={part.label} className="learning-hotspot absolute" style={{'--hotspot-x':`${part.x}%`,'--hotspot-y':`${part.y}%`} as CSSProperties}>
     <button type="button" aria-label={`Identify ${part.label}`} aria-describedby={on ? `tip-${figure.id}` : undefined} onMouseEnter={() => show(part.label)} onFocus={() => show(part.label)} onBlur={() => setActive('')} onClick={() => show(part.label)}
      className={`flex size-6 items-center justify-center rounded-full border border-primary-foreground bg-primary text-xs font-semibold text-primary-foreground shadow-md transition-transform sm:size-7 ${on ? 'scale-125' : ''}`}>{i+1}</button>
     {on && <div id={`tip-${figure.id}`} role="tooltip" className={`pointer-events-none absolute z-10 w-56 rounded-md border bg-popover p-3 text-left text-popover-foreground shadow-lg ${part.y > 60 ? 'bottom-9' : 'top-9'} ${part.x > 70 ? 'right-0' : part.x < 30 ? 'left-0' : 'left-1/2 -translate-x-1/2'}`}>
      <p className="text-sm font-semibold">{part.label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{part.description}</p>
     </div>}
    </div>;
   })}
  </div>
  <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
   <figcaption className="text-sm font-medium">{figure.caption}</figcaption>
   <span className="text-xs text-muted-foreground" aria-live="polite">{current ? current.label : 'Point at a number to identify each part'}</span>
  </div>
 </figure>;
}
