"use client";
import {useEffect,useRef,useState} from 'react';
import {LIFE_CATEGORIES,type LifeCategoryId} from '@/lib/life-navigation';
import styles from './question-panel.module.css';

export function LifeMenu({onQuestion}:{onQuestion:(question:string)=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const opener=useRef<HTMLButtonElement>(null);
  const bodyOverflow=useRef('');
  const [category,setCategory]=useState<LifeCategoryId>();
  const selected=LIFE_CATEGORIES.find(c=>c.id===category);
  useEffect(()=>{if(dialog.current?.open)dialog.current.querySelector<HTMLButtonElement>('[data-menu-focus]')?.focus();},[category]);
  function close(){dialog.current?.close();opener.current?.focus();}
  return <>
    <button ref={opener} className={styles.menuButton} type="button" aria-haspopup="dialog" onClick={()=>{setCategory(undefined);bodyOverflow.current=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.showModal();}}><span aria-hidden="true">☰ </span>생활정보 찾기</button>
    <dialog ref={dialog} className={styles.lifeDrawer} aria-labelledby="life-menu-title" onKeyDown={event=>{
      if(event.key!=='Tab')return;
      const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      const first=buttons[0],last=buttons.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }} onClick={event=>{if(event.target===event.currentTarget)close();}} onClose={()=>{document.body.style.overflow=bodyOverflow.current;}} onCancel={event=>{event.preventDefault();close();}}>
      <div className={styles.drawerContent}>
        <div className={styles.drawerHeading}><h2 id="life-menu-title">생활정보 찾기</h2><button autoFocus className={styles.textChoice} type="button" onClick={close}>닫기</button></div>
        {selected ? <>
          <button data-menu-focus className={styles.textChoice} type="button" onClick={()=>setCategory(undefined)}>← 분야 목록</button>
          <h3>{selected.label}</h3>
          <div className={styles.exampleList}>{selected.items.map(item=><button key={item.label} type="button" onClick={()=>{close();onQuestion(item.query);}}>{item.label}</button>)}</div>
        </> : <div className={styles.exampleList}>{LIFE_CATEGORIES.map(c=><button data-menu-focus key={c.id} type="button" onClick={()=>setCategory(c.id)}>{c.label==='기타'?'청년·일자리·기타':c.label}</button>)}</div>}
        <p>분야를 고르면 필요한 안내나 공식기관으로 연결합니다.</p>
      </div>
    </dialog>
  </>;
}
