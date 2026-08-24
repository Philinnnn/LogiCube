import React, { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GateNodeData } from './circuitTypes';
import { GATE_ARITY } from './circuitTypes';
import { inHandleId, OUT_HANDLE } from './gateLogic';
import { useThemeColors } from './useTheme';
import type { Theme, Lang } from './types';
import { useT } from './i18n';

const GATE_GLYPH: Record<string, string> = {
    AND: 'AND',
    OR: 'OR',
    NOT: 'NOT',
    XOR: 'XOR',
    NOR: 'NOR',
    NAND: 'NAND',
};

interface ExtraNodeCtx {
    computedValue?: boolean;
    displayValue?: number;
    isRunMode?: boolean;
    onToggleInput?: (nodeId: string) => void;
    onRenameNode?: (nodeId: string, newLabel: string) => void;
    theme?: Theme;
    lang?: Lang;
}

type Props = NodeProps & { data: GateNodeData & ExtraNodeCtx };

function valueColor(v: boolean | undefined, isDark: boolean) {
    if (v === undefined) return isDark ? '#52525b' : '#a1a1aa';
    return v ? '#22c55e' : '#71717a';
}

function SwitchIcon({ on }: { on: boolean }) {
    return (
        <svg width="34" height="18" viewBox="0 0 34 18">
            <rect x="0" y="0" width="34" height="18" rx="9" fill={on ? '#16a34a' : '#3f3f46'} />
            <circle cx={on ? 25 : 9} cy="9" r="7" fill="#f4f4f5" />
        </svg>
    );
}

function LampIcon({ on }: { on: boolean }) {
    const glow = on ? '#facc15' : '#52525b';
    return (
        <svg width="26" height="26" viewBox="0 0 26 26">
            {on && <circle cx="13" cy="10" r="11" fill={glow} opacity="0.35" />}
            <circle cx="13" cy="10" r="8" fill={glow} stroke="#3f3f46" strokeWidth="1" />
            <path d="M9 18 L9 20 L17 20 L17 18 Z" fill="#71717a" />
            <path d="M10 20 L10 22 L16 22 L16 20 Z" fill="#52525b" />
        </svg>
    );
}

interface EditableLabelProps {
    label: string;
    fontSize: number;
    color?: string;
    onRename?: (newLabel: string) => void;
    renameHint: string;
}

function EditableLabel({ label, fontSize, color, onRename, renameHint }: EditableLabelProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(label);

    const commit = () => {
        setEditing(false);
        const trimmed = draft.trim();
        if (onRename && trimmed && trimmed !== label) {
            onRename(trimmed);
        } else {
            setDraft(label);
        }
    };

    if (editing) {
        return (
            <input
                className="nodrag"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') commit();
                    if (e.key === 'Escape') {
                        setDraft(label);
                        setEditing(false);
                    }
                }}
                onClick={(e) => e.stopPropagation()}
                maxLength={12}
                style={{
                    width: 64,
                    fontSize,
                    fontFamily: 'sans-serif',
                    fontWeight: 600,
                    textAlign: 'center',
                    border: '1px solid #3b82f6',
                    borderRadius: 4,
                    padding: '1px 4px',
                    color: '#111',
                }}
            />
        );
    }

    return (
        <span
            onDoubleClick={(e) => {
                e.stopPropagation();
                setDraft(label);
                setEditing(true);
            }}
            title={renameHint}
            style={{ fontSize, color, cursor: 'text' }}
        >
            {label}
        </span>
    );
}

export const GateNode = memo(({ id, data, selected }: Props) => {
    const theme: Theme = data.theme ?? 'dark';
    const lang: Lang = data.lang ?? ('RU' as Lang);
    const colors = useThemeColors(theme);
    const t = useT(lang);
    const { gateType, label, computedValue, displayValue, isRunMode, onToggleInput, onRenameNode } = data;
    const arity = GATE_ARITY[gateType] ?? { inputs: 0, hasOutput: false };

    if (!GATE_ARITY[gateType]) {
        return (
            <div
                style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '2px dashed #ef4444',
                    color: '#ef4444',
                    fontFamily: 'sans-serif',
                    fontSize: 11,
                    backgroundColor: colors.bgCard,
                }}
            >
                {t.unknownNode}
            </div>
        );
    }
    const isDark = colors.isDark ?? theme === 'dark';

    const isInput = gateType === 'INPUT';
    const isOutput = gateType === 'OUTPUT';
    const isDisplay = gateType === 'DISPLAY4';
    const dotColor = valueColor(isInput ? data.value : computedValue, isDark);

    const baseStyle: React.CSSProperties = {
        minWidth: isInput || isOutput ? 90 : isDisplay ? 96 : 64,
        padding: isDisplay ? '10px 12px' : '10px 14px',
        borderRadius: isInput || isOutput ? 20 : isDisplay ? 8 : 10,
        border: `2px solid ${selected ? '#3b82f6' : colors.borderMuted}`,
        backgroundColor: colors.bgCard,
        color: colors.text,
        fontFamily: 'sans-serif',
        fontSize: 13,
        fontWeight: 600,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        boxShadow: selected ? '0 0 0 3px rgba(59,130,246,0.25)' : '0 1px 3px rgba(0,0,0,0.2)',
        cursor: isInput && isRunMode ? 'pointer' : 'default',
        userSelect: 'none',
        position: 'relative',
    };

    const handleCount = arity.inputs;
    const inputHandles = Array.from({ length: handleCount }, (_, i) => {
        const topPct = handleCount === 1 ? 50 : ((i + 1) * 100) / (handleCount + 1);
        return (
            <Handle
                key={i}
                id={inHandleId(i)}
                type="target"
                position={Position.Left}
                style={{
                    top: `${topPct}%`,
                    background: colors.borderMuted,
                    width: 11,
                    height: 11,
                    border: `2px solid ${colors.bgCard}`,
                }}
            />
        );
    });

    const renameHandler = onRenameNode ? (newLabel: string) => onRenameNode(id, newLabel) : undefined;

    let content: React.ReactNode;

    if (isInput) {
        content = (
            <>
                <EditableLabel label={label} fontSize={12} onRename={renameHandler} renameHint={t.renameHint} />
                <SwitchIcon on={!!data.value} />
            </>
        );
    } else if (isOutput) {
        content = (
            <>
                <LampIcon on={computedValue === true} />
                <EditableLabel label={label} fontSize={12} onRename={renameHandler} renameHint={t.renameHint} />
            </>
        );
    } else if (isDisplay) {
        content = (
            <>
                <div
                    style={{
                        fontFamily: 'monospace',
                        fontSize: 22,
                        fontWeight: 'bold',
                        letterSpacing: 2,
                        color: '#f97316',
                        textShadow: '0 0 8px #f97316',
                        backgroundColor: '#0a0a0a',
                        border: '2px solid #3f3f46',
                        padding: '2px 10px',
                        borderRadius: 4,
                        minWidth: 46,
                        textAlign: 'center',
                    }}
                >
                    {String(displayValue ?? 0).padStart(2, '0')}
                </div>
                <span style={{ fontSize: 10, color: colors.text, opacity: 0.7 }}>{label}</span>
            </>
        );
    } else {
        content = (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                    style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        backgroundColor: dotColor,
                        boxShadow: computedValue ? `0 0 6px ${dotColor}` : 'none',
                        flexShrink: 0,
                    }}
                />
                <span>{GATE_GLYPH[gateType]}</span>
            </div>
        );
    }

    return (
        <div
            style={baseStyle}
            onClick={() => {
                if (isInput && isRunMode && onToggleInput) onToggleInput(id);
            }}
            title={isInput && isRunMode ? t.toggleHint : undefined}
        >
            {inputHandles}
            {content}
            {arity.hasOutput && (
                <Handle
                    id={OUT_HANDLE}
                    type="source"
                    position={Position.Right}
                    style={{
                        background: colors.borderMuted,
                        width: 11,
                        height: 11,
                        border: `2px solid ${colors.bgCard}`,
                    }}
                />
            )}
        </div>
    );
});

GateNode.displayName = 'GateNode';

export const nodeTypes = { gateNode: GateNode };