export const DURAK_TABLE_STYLES=Object.freeze({wood:'Дерево',green:'Зелёный'});
export const sanitizeDurakTableStyle=value=>typeof value==='string'&&Object.hasOwn(DURAK_TABLE_STYLES,value)?value:'wood';

export const DURAK_OUTFITS=Object.freeze({sweater:'Синяя кофта',shirt:'Рубашка'});
export const sanitizeDurakOutfit=value=>typeof value==='string'&&Object.hasOwn(DURAK_OUTFITS,value)?value:'sweater';
