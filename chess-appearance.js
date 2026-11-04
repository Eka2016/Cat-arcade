export const CHESS_BOARD_STYLES=Object.freeze({wood:'Тёмное дерево',fantasy:'Фэнтези'});
export const sanitizeChessBoardStyle=value=>typeof value==='string'&&Object.hasOwn(CHESS_BOARD_STYLES,value)?value:'wood';
