import { createArcade } from './arcade.js';
import { createTavernStoryBridge } from './dnd-tavern.js';
import { createGenerationNotice } from './generation-notice.js';

const KEY = 'paw_arcade_v1';
let instance = null;
let preferences = null;
let enabled = true;
let initListener = null;
let generationNotice = null;

function context() {
  try { return globalThis.SillyTavern?.getContext?.(); }
  catch { return null; }
}

function storage() {
  return {
    load() {
      const st = context();
      if (st?.extensionSettings) return st.extensionSettings[KEY] || {};
      try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
      catch { return {}; }
    },
    save(value) {
      const st = context();
      if (st?.extensionSettings) {
        const hadPrevious=Object.hasOwn(st.extensionSettings,KEY),previous=st.extensionSettings[KEY];
        st.extensionSettings[KEY] = value;
        try{st.saveSettingsDebounced?.();}
        catch(error){if(hadPrevious)st.extensionSettings[KEY]=previous;else delete st.extensionSettings[KEY];throw error;}
      } else {
        try { localStorage.setItem(KEY, JSON.stringify(value)); }
        catch (error) { console.warn('[Paw Arcade] Browser storage is unavailable', error);throw error; }
      }
    },
  };
}

function addPreferences() {
  if (preferences?.isConnected || !instance) return;
  const container = document.querySelector('#extensions_settings2, #extensions_settings');
  if (!container) return;
  preferences = document.createElement('div');
  preferences.id = 'paw-arcade-preferences';
  preferences.className = 'extension_container';
  preferences.innerHTML = `<div class="inline-drawer">
    <div class="inline-drawer-toggle inline-drawer-header"><b>Кошачья аркада</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>
    <div class="inline-drawer-content">
      <label class="checkbox_label"><input type="checkbox" class="paw-enabled"><span>Показывать кнопку с лапкой</span></label>
      <div class="flex-container"><button type="button" class="menu_button paw-open">Открыть игры</button><button type="button" class="menu_button paw-reset">Вернуть кнопку</button></div>
      <small>Нажатие на лапку — открыть или свернуть игру. Удержание — меню. Синяя лапка — генерация завершилась. Лапка и окно перемещаются независимо. Окно можно перетащить за полоску сверху; обе позиции сохраняются.</small>
    </div></div>`;
  const toggle = preferences.querySelector('.paw-enabled');
  toggle.checked = instance.isEnabled();
  toggle.addEventListener('change', () => instance?.setEnabled(toggle.checked));
  preferences.querySelector('.paw-open').addEventListener('click', () => {
    instance?.setEnabled(true); toggle.checked = true; instance?.show();
  });
  preferences.querySelector('.paw-reset').addEventListener('click', () => {
    instance?.setEnabled(true); toggle.checked = true; instance?.resetPosition();
  });
  container.append(preferences);
}

function mount() {
  if (!enabled || instance) return;
  const bridge=createTavernStoryBridge({getContext:context});
  try{instance=createArcade({...storage(),storyBridge:bridge});}
  catch(error){bridge.destroy();throw error;}
  generationNotice=createGenerationNotice({getContext:context,
    onComplete:()=>instance?.notifyGenerationComplete(),onClear:()=>instance?.clearGenerationNotice(),
  });
  addPreferences();
}

function initialize() {
  if (document.readyState === 'loading') {
    if (!initListener) {
      initListener = () => { initListener = null; mount(); };
      document.addEventListener('DOMContentLoaded', initListener, { once: true });
    }
  } else mount();
}

export function onActivate() { enabled = true; initialize(); }
export function onEnable() { enabled = true; initialize(); }
export function onDisable() {
  enabled = false;
  if (initListener) document.removeEventListener('DOMContentLoaded', initListener);
  initListener = null;
  generationNotice?.destroy(); generationNotice = null;
  instance?.destroy(); instance = null;
  preferences?.remove(); preferences = null;
}
export function onDelete() { onDisable(); }
export function onClean() {
  const wasEnabled = enabled;
  onDisable();
  const st = context();
  if (st?.extensionSettings) {
    delete st.extensionSettings[KEY]; st.saveSettingsDebounced?.();
  } else {
    try { localStorage.removeItem(KEY); } catch { /* storage disabled */ }
  }
  if (wasEnabled) onEnable();
}

// Older clients do not call lifecycle hooks; importing the entry point also mounts once.
initialize();
