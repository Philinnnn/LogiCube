import React, { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import {
    ReactFlow,
    ReactFlowProvider,
    useReactFlow,
    getNodesBounds,
    getViewportForBounds,
    Background,
    Controls,
    MiniMap,
    type Connection,
    type Edge,
    type Node,
    type OnNodesChange,
    type OnEdgesChange,
} from '@xyflow/react';
import { useThemeColors } from './useTheme';
import type { Theme, Lang } from './types';
import { useT } from './i18n';

import type { GateNodeData, GateType } from './circuitTypes';
import { nodeTypes } from './GateNode';
import { Palette, createGateNode, DRAG_DATA_FORMAT } from './Palette';
import { useCircuitSimulation } from './useCircuitSimulation';
import { TruthTable } from './TruthTable';
import { ChatPanel, type ChatEntry } from './ChatPanel';

const CANVAS_EXTENT: [[number, number], [number, number]] = [
    [-2500, -2000],
    [2500, 2000],
];

function minimapNodeColor(node: { data: { gateType?: string } }) {
    switch (node.data.gateType) {
        case 'INPUT':
            return '#3b82f6';
        case 'OUTPUT':
            return '#facc15';
        case 'DISPLAY4':
            return '#f97316';
        case 'NOT':
            return '#ef4444';
        default:
            return '#71717a';
    }
}

function generatePasteId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `gate_${crypto.randomUUID()}`;
    }
    return `gate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

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
    setTheme: React.Dispatch<React.SetStateAction<Theme>>;
    lang: Lang;
    availableLangs: Lang[];
    onCycleLang: () => void;
    isRunMode: boolean;
    setIsRunMode: (next: boolean) => void;
    onAddNode: (node: Node<GateNodeData>) => void;
    onUpdateNodeData: (nodeId: string, patch: Partial<GateNodeData>) => void;
    onImportCircuit: (nodes: Node<GateNodeData>[], edges: Edge[]) => void;
    onDeleteElements: (nodeIds: string[], edgeIds: string[]) => void;
    onAddElements: (nodes: Node<GateNodeData>[], edges: Edge[]) => void;
    onUndo: () => void;
    roomUsers: string[];
    chatMessages: ChatEntry[];
    onSendChat: (text: string) => void;
}

const CanvasInner: React.FC<CanvasProps> = ({
                                                nodes,
                                                edges,
                                                onNodesChange,
                                                onEdgesChange,
                                                onConnect,
                                                currentRoomId,
                                                currentRoomName,
                                                assignedName,
                                                theme,
                                                setTheme,
                                                lang,
                                                availableLangs,
                                                onCycleLang,
                                                isRunMode,
                                                setIsRunMode,
                                                onAddNode,
                                                onUpdateNodeData,
                                                onImportCircuit,
                                                onDeleteElements,
                                                onAddElements,
                                                onUndo,
                                                roomUsers,
                                                chatMessages,
                                                onSendChat,
                                            }) => {
    const colors = useThemeColors(theme);
    const t = useT(lang);
    const [copied, setCopied] = useState(false);
    const [showTruthTable, setShowTruthTable] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { screenToFlowPosition, getNodes } = useReactFlow();
    const clipboardRef = useRef<{ nodes: Node<GateNodeData>[]; edges: Edge[] } | null>(null);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().includes('MAC');
            const ctrl = isMac ? e.metaKey : e.ctrlKey;

            const active = document.activeElement as HTMLElement | null;
            const isTyping =
                active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
            if (isTyping) return;

            const typedNodes = nodes as Node<GateNodeData>[];

            if (ctrl && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
                onUndo();
                e.preventDefault();
                return;
            }

            if (ctrl && (e.key === 'c' || e.key === 'C')) {
                const selectedNodes = typedNodes.filter((n) => n.selected);
                if (selectedNodes.length === 0) return;
                const selectedIds = new Set(selectedNodes.map((n) => n.id));
                const relatedEdges = edges.filter(
                    (ed) => ed.selected || (selectedIds.has(ed.source) && selectedIds.has(ed.target))
                );
                clipboardRef.current = {
                    nodes: selectedNodes.map((n) => ({ ...n, data: { ...n.data } })),
                    edges: relatedEdges.map((ed) => ({ ...ed })),
                };
                e.preventDefault();
                return;
            }

            if (ctrl && (e.key === 'x' || e.key === 'X')) {
                const selectedNodes = typedNodes.filter((n) => n.selected);
                const selectedIds = new Set(selectedNodes.map((n) => n.id));
                const relatedEdges = edges.filter(
                    (ed) => ed.selected || (selectedIds.has(ed.source) && selectedIds.has(ed.target))
                );
                if (selectedNodes.length === 0 && relatedEdges.length === 0) return;
                clipboardRef.current = {
                    nodes: selectedNodes.map((n) => ({ ...n, data: { ...n.data } })),
                    edges: relatedEdges.map((ed) => ({ ...ed })),
                };
                onDeleteElements(
                    selectedNodes.map((n) => n.id),
                    relatedEdges.map((ed) => ed.id)
                );
                e.preventDefault();
                return;
            }

            if (ctrl && (e.key === 'v' || e.key === 'V')) {
                const clip = clipboardRef.current;
                if (!clip || clip.nodes.length === 0) return;

                const offset = 40;
                const idMap = new Map<string, string>();
                const newNodes = clip.nodes.map((n) => {
                    const newId = generatePasteId();
                    idMap.set(n.id, newId);
                    return {
                        ...n,
                        id: newId,
                        position: { x: n.position.x + offset, y: n.position.y + offset },
                        selected: true,
                        data: { ...n.data },
                    };
                });
                const newEdges = clip.edges
                    .filter((ed) => idMap.has(ed.source) && idMap.has(ed.target))
                    .map((ed) => ({
                        ...ed,
                        id: `edge_${generatePasteId()}`,
                        source: idMap.get(ed.source)!,
                        target: idMap.get(ed.target)!,
                        selected: false,
                    }));

                const previouslySelected = typedNodes.filter((n) => n.selected);
                if (previouslySelected.length > 0) {
                    onNodesChange(
                        previouslySelected.map((n) => ({ id: n.id, type: 'select', selected: false }) as any)
                    );
                }
                onAddElements(newNodes, newEdges);
                e.preventDefault();
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [nodes, edges, onDeleteElements, onAddElements, onNodesChange, onUndo]);


    const copyRoomId = () => {
        navigator.clipboard.writeText(currentRoomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const { decoratedNodes, decoratedEdges, simulation } = useCircuitSimulation({
        nodes: nodes as Node<GateNodeData>[],
        edges,
        isRunMode,
        onInputToggled: (nodeId, next) => onUpdateNodeData(nodeId, { value: next }),
    });

    const themedNodes = decoratedNodes.map((n) => ({
        ...n,
        data: {
            ...n.data,
            theme,
            lang,
            onRenameNode: (nodeId: string, newLabel: string) => onUpdateNodeData(nodeId, { label: newLabel }),
        },
    }));

    const handleAddFromPalette = (type: GateType) => {
        const position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        onAddNode(createGateNode(type, position, nodes as Node<GateNodeData>[]));
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const gateType = e.dataTransfer.getData(DRAG_DATA_FORMAT) as GateType;
        if (!gateType) return;
        const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        onAddNode(createGateNode(gateType, position, nodes as Node<GateNodeData>[]));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const safeFileName = () => currentRoomName.replace(/[^a-zA-Zа-яА-Я0-9_-]+/g, '_') || 'circuit';

    const handleExportJson = () => {
        setShowExportMenu(false);
        const payload = { nodes, edges, exportedAt: new Date().toISOString(), room: currentRoomName };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logicube_${safeFileName()}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportPdf = async () => {
        setShowExportMenu(false);
        const currentNodes = getNodes();
        if (currentNodes.length === 0) return;

        setExportingPdf(true);
        try {
            const bounds = getNodesBounds(currentNodes);
            const imageWidth = Math.max(900, Math.round(bounds.width + 200));
            const imageHeight = Math.max(600, Math.round(bounds.height + 200));
            const viewport = getViewportForBounds(bounds, imageWidth, imageHeight, 0.2, 2, 0.1);

            const viewportEl = document.querySelector('.react-flow__viewport') as HTMLElement | null;
            if (!viewportEl) return;

            const dataUrl = await toPng(viewportEl, {
                backgroundColor: colors.gridBg,
                width: imageWidth,
                height: imageHeight,
                style: {
                    width: `${imageWidth}px`,
                    height: `${imageHeight}px`,
                    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
                },
            });

            const pdf = new jsPDF({
                orientation: imageWidth >= imageHeight ? 'landscape' : 'portrait',
                unit: 'px',
                format: [imageWidth, imageHeight],
            });
            pdf.addImage(dataUrl, 'PNG', 0, 0, imageWidth, imageHeight);
            pdf.save(`logicube_${safeFileName()}_${Date.now()}.pdf`);
        } finally {
            setExportingPdf(false);
        }
    };

    const handleImportClick = () => {
        setImportError(null);
        fileInputRef.current?.click();
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(String(reader.result));
                const importedNodes: unknown[] = Array.isArray(parsed.nodes) ? parsed.nodes : [];
                const importedEdges: unknown[] = Array.isArray(parsed.edges) ? parsed.edges : [];

                const validNodes = importedNodes.filter(
                    (n: any) =>
                        n &&
                        typeof n.id === 'string' &&
                        n.position &&
                        typeof n.position.x === 'number' &&
                        typeof n.position.y === 'number' &&
                        n.data &&
                        typeof n.data.gateType === 'string'
                ) as Node<GateNodeData>[];

                if (validNodes.length === 0) {
                    setImportError(t.importErrorNoNodes);
                    return;
                }

                const validIds = new Set(validNodes.map((n) => n.id));
                const validEdges = importedEdges.filter(
                    (ed: any) => ed && typeof ed.id === 'string' && validIds.has(ed.source) && validIds.has(ed.target)
                ) as Edge[];

                onImportCircuit(validNodes, validEdges);
                setImportError(null);
            } catch {
                setImportError(t.importErrorBadJson);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div
            style={{ width: '100vw', height: '100vh', backgroundColor: colors.gridBg }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
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
                    flexWrap: 'wrap',
                }}
            >
                <span>
                    <strong>LogiCube</strong> | {t.room}: <strong>{currentRoomName}</strong>
                </span>
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
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2">
                        <rect x="9" y="9" width="12" height="12" rx="2" />
                        <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
                    </svg>
                    ID: <code>{currentRoomId}</code> {copied ? '✓' : ''}
                </button>
                <span>|</span>
                <span>
                    {t.you}: <strong>{assignedName}</strong>
                </span>

                <span>|</span>

                <button
                    onClick={() => setIsRunMode(!isRunMode)}
                    style={{
                        padding: '4px 10px',
                        backgroundColor: isRunMode ? '#22c55e' : colors.bgInput,
                        color: isRunMode ? 'white' : colors.text,
                        border: `1px solid ${colors.borderMuted}`,
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 'bold',
                    }}
                >
                    {isRunMode ? t.stop : t.run}
                </button>

                <button
                    onClick={() => setShowTruthTable(true)}
                    style={{
                        padding: '4px 10px',
                        backgroundColor: colors.bgInput,
                        color: colors.text,
                        border: `1px solid ${colors.borderMuted}`,
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                    }}
                >
                    {t.truthTable}
                </button>

                <button
                    onClick={handleImportClick}
                    style={{
                        padding: '4px 10px',
                        backgroundColor: colors.bgInput,
                        color: colors.text,
                        border: `1px solid ${colors.borderMuted}`,
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                    }}
                >
                    {t.importBtn}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImportFile}
                    style={{ display: 'none' }}
                />

                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowExportMenu((v) => !v)}
                        disabled={exportingPdf}
                        style={{
                            padding: '4px 10px',
                            backgroundColor: colors.bgInput,
                            color: colors.text,
                            border: `1px solid ${colors.borderMuted}`,
                            borderRadius: 4,
                            cursor: exportingPdf ? 'wait' : 'pointer',
                            fontSize: 12,
                        }}
                    >
                        {exportingPdf ? '…' : t.exportBtn}
                    </button>

                    {showExportMenu && (
                        <>
                            <div
                                onClick={() => setShowExportMenu(false)}
                                style={{ position: 'fixed', inset: 0, zIndex: 19 }}
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '110%',
                                    left: 0,
                                    zIndex: 20,
                                    backgroundColor: colors.bgCard,
                                    border: `1px solid ${colors.borderMuted}`,
                                    borderRadius: 6,
                                    overflow: 'hidden',
                                    minWidth: 110,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                }}
                            >
                                <button
                                    onClick={handleExportJson}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        padding: '8px 12px',
                                        background: 'none',
                                        border: 'none',
                                        color: colors.text,
                                        fontSize: 12,
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                    }}
                                >
                                    JSON
                                </button>
                                <button
                                    onClick={handleExportPdf}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        padding: '8px 12px',
                                        background: 'none',
                                        border: 'none',
                                        borderTop: `1px solid ${colors.borderMuted}`,
                                        color: colors.text,
                                        fontSize: 12,
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                    }}
                                >
                                    PDF
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {importError && (
                    <span
                        style={{
                            padding: '4px 10px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            borderRadius: 4,
                            fontSize: 12,
                        }}
                    >
                        {importError}
                    </span>
                )}

                {simulation.hasCycle && (
                    <span
                        style={{
                            padding: '4px 10px',
                            backgroundColor: '#f59e0b',
                            color: '#1c1917',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                        }}
                    >
                        {t.cycleWarning}
                    </span>
                )}

                <button
                    onClick={() => window.location.reload()}
                    style={{
                        padding: '4px 8px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontWeight: 'bold',
                    }}
                >
                    {t.exit}
                </button>
            </div>

            <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: 8 }}>
                <button
                    onClick={onCycleLang}
                    title={availableLangs.length > 1 ? `${t.switchLang} (${availableLangs.join(' / ')})` : t.switchLang}
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        border: `1px solid ${colors.borderMuted}`,
                        backgroundColor: colors.bgCard,
                        cursor: 'pointer',
                        color: colors.text,
                        fontSize: 12,
                        fontWeight: 'bold',
                    }}
                >
                    {lang}
                </button>

                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    title={t.switchTheme}
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        border: `1px solid ${colors.borderMuted}`,
                        backgroundColor: colors.bgCard,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {colors.isDark ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#3b82f6">
                            <path d="M12 3c-4.97 0-9 4.03-9 9 0 4.97 4.03 9 9 9 3.76 0 6.95-2.31 8.27-5.61-3.62.92-7.14-1.83-7.14-5.57 0-2.8 1.83-5.22 4.41-6.1-1.63-.46-3.36-.72-5.54-.72z" />
                        </svg>
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#3b82f6">
                            <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z" />
                        </svg>
                    )}
                </button>
            </div>

            <Palette theme={theme} lang={lang} onAdd={handleAddFromPalette} />

            <ReactFlow
                nodes={themedNodes}
                edges={decoratedEdges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                translateExtent={CANVAS_EXTENT}
                nodeExtent={CANVAS_EXTENT}
                selectionKeyCode={['Control', 'Meta']}
                multiSelectionKeyCode={['Control', 'Meta']}
                deleteKeyCode={['Backspace', 'Delete']}
                fitView
            >
                <Background color={colors.gridDot} gap={16} />
                <Controls />
                <MiniMap
                    pannable
                    zoomable
                    nodeColor={minimapNodeColor}
                    maskColor={colors.isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)'}
                    style={{
                        backgroundColor: colors.isDark ? 'rgba(24,24,27,0.55)' : 'rgba(255,255,255,0.55)',
                        border: `1px solid ${colors.borderMuted}`,
                        borderRadius: 8,
                    }}
                />
            </ReactFlow>

            <ChatPanel theme={theme} lang={lang} roomUsers={roomUsers} messages={chatMessages} onSend={onSendChat} />

            {showTruthTable && (
                <TruthTable
                    nodes={nodes as Node<GateNodeData>[]}
                    edges={edges}
                    theme={theme}
                    lang={lang}
                    onClose={() => setShowTruthTable(false)}
                />
            )}
        </div>
    );
};

export const Canvas: React.FC<CanvasProps> = (props) => (
    <ReactFlowProvider>
        <CanvasInner {...props} />
    </ReactFlowProvider>
);