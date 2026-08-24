import React, { useEffect, useRef, useState } from 'react';
import { useThemeColors } from './useTheme';
import type { Theme, Lang } from './types';
import { useT } from './i18n';

export interface ChatEntry {
    kind: 'chat' | 'system';
    user?: string;
    text: string;
    timestampMs: number;
}

interface ChatPanelProps {
    theme: Theme;
    lang: Lang;
    roomUsers: string[];
    messages: ChatEntry[];
    onSend: (text: string) => void;
}

function formatTime(ms: number) {
    const d = new Date(ms);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ theme, lang, roomUsers, messages, onSend }) => {
    const colors = useThemeColors(theme);
    const t = useT(lang);
    const [collapsed, setCollapsed] = useState(false);
    const [draft, setDraft] = useState('');
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages, collapsed]);

    const submit = () => {
        const text = draft.trim();
        if (!text) return;
        onSend(text);
        setDraft('');
    };

    return (
        <div
            style={{
                position: 'absolute',
                bottom: 12,
                left: 12,
                zIndex: 15,
                width: 260,
                backgroundColor: 'rgba(20,20,24,0.72)',
                backdropFilter: 'blur(6px)',
                border: `1px solid ${colors.borderMuted}`,
                borderRadius: 10,
                color: '#f4f4f5',
                fontFamily: 'sans-serif',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            <div
                onClick={() => setCollapsed((c) => !c)}
                style={{
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 'bold',
                    borderBottom: collapsed ? 'none' : `1px solid ${colors.borderMuted}`,
                }}
            >
                <span>💬 {t.chat} · {roomUsers.length} {t.online}</span>
                <span>{collapsed ? '▲' : '▼'}</span>
            </div>

            {!collapsed && (
                <>
                    <div
                        style={{
                            padding: '6px 12px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 4,
                            borderBottom: `1px solid ${colors.borderMuted}`,
                            maxHeight: 52,
                            overflowY: 'auto',
                        }}
                    >
                        {roomUsers.map((u) => (
                            <span
                                key={u}
                                style={{
                                    fontSize: 10,
                                    padding: '2px 6px',
                                    borderRadius: 999,
                                    backgroundColor: 'rgba(59,130,246,0.25)',
                                    color: '#93c5fd',
                                }}
                            >
                                {u}
                            </span>
                        ))}
                    </div>

                    <div
                        ref={listRef}
                        style={{
                            padding: '8px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            height: 180,
                            overflowY: 'auto',
                            fontSize: 12,
                        }}
                    >
                        {messages.length === 0 && (
                            <span style={{ color: '#71717a', fontSize: 11 }}>{t.noMessages}</span>
                        )}
                        {messages.map((m, i) =>
                            m.kind === 'system' ? (
                                <div key={i} style={{ color: '#71717a', fontSize: 11, fontStyle: 'italic' }}>
                                    {m.text}
                                </div>
                            ) : (
                                <div key={i}>
                                    <span style={{ color: '#93c5fd', fontWeight: 'bold' }}>{m.user}</span>
                                    <span style={{ color: '#52525b', fontSize: 10 }}> {formatTime(m.timestampMs)}</span>
                                    <div>{m.text}</div>
                                </div>
                            )
                        )}
                    </div>

                    <div style={{ display: 'flex', borderTop: `1px solid ${colors.borderMuted}` }}>
                        <input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') submit();
                            }}
                            placeholder={t.chatPlaceholder}
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                background: 'transparent',
                                border: 'none',
                                color: '#f4f4f5',
                                fontSize: 12,
                                outline: 'none',
                            }}
                        />
                        <button
                            onClick={submit}
                            style={{
                                padding: '0 14px',
                                background: 'transparent',
                                border: 'none',
                                color: '#3b82f6',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                            }}
                        >
                            ➤
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};