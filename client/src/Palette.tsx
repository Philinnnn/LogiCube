import React from 'react';
import type { Node } from '@xyflow/react';
import type { GateNodeData, GateType } from './circuitTypes';
import { useThemeColors } from './useTheme';
import type { Theme, Lang } from './types';
import { useT } from './i18n';

const GATE_LABEL: Partial<Record<GateType, string>> = {
    NOT: 'NOT',
    AND: 'AND',
    OR: 'OR',
    XOR: 'XOR',
    NAND: 'NAND',
    NOR: 'NOR',
};

export const PALETTE_ORDER: GateType[] = ['INPUT', 'OUTPUT', 'NOT', 'AND', 'OR', 'XOR', 'NAND', 'NOR', 'DISPLAY4'];

export const DRAG_DATA_FORMAT = 'application/logicube-gate';

const INPUT_LETTERS = ['X', 'Y', 'Z'];

function defaultLabelFor(type: GateType, existingNodes: Node<GateNodeData>[]): string {
    if (type === 'INPUT') {
        const count = existingNodes.filter((n) => n.data.gateType === 'INPUT').length;
        return count < INPUT_LETTERS.length ? INPUT_LETTERS[count] : `IN${count + 1}`;
    }
    if (type === 'OUTPUT') {
        const count = existingNodes.filter((n) => n.data.gateType === 'OUTPUT').length;
        return `F${count + 1}`;
    }
    if (type === 'DISPLAY4') {
        const count = existingNodes.filter((n) => n.data.gateType === 'DISPLAY4').length;
        return `D${count + 1}`;
    }
    return type;
}

function generateNodeId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `gate_${crypto.randomUUID()}`;
    }
    return `gate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createGateNode(
    type: GateType,
    position: { x: number; y: number },
    existingNodes: Node<GateNodeData>[]
) {
    return {
        id: generateNodeId(),
        type: 'gateNode' as const,
        position,
        data: {
            gateType: type,
            label: defaultLabelFor(type, existingNodes),
            value: type === 'INPUT' ? false : undefined,
        },
    };
}

interface PaletteProps {
    theme: Theme;
    lang: Lang;
    onAdd: (type: GateType) => void;
}

export const Palette: React.FC<PaletteProps> = ({ theme, lang, onAdd }) => {
    const colors = useThemeColors(theme);
    const t = useT(lang);

    const labelFor = (type: GateType) => {
        if (type === 'INPUT') return t.lever;
        if (type === 'OUTPUT') return t.lamp;
        if (type === 'DISPLAY4') return t.display;
        return GATE_LABEL[type] ?? type;
    };

    return (
        <div
            style={{
                position: 'absolute',
                top: 64,
                left: 12,
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                backgroundColor: colors.bgCard,
                border: `1px solid ${colors.borderMuted}`,
                borderRadius: 8,
                padding: 8,
            }}
        >
            {PALETTE_ORDER.map((type) => (
                <div
                    key={type}
                    draggable
                    onDragStart={(e) => {
                        e.dataTransfer.setData(DRAG_DATA_FORMAT, type);
                        e.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={() => onAdd(type)}
                    title={t.dragHint}
                    style={{
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: 'sans-serif',
                        textAlign: 'center',
                        color: colors.text,
                        backgroundColor: colors.bgInput,
                        border: `1px solid ${colors.borderMuted}`,
                        borderRadius: 6,
                        cursor: 'grab',
                    }}
                >
                    {labelFor(type)}
                </div>
            ))}
        </div>
    );
};