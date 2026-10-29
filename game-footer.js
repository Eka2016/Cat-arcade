/** One compact footer row: settings on the left, existing rules and optional metadata on the right. */
export function createGameFooter(container,{removeHeader=false,metaSelector,onRestart,signal}={}){
  const existing=container.querySelector(':scope > .game-footer');if(existing)return existing;
  const doc=container.ownerDocument,view=doc.defaultView,footer=doc.createElement('div'),help=doc.createElement('div');
  footer.className='game-footer';help.className='game-footer-help';
  const rules=container.querySelector('.dice-rules,.poker-rules,.tablegame-rules'),header=rules?.closest('.dice-top,.poker-top,.tablegame-top'),meta=metaSelector?container.querySelector(metaSelector):null;
  if(meta){meta.classList.add('game-footer-meta');meta.textContent=meta.textContent.replace(/\s*\/\s*/g,'/');help.append(meta);}
  if(rules){rules.classList.add('game-help');rules.querySelector('summary').title='Правила игры';rules.querySelector('.rules-body,.poker-rules-body,.tablegame-rules-body').classList.add('game-help-body');help.append(rules);}
  const restart=typeof onRestart==='function'?container.querySelector(':scope > .tablegame-new'):null;
  if(restart){restart.classList.add('game-restart');restart.setAttribute('aria-label','Новая партия');restart.title='Новая партия';restart.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 10a7.8 7.8 0 1 1 .6 6.7M4.5 10V4m0 6h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';help.prepend(restart);restart.addEventListener('click',()=>{if(rules)rules.open=false;onRestart();},{signal});}
  footer.dataset.meta=String(!!meta);footer.dataset.restart=String(!!restart);footer.dataset.help=String(!!rules||!!meta||!!restart);help.hidden=!rules&&!meta&&!restart;footer.append(help);container.append(footer);
  if(removeHeader)header?.remove();
  function fit(){
    if(!rules?.open)return;
    const panel=footer.closest('.panel')||container,top=Math.max(panel.getBoundingClientRect().top,view?.visualViewport?.offsetTop||0)+8;
    footer.style.setProperty('--game-help-max-height',`${Math.max(80,Math.min(300,footer.getBoundingClientRect().top-top-6))}px`);
  }
  // Footer controls must not resume a paused game or trigger its touch handler.
  for(const type of ['pointerdown','pointerup','click'])help.addEventListener(type,e=>e.stopPropagation(),{signal});
  help.addEventListener('keydown',e=>{if(e.key==='Escape'&&rules?.open){e.preventDefault();rules.open=false;rules.querySelector('summary').focus({preventScroll:true});}e.stopPropagation();},{signal});
  rules?.addEventListener('toggle',fit,{signal});
  container.addEventListener('pointerdown',e=>{if(rules?.open&&!help.contains(e.target))rules.open=false;},{capture:true,signal});
  view?.addEventListener('resize',fit,{signal});view?.visualViewport?.addEventListener('resize',fit,{signal});
  return footer;
}
