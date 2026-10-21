import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import { InteractiveLearningImage } from '@/components/interactive-learning-image';
const {log}=vi.hoisted(()=>({log:vi.fn()}));
vi.mock('@/lib/store',()=>({useMe:()=>({log})}));
afterEach(()=>{cleanup();log.mockClear();});
const figure={id:'Fig-01-01',caption:'Figure 1-1 The aeroplane',context:'Aircraft airframe',prompt:'',labels:[]};
describe('Interactive learning illustrations',()=>{
 it('reveals a part on hover and hides it on leave, keeping the still image',()=>{render(<InteractiveLearningImage figure={figure}/>);const b=screen.getByRole('button',{name:'Identify Rudder'});fireEvent.mouseEnter(b);expect(screen.getByRole('tooltip')).toHaveTextContent('Controls yaw');expect(screen.getByAltText('Aircraft airframe')).toBeVisible();expect(log).toHaveBeenCalledWith('learning_part_selected','lesson','Viewed Rudder','Fig-01-01');fireEvent.mouseLeave(screen.getByAltText('Aircraft airframe').parentElement as HTMLElement);expect(screen.queryByRole('tooltip')).toBeNull();});
 it('reveals a part on keyboard focus',()=>{render(<InteractiveLearningImage figure={{...figure,id:'Fig-03-05',context:'Clock code'}}/>);fireEvent.focus(screen.getByRole('button',{name:'Identify 3'}));expect(screen.getByRole('tooltip')).toHaveTextContent('Off the right wingtip.');});
 it('has no animation controls',()=>{render(<InteractiveLearningImage figure={figure}/>);expect(screen.queryByRole('button',{name:/animation/i})).toBeNull();});
});
