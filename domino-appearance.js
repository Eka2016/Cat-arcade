export const DOMINO_PIECE_STYLES=Object.freeze({dark:'Тёмный',green:'Зелёный'});

export function sanitizeDominoPieceStyle(value){return value==='green'?'green':'dark';}
