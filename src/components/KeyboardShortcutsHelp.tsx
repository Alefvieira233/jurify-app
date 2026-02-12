import React from 'react';

interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    callback: () => void;
    description: string;
}

export const KeyboardShortcutsHelp: React.FC<{ shortcuts: KeyboardShortcut[] }> = ({ shortcuts }) => {
    return (
        <div className="space-y-2">
            <h3 className="font-semibold text-sm text-gray-900">Atalhos de Teclado</h3>
            <div className="space-y-1">
                {shortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{shortcut.description}</span>
                        <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-gray-800 font-mono">
                            {shortcut.ctrl && 'Ctrl + '}
                            {shortcut.shift && 'Shift + '}
                            {shortcut.alt && 'Alt + '}
                            {shortcut.key.toUpperCase()}
                        </kbd>
                    </div>
                ))}
            </div>
        </div>
    );
};
