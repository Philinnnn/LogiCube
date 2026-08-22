import { useState, useEffect, useCallback, useRef } from 'react';
import { useNodesState, useEdgesState, addEdge, type Connection, type Edge, type Node } from '@xyflow/react';
import * as signalR from '@microsoft/signalr';

import type { RoomInfo, Theme, Lang } from './types';
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
    const [theme, setTheme] = useState<Theme>('dark');
    const [lang, setLang] = useState<Lang>('RU');

    const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
    const [rooms, setRooms] = useState<RoomInfo[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
    const [currentRoomName, setCurrentRoomName] = useState('');
    const [assignedName, setAssignedName] = useState('');

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    const nodesRef = useRef(nodes);
    const edgesRef = useRef(edges);
    nodesRef.current = nodes;
    edgesRef.current = edges;

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
            if (data.nodes) setNodes(data.nodes);
            if (data.edges) setEdges(data.edges);
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
            setErrorMsg(lang === 'RU' ? 'Введите ваш ник!' : 'Enter your nickname!');
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

            if (res.currentCircuit && res.currentCircuit !== '{}') {
                const parsed = JSON.parse(res.currentCircuit);
                setNodes(parsed.nodes || []);
                setEdges(parsed.edges || []);
            }
        } catch (err: any) {
            const rawMsg = err?.message || '';
            if (rawMsg.includes('не найдена') || rawMsg.includes('not found')) {
                setErrorMsg(lang === 'RU' ? 'Комната больше не существует' : 'Room no longer exists');
                void fetchRooms();
            } else if (rawMsg.includes('пароль') || rawMsg.includes('password')) {
                setErrorMsg(lang === 'RU' ? 'Неверный пароль' : 'Incorrect password');
            } else {
                setErrorMsg(rawMsg || (lang === 'RU' ? 'Ошибка подключения' : 'Connection error'));
            }
        }
    };

    const handleCreateRoom = async (name: string, isPrivate: boolean, pass?: string) => {
        if (!userName.trim()) {
            setErrorMsg(lang === 'RU' ? 'Введите ваш ник!' : 'Enter your nickname!');
            return;
        }
        if (!connection) return;

        try {
            setErrorMsg(null);
            saveNameLocally(userName);
            const room: any = await connection.invoke('CreateRoom', name, isPrivate, pass);
            await handleJoin(room.id, pass);
        } catch (err: any) {
            setErrorMsg((lang === 'RU' ? 'Ошибка создания комнаты: ' : 'Error creating room: ') + (err?.message || ''));
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

    const onConnect = useCallback(
        (params: Connection) => {
            setEdges((eds) => {
                const next = addEdge(params, eds);
                syncWithServer(nodesRef.current, next);
                return next;
            });
        },
        [setEdges, syncWithServer]
    );

    const handleNodesChange = useCallback(
        (changes: any) => {
            onNodesChange(changes);
            setTimeout(() => {
                syncWithServer(nodesRef.current, edgesRef.current);
            }, 0);
        },
        [onNodesChange, syncWithServer]
    );

    if (currentRoomId) {
        return (
            <Canvas
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                currentRoomId={currentRoomId}
                currentRoomName={currentRoomName}
                assignedName={assignedName}
                theme={theme}
            />
        );
    }

    return (
        <Lobby
            theme={theme}
            setTheme={setTheme}
            lang={lang}
            setLang={setLang}
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