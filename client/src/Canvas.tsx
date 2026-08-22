import React, { useState } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    type Connection,
    type Edge,
    type Node,
    type OnNodesChange,
    type OnEdgesChange,
} from '@xyflow/react';
import { useThemeColors } from './useTheme';
import type { Theme } from './types';

interface CanvasProps {
    nodes: Node[];
    edges: Edge[];
    onNodesChange: OnNodesChange<Node>;
    onEdgesChange: OnEdgesChange<Edge>;
    onConnect: (params: Connection) => void;
    currentRoomId: string;
    currentRoomName: string;
    assignedName: string;
    theme: Theme;
}

export const Canvas: React.FC<CanvasProps> = ({
                                                  nodes,
                                                  edges,
                                                  onNodesChange,
                                                  onEdgesChange,
                                                  onConnect,
                                                  currentRoomId,
                                                  currentRoomName,
                                                  assignedName,
                                                  theme,
                                              }) => {
    const colors = useThemeColors(theme);
    const [copied, setCopied] = useState(false);

    const copyRoomId = () => {
        navigator.clipboard.writeText(currentRoomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{ width: '100vw', height: '100vh', backgroundColor: colors.gridBg }}>
    <div
        style={{
        position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 10,
            backgroundColor: colors.bgCard,
            color: colors.text,
            padding: '8px 16px',
            borderRadius: 8,
            fontFamily: 'sans-serif',
            fontSize: 14,
            border: `1px solid ${colors.borderMuted}`,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
    }}
>
    <span><strong>LogiCube</strong> | Комната: <strong>{currentRoomName}</strong></span>
    <button
    onClick={copyRoomId}
    style={{
        padding: '4px 8px',
            backgroundColor: colors.bgInput,
            color: colors.text,
            border: `1px solid ${colors.borderMuted}`,
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
    }}
>
📋 ID: <code>{currentRoomId}</code> {copied ? '✓' : ''}
    </button>
    <span>|</span>
    <span>Вы: <strong>{assignedName}</strong></span>
    <button
        onClick={() => window.location.reload()}
    style={{ padding: '4px 8px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
>
    Выйти
    </button>
    </div>

    <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView>
    <Background color={colors.gridDot} gap={16} />
    <Controls />
    </ReactFlow>
    </div>
);
};