// A bounded, alternating path keeps all 28 tiles on the table, including both ends.
// Coordinates are independent of screen pixels; the UI scales the same layout on phones.
export function layoutDominoChain(chain){
  const width=520,columns=5,pitchX=94,pitchY=82,count=chain.length;
  if(count>28)throw new RangeError('Too many dominoes');
  const rows=Math.ceil((count+2)/columns),height=Math.max(280,rows*pitchY+40);
  const firstY=(height-(rows-1)*pitchY)/2;
  function slot(index){
    const row=Math.floor(index/columns),offset=index%columns,reverse=row%2===1;
    const firstX=rows===1?(width-(count+1)*pitchX)/2:72;
    return {x:firstX+(reverse?columns-1-offset:offset)*pitchX,y:firstY+row*pitchY,reverse};
  }
  if(!count)return {width,height,tiles:[],left:null,right:{x:width/2,y:height/2},path:''};
  const tiles=chain.map((tile,index)=>({...slot(index+1),index,id:tile.id,double:tile.a===tile.b}));
  const left=slot(0),right=slot(count+1),points=[left,...tiles,right];
  return {width,height,tiles,left,right,path:points.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' ')};
}
