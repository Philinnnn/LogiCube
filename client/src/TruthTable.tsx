import React, { useMemo } from 'react';
import type { Edge, Node } from '@xyflow/react';
import type { GateNodeData } from './circuitTypes';
import { generateTruthTable } from './gateLogic';
import { useThemeColors } from './useTheme';
import type { Theme, Lang } from './types';
import { useT } from './i18n';

interface TruthTableProps {
    nodes: Node<GateNodeData>[];
    edges: Edge[];
    theme: Theme;
    lang: Lang;
    onClose: () => void;
}

const cellStyle: React.CSSProperties = {
    padding: '4px 10px',
    textAlign: 'center',
    fontFamily: 'monospace',
    fontSize: 13,
};

export const TruthTable: React.FC<TruthTableProps> = ({ nodes, edges, theme, lang, onClose }) => {
    const colors = useThemeColors(theme);
    const t = useT(lang);
    const table = useMemo(() => generateTruthTable(nodes, edges), [nodes, edges]);

    const noInputsOrOutputs = table.inputLabels.length === 0 || table.outputLabels.length === 0;

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                zIndex: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 10,
                    padding: 20,
                    maxHeight: '80vh',
                    overflow: 'auto',
                    color: colors.text,
                    fontFamily: 'sans-serif',
                    minWidth: 280,
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0 }}>{t.truthTable}</h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: colors.text, fontSize: 18, cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>

                {noInputsOrOutputs ? (
                    <p style={{ fontSize: 13, color: colors.borderMuted }}>{t.truthTableEmpty}</p>
                ) : (
                    <>
                        {table.truncated && (
                            <p style={{ fontSize: 12, color: '#f59e0b' }}>{t.truthTableTruncated}</p>
                        )}
                        <table style={{ borderCollapse: 'collapse' }}>
                            <thead>
                            <tr>
                                {table.inputLabels.map((l) => (
                                    <th key={`i-${l}`} style={{ ...cellStyle, borderBottom: `2px solid ${colors.border}` }}>
                                        {l}
                                    </th>
                                ))}
                                <th style={{ width: 16 }} />
                                {table.outputLabels.map((l) => (
                                    <th key={`o-${l}`} style={{ ...cellStyle, borderBottom: `2px solid ${colors.border}` }}>
                                        {l}
                                    </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {table.rows.map((row, i) => (
                                <tr key={i} style={{ backgroundColor: i % 2 ? colors.bgInput : 'transparent' }}>
                                    {row.inputs.map((v, j) => (
                                        <td key={j} style={cellStyle}>
                                            {v ? 1 : 0}
                                        </td>
                                    ))}
                                    <td />
                                    {row.outputs.map((v, j) => (
                                        <td key={j} style={{ ...cellStyle, fontWeight: 700 }}>
                                            {v === undefined ? '—' : v ? 1 : 0}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </>
                )}
            </div>
        </div>
    );
};