import { useState, useEffect, useCallback, useRef } from 'react';
import { useNodesState, useEdgesState, addEdge, type Connection, type Edge, type Node } from '@xyflow/react';
import * as signalR from '@microsoft/signalr';

import type { RoomInfo, Theme, Lang } from './types';
import type { GateNodeData } from './circuitTypes';
import type { ChatEntry } from './ChatPanel';
import { getTranslations, getAvailableLangs } from './i18n';
import { Canvas } from './Canvas';
import { Lobby } from './Lobby';

const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5186`;

function getOrCreateUserId(): string {
    let id = localStorage.getItem('user_id');
    if (!id) {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            id = crypto.randomUUID();
        } else {
            id = 'usr_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
        }
        localStorage.setItem('user_id', id);
    }
    return id;
}

export default function App() {
    const [userId] = useState(getOrCreateUserId);
    const [userName, setUserName] = useState(() => localStorage.getItem('user_name') || '');
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('app_theme');
        return saved === 'light' || saved === 'dark' ? saved : 'dark';
    });
    const [lang, setLang] = useState<Lang>('RU');
    const [availableLangs, setAvailableLangs] = useState<Lang[]>(['RU']);

    useEffect(() => {
        localStorage.setItem('app_theme', theme);
    }, [theme]);

    const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
    const [rooms, setRooms] = useState<RoomInfo[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
    const [currentRoomName, setCurrentRoomName] = useState('');
    const [assignedName, setAssignedName] = useState('');

    const [roomUsers, setRoomUsers] = useState<string[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatEntry[]>([]);
    const [isRunMode, setIsRunModeLocal] = useState(false);

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    const nodesRef = useRef(nodes);
    const edgesRef = useRef(edges);
    const langRef = useRef(lang);
    langRef.current = lang;
    nodesRef.current = nodes;
    edgesRef.current = edges;

    const historyRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
    const wasDraggingRef = useRef(false);
    const draggingNodeIdsRef = useRef<Set<string>>(new Set());
    const lastSyncSentRef = useRef(0);
    const pendingSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const MAX_HISTORY = 10;
    const SYNC_THROTTLE_MS = 80;

    const pushHistory = useCallback(() => {
        historyRef.current.push({
            nodes: nodesRef.current.map((n) => ({ ...n, data: { ...n.data } })),
            edges: edgesRef.current.map((e) => ({ ...e })),
        });
        if (historyRef.current.length > MAX_HISTORY) {
            historyRef.current.shift();
        }
    }, []);

    useEffect(() => {
        getAvailableLangs().then((langs) => {
            setAvailableLangs(langs);
            langs.forEach((l) => getTranslations(l));
        });
    }, []);

    const fetchRooms = useCallback(async () => {
        if (connection) {
            try {
                const list = await connection.invoke<RoomInfo[]>('GetPublicRooms');
                setRooms(list);
            } catch (err) {
                console.error(err);
            }
        }
    }, [connection]);

    useEffect(() => {
        const hub = new signalR.HubConnectionBuilder()
            .withUrl(`${BACKEND_URL}/hubs/circuit`)
            .withAutomaticReconnect()
            .build();

        hub.on('CircuitUpdated', (data: { nodes: Node[]; edges: Edge[] }) => {
            if (data.nodes) {
                setNodes((prevNodes) => {
                    if (draggingNodeIdsRef.current.size === 0) return data.nodes;
                    const prevById = new Map(prevNodes.map((n) => [n.id, n]));
                    return data.nodes.map((incoming) => {
                        if (draggingNodeIdsRef.current.has(incoming.id)) {
                            const mine = prevById.get(incoming.id);
                            if (mine) return mine;
                        }
                        return incoming;
                    });
                });
            }
            if (data.edges) setEdges(data.edges);
        });

        hub.on('UserJoined', (name: string) => {
            setRoomUsers((prev) => (prev.includes(name) ? prev : [...prev, name]));
            setChatMessages((prev) => [
                ...prev,
                { kind: 'system', text: `${name} ${getTranslations(langRef.current).joined}`, timestampMs: Date.now() },
            ]);
        });

        hub.on('UserLeft', (name: string) => {
            setRoomUsers((prev) => prev.filter((u) => u !== name));
            setChatMessages((prev) => [
                ...prev,
                { kind: 'system', text: `${name} ${getTranslations(langRef.current).left}`, timestampMs: Date.now() },
            ]);
        });

        hub.on('ChatMessage', (msg: { user: string; text: string; timestampMs: number }) => {
            setChatMessages((prev) => [
                ...prev,
                { kind: 'chat', user: msg.user, text: msg.text, timestampMs: msg.timestampMs },
            ]);
        });

        hub.on('RunModeChanged', (running: boolean) => {
            setIsRunModeLocal(running);
        });

        hub.start().then(async () => {
            setConnection(hub);
            const list = await hub.invoke<RoomInfo[]>('GetPublicRooms');
            setRooms(list);
        }).catch(console.error);

        return () => {
            void hub.stop().catch(() => {});
        };
    }, [setNodes, setEdges]);

    const saveNameLocally = (name: string) => {
        setUserName(name);
        localStorage.setItem('user_name', name);
    };

    const handleJoin = async (roomId: string, pass?: string) => {
        if (!userName.trim()) {
            setErrorMsg(getTranslations(lang).enterNickname);
            return;
        }
        if (!connection) return;

        try {
            setErrorMsg(null);
            saveNameLocally(userName);
            const res: any = await connection.invoke('JoinRoom', roomId, userId, userName.trim(), pass || null);
            setAssignedName(res.assignedName);
            setCurrentRoomName(res.roomName);
            setCurrentRoomId(roomId);
            setRoomUsers(res.users || [res.assignedName]);
            setIsRunModeLocal(!!res.isRunning);
            setChatMessages([]);

            if (res.currentCircuit && res.currentCircuit !== '{}') {
                const parsed = JSON.parse(res.currentCircuit);
                setNodes(parsed.nodes || []);
                setEdges(parsed.edges || []);
            }
        } catch (err: any) {
            const rawMsg = err?.message || '';
            const tr = getTranslations(lang);
            if (rawMsg.includes('ERR_ROOM_NOT_FOUND')) {
                setErrorMsg(tr.roomNotFound);
                void fetchRooms();
            } else if (rawMsg.includes('ERR_WRONG_PASSWORD')) {
                setErrorMsg(tr.wrongPassword);
            } else {
                setErrorMsg(tr.connectionError);
            }
        }
    };

    const handleCreateRoom = async (name: string, isPrivate: boolean, pass?: string) => {
        if (!userName.trim()) {
            setErrorMsg(getTranslations(lang).enterNickname);
            return;
        }
        if (!connection) return;

        try {
            setErrorMsg(null);
            saveNameLocally(userName);
            const tr = getTranslations(lang);
            const finalRoomName = name.trim() || `${tr.defaultRoomName} ${Math.floor(1000 + Math.random() * 9000)}`;
            const room: any = await connection.invoke('CreateRoom', finalRoomName, isPrivate, pass);
            await handleJoin(room.id, pass);
        } catch (err: any) {
            setErrorMsg(getTranslations(lang).createRoomError + (err?.message || ''));
        }
    };

    const syncWithServer = useCallback(
        (newNodes: Node[], newEdges: Edge[]) => {
            if (connection && currentRoomId) {
                connection.invoke('SyncCircuit', currentRoomId, { nodes: newNodes, edges: newEdges })
                    .catch((err) => console.error(err));
            }
        },
        [connection, currentRoomId]
    );

    const scheduleSync = useCallback(
        (immediate: boolean) => {
            if (pendingSyncTimerRef.current) {
                clearTimeout(pendingSyncTimerRef.current);
                pendingSyncTimerRef.current = null;
            }
            const now = Date.now();
            const elapsed = now - lastSyncSentRef.current;
            if (immediate || elapsed >= SYNC_THROTTLE_MS) {
                lastSyncSentRef.current = now;
                syncWithServer(nodesRef.current, edgesRef.current);
            } else {
                pendingSyncTimerRef.current = setTimeout(() => {
                    lastSyncSentRef.current = Date.now();
                    syncWithServer(nodesRef.current, edgesRef.current);
                }, SYNC_THROTTLE_MS - elapsed);
            }
        },
        [syncWithServer]
    );

    const handleEdgesChange = useCallback(
        (changes: any[]) => {
            const hasRemove = changes.some((c) => c.type === 'remove');
            if (hasRemove) pushHistory();

            onEdgesChange(changes);
            scheduleSync(hasRemove);
        },
        [onEdgesChange, scheduleSync, pushHistory]
    );

    const onConnect = useCallback(
        (params: Connection) => {
            pushHistory();
            setEdges((eds) => {
                const next = addEdge(params, eds);
                syncWithServer(nodesRef.current, next);
                return next;
            });
        },
        [setEdges, syncWithServer, pushHistory]
    );

    const handleNodesChange = useCallback(
        (changes: any[]) => {
            const hasRemove = changes.some((c) => c.type === 'remove');
            const hasDragStart = changes.some((c) => c.type === 'position' && c.dragging === true);
            const hasDragEnd = changes.some((c) => c.type === 'position' && c.dragging === false);

            if (hasRemove) {
                pushHistory();
            } else if (hasDragStart && !wasDraggingRef.current) {
                pushHistory();
                wasDraggingRef.current = true;
            }

            for (const c of changes) {
                if (c.type === 'position') {
                    if (c.dragging === true) draggingNodeIdsRef.current.add(c.id);
                    if (c.dragging === false) draggingNodeIdsRef.current.delete(c.id);
                }
            }

            if (hasDragEnd) {
                wasDraggingRef.current = false;
            }

            onNodesChange(changes);
            scheduleSync(hasRemove || hasDragEnd);
        },
        [onNodesChange, scheduleSync, pushHistory]
    );

    const onDeleteElements = useCallback(
        (nodeIds: string[], edgeIds: string[]) => {
            pushHistory();
            const nodeIdSet = new Set(nodeIds);
            const edgeIdSet = new Set(edgeIds);
            const nextNodes = nodesRef.current.filter((n) => !nodeIdSet.has(n.id));
            const nextEdges = edgesRef.current.filter(
                (e) => !edgeIdSet.has(e.id) && !nodeIdSet.has(e.source) && !nodeIdSet.has(e.target)
            );
            setNodes(nextNodes);
            setEdges(nextEdges);
            syncWithServer(nextNodes, nextEdges);
        },
        [setNodes, setEdges, syncWithServer, pushHistory]
    );

    const onAddElements = useCallback(
        (newNodes: Node[], newEdges: Edge[]) => {
            pushHistory();
            const nextNodes = [...nodesRef.current, ...newNodes];
            const nextEdges = [...edgesRef.current, ...newEdges];
            setNodes(nextNodes);
            setEdges(nextEdges);
            syncWithServer(nextNodes, nextEdges);
        },
        [setNodes, setEdges, syncWithServer, pushHistory]
    );

    const onAddNode = useCallback(
        (node: Node<GateNodeData>) => {
            pushHistory();
            setNodes((nds) => {
                const next = [...nds, node];
                syncWithServer(next, edgesRef.current);
                return next;
            });
        },
        [setNodes, syncWithServer, pushHistory]
    );

    const onUpdateNodeData = useCallback(
        (nodeId: string, patch: Partial<GateNodeData>) => {
            if ('label' in patch) pushHistory();
            setNodes((nds) => {
                const next = nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n));
                syncWithServer(next, edgesRef.current);
                return next;
            });
        },
        [setNodes, syncWithServer, pushHistory]
    );

    const onImportCircuit = useCallback(
        (importedNodes: Node[], importedEdges: Edge[]) => {
            pushHistory();
            setNodes(importedNodes);
            setEdges(importedEdges);
            syncWithServer(importedNodes, importedEdges);
        },
        [setNodes, setEdges, syncWithServer, pushHistory]
    );

    const onUndo = useCallback(() => {
        const prev = historyRef.current.pop();
        if (!prev) return;
        setNodes(prev.nodes);
        setEdges(prev.edges);
        syncWithServer(prev.nodes, prev.edges);
    }, [setNodes, setEdges, syncWithServer]);

    const onSendChat = useCallback(
        (text: string) => {
            if (connection && currentRoomId) {
                connection.invoke('SendChatMessage', currentRoomId, text).catch((err) => console.error(err));
            }
        },
        [connection, currentRoomId]
    );

    const setIsRunMode = useCallback(
        (next: boolean) => {
            setIsRunModeLocal(next);
            if (connection && currentRoomId) {
                connection.invoke('SetRunMode', currentRoomId, next).catch((err) => console.error(err));
            }
        },
        [connection, currentRoomId]
    );

    const cycleLang = useCallback(() => {
        setLang((current) => {
            if (availableLangs.length === 0) return current;
            const idx = availableLangs.indexOf(current);
            const next = availableLangs[(idx + 1) % availableLangs.length];
            return next ?? availableLangs[0];
        });
    }, [availableLangs]);

    if (currentRoomId) {
        return (
            <Canvas
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={onConnect}
                currentRoomId={currentRoomId}
                currentRoomName={currentRoomName}
                assignedName={assignedName}
                theme={theme}
                setTheme={setTheme}
                lang={lang}
                availableLangs={availableLangs}
                onCycleLang={cycleLang}
                isRunMode={isRunMode}
                setIsRunMode={setIsRunMode}
                onAddNode={onAddNode}
                onUpdateNodeData={onUpdateNodeData}
                onImportCircuit={onImportCircuit}
                onDeleteElements={onDeleteElements}
                onAddElements={onAddElements}
                onUndo={onUndo}
                roomUsers={roomUsers}
                chatMessages={chatMessages}
                onSendChat={onSendChat}
            />
        );
    }

    return (
        <Lobby
            theme={theme}
            setTheme={setTheme}
            lang={lang}
            availableLangs={availableLangs}
            onCycleLang={cycleLang}
            userName={userName}
            onSaveName={saveNameLocally}
            rooms={rooms}
            onJoin={handleJoin}
            onCreate={handleCreateRoom}
            onRefreshRooms={fetchRooms}
            errorMsg={errorMsg}
            setErrorMsg={setErrorMsg}
        />
    );
}