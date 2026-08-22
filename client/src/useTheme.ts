import type { CSSProperties } from 'react';
import type { Theme } from './types';

export function useThemeColors(theme: Theme) {
    const isDark = theme === 'dark';
    return {
        isDark,
        bgPage: isDark ? '#020617' : '#f8fafc',
        bgCard: isDark ? '#0f172a' : '#ffffff',
        bgInput: isDark ? '#1e293b' : '#f1f5f9',
        text: isDark ? '#ffffff' : '#0f172a',
        border: isDark ? '#ffffff' : '#0f172a',
        borderMuted: isDark ? '#475569' : '#cbd5e1',
        gridBg: isDark ? '#0f172a' : '#f1f5f9',
        gridDot: isDark ? '#334155' : '#cbd5e1',
    };
}

export const getBtnStyle = (borderColor: string, textColor: string): CSSProperties => ({
    width: '100%',
    padding: '10px 16px',
    backgroundColor: 'transparent',
    color: textColor,
    border: `2px solid ${borderColor}`,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 'bold',
    cursor: 'pointer',
    textTransform: 'uppercase',
    boxSizing: 'border-box',
});

export const getInputStyle = (bgColor: string, borderColor: string, textColor: string): CSSProperties => ({
    width: '100%',
    padding: 8,
    backgroundColor: bgColor,
    border: `1px solid ${borderColor}`,
    color: textColor,
    borderRadius: 6,
    boxSizing: 'border-box',
});