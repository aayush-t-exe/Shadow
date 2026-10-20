export type HotkeyAction =
  | 'toggle'
  | 'screenshot'
  | 'solve'
  | 'debug'
  | 'listen'
  | 'copyCode'
  | 'reset'
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight'

export interface HotkeyDef {
  action: HotkeyAction
  accelerator: string
  label: string
}

// Ctrl+Shift for actions (rarely used by LeetCode/VS Code/browsers).
// Moving uses Ctrl+Alt+Arrows because Ctrl+Shift+Arrows is "select word" in every text field.
export const HOTKEYS: HotkeyDef[] = [
  { action: 'toggle', accelerator: 'CommandOrControl+Shift+Space', label: 'Show / hide' },
  { action: 'screenshot', accelerator: 'CommandOrControl+Shift+S', label: 'Take screenshot' },
  { action: 'solve', accelerator: 'CommandOrControl+Shift+Enter', label: 'Solve / answer now' },
  { action: 'debug', accelerator: 'CommandOrControl+Shift+D', label: 'Debug with new screenshots' },
  { action: 'listen', accelerator: 'CommandOrControl+Shift+L', label: 'Start / stop listening' },
  { action: 'copyCode', accelerator: 'CommandOrControl+Shift+C', label: 'Copy last code block' },
  { action: 'reset', accelerator: 'CommandOrControl+Shift+R', label: 'Reset session' },
  { action: 'moveUp', accelerator: 'CommandOrControl+Alt+Up', label: 'Move up' },
  { action: 'moveDown', accelerator: 'CommandOrControl+Alt+Down', label: 'Move down' },
  { action: 'moveLeft', accelerator: 'CommandOrControl+Alt+Left', label: 'Move left' },
  { action: 'moveRight', accelerator: 'CommandOrControl+Alt+Right', label: 'Move right' }
]

/** "CommandOrControl+Shift+Enter" → ["Ctrl", "Shift", "↵"] for keycap rendering. */
export function keycaps(accelerator: string): string[] {
  const map: Record<string, string> = {
    CommandOrControl: 'Ctrl',
    Control: 'Ctrl',
    Enter: '↵',
    Up: '↑',
    Down: '↓',
    Left: '←',
    Right: '→'
  }
  return accelerator.split('+').map((k) => map[k] ?? k)
}

export const hotkeyFor = (action: HotkeyAction): HotkeyDef => HOTKEYS.find((h) => h.action === action)!
