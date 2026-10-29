export const CHAT_SENDERS=Object.freeze({narrator:'От рассказчика',user:'От пользователя',bot:'От бота'});
export const sanitizeChatSender=value=>Object.hasOwn(CHAT_SENDERS,value)?value:'narrator';

/** Build a normal chat message; system-role messages are never created here. */
export function arcadeChatMessage(ctx,{text,sender='narrator',narratorName,extra}){
  sender=sanitizeChatSender(sender);
  const name=sender==='user'?(ctx.name1||'Вы'):sender==='bot'?(ctx.name2||ctx.characters?.[ctx.characterId]?.name||'Персонаж'):narratorName;
  return {name:String(name),is_user:sender==='user',is_system:false,send_date:new Date().toISOString(),mes:text,extra:{...extra,swipeable:false,...(sender==='narrator'?{type:'narrator'}:{})}};
}
