import React, { useState } from 'react';
import type { RoomInfo, ScreenState, Theme, Lang } from './types';
import { useThemeColors, getBtnStyle, getInputStyle } from './useTheme';

interface LobbyProps {
    theme: Theme;
    setTheme: React.Dispatch<React.SetStateAction<Theme>>;
    lang: Lang;
    setLang: React.Dispatch<React.SetStateAction<Lang>>;
    userName: string;
    onSaveName: (name: string) => void;
    rooms: RoomInfo[];
    onJoin: (roomId: string, pass?: string) => Promise<void> | void;
    onCreate: (name: string, isPrivate: boolean, pass?: string) => Promise<void> | void;
    onRefreshRooms?: () => void;
    errorMsg?: string | null;
    setErrorMsg?: (msg: string | null) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
                                                theme,
                                                setTheme,
                                                lang,
                                                setLang,
                                                userName,
                                                onSaveName,
                                                rooms,
                                                onJoin,
                                                onCreate,
                                                onRefreshRooms,
                                                errorMsg,
                                                setErrorMsg,
                                            }) => {
    const colors = useThemeColors(theme);
    const [screen, setScreen] = useState<ScreenState>('main');

    const [joinCode, setJoinCode] = useState('');
    const [joinPassword, setJoinPassword] = useState('');
    const [newRoomName, setNewRoomName] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [newRoomPassword, setNewRoomPassword] = useState('');

    const [selectedRoomForPass, setSelectedRoomForPass] = useState<RoomInfo | null>(null);
    const [modalPassword, setModalPassword] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    const showError = (msg: string) => {
        if (setErrorMsg) setErrorMsg(msg);
        else setLocalError(msg);
    };

    const clearError = () => {
        if (setErrorMsg) setErrorMsg(null);
        setLocalError(null);
    };

    const handleRoomClick = async (room: RoomInfo) => {
        clearError();
        if (room.hasPassword) {
            setSelectedRoomForPass(room);
            setModalPassword('');
        } else {
            await onJoin(room.id);
        }
    };

    const handleModalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        if (selectedRoomForPass) {
            await onJoin(selectedRoomForPass.id, modalPassword);
            setSelectedRoomForPass(null);
            setModalPassword('');
        }
    };

    const activeError = errorMsg || localError;

    return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgPage, color: colors.text, fontFamily: 'sans-serif' }}>
            <div style={{ position: 'relative', width: 360, height: 440, backgroundColor: colors.bgCard, border: `2px solid ${colors.border}`, borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>

                {activeError && (
                    <div style={{ position: 'absolute', top: -45, left: 0, right: 0, backgroundColor: '#ef4444', color: '#fff', padding: '8px 12px', borderRadius: 6, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)', zIndex: 30 }}>
                        <span>{activeError}</span>
                        <button onClick={clearError} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: 14, marginLeft: 8 }}>✕</button>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 40px', alignItems: 'center', marginBottom: 20 }}>
                    <button
                        onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                        style={{ width: 32, height: 32, border: `1px solid ${colors.border}`, borderRadius: 6, backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        {colors.isDark ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="#3b82f6"><path d="M12 3c-4.97 0-9 4.03-9 9 0 4.97 4.03 9 9 9 3.76 0 6.95-2.31 8.27-5.61-3.62.92-7.14-1.83-7.14-5.57 0-2.8 1.83-5.22 4.41-6.1-1.63-.46-3.36-.72-5.54-.72z"/></svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="#3b82f6"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z"/></svg>
                        )}
                    </button>

                    <h1 style={{ fontSize: 28, margin: 0, fontWeight: 'bold', fontFamily: 'monospace', textAlign: 'center' }}>
                        LogiCube
                    </h1>

                    <button
                        onClick={() => setLang((l) => (l === 'RU' ? 'EN' : 'RU'))}
                        style={{ width: 32, height: 32, border: `1px solid ${colors.border}`, borderRadius: 6, backgroundColor: 'transparent', color: '#3b82f6', fontSize: 11, fontWeight: 'bold', cursor: 'pointer', justifySelf: 'end' }}
                    >
                        {lang}
                    </button>
                </div>

                {screen === 'main' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 'auto', marginBottom: 'auto' }}>
                        <button onClick={() => setScreen('join_menu')} style={getBtnStyle(colors.border, colors.text)}>
                            {lang === 'RU' ? 'ПРИСОЕДИНИТЬСЯ' : 'JOIN'}
                        </button>
                        <button onClick={() => setScreen('create')} style={getBtnStyle(colors.border, colors.text)}>
                            {lang === 'RU' ? 'СОЗДАТЬ' : 'CREATE'}
                        </button>
                    </div>
                )}

                {screen === 'join_menu' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 'auto', marginBottom: 'auto' }}>
                        <button onClick={() => setScreen('join_code')} style={getBtnStyle(colors.border, colors.text)}>
                            {lang === 'RU' ? 'Войти по коду' : 'Enter with code'}
                        </button>
                        <button
                            onClick={() => {
                                setScreen('rooms_list');
                                if (onRefreshRooms) onRefreshRooms();
                            }}
                            style={getBtnStyle(colors.border, colors.text)}
                        >
                            {lang === 'RU' ? 'Список комнат' : 'Rooms list'}
                        </button>
                    </div>
                )}

                {screen === 'join_code' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto', marginBottom: 'auto' }}>
                        <input type="text" placeholder={lang === 'RU' ? 'Ваш ник...' : 'Your nickname...'} value={userName} onChange={(e) => onSaveName(e.target.value)} style={getInputStyle(colors.bgInput, colors.borderMuted, colors.text)} />
                        <input type="text" placeholder="ID Комнаты" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} style={getInputStyle(colors.bgInput, colors.borderMuted, colors.text)} />
                        <input type="password" placeholder={lang === 'RU' ? 'Пароль (если есть)' : 'Password (optional)'} value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)} style={getInputStyle(colors.bgInput, colors.borderMuted, colors.text)} />
                        <button
                            onClick={() => {
                                if (!userName.trim()) return showError(lang === 'RU' ? 'Введите ваш ник!' : 'Enter your nickname!');
                                onJoin(joinCode, joinPassword);
                            }}
                            style={{ ...getBtnStyle(colors.border, colors.text), marginTop: 6 }}
                        >
                            {lang === 'RU' ? 'Войти' : 'Enter'}
                        </button>
                    </div>
                )}

                {screen === 'create' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <input type="text" placeholder={lang === 'RU' ? 'Ваш ник...' : 'Your nickname...'} value={userName} onChange={(e) => onSaveName(e.target.value)} style={getInputStyle(colors.bgInput, colors.borderMuted, colors.text)} />
                        <input type="text" placeholder={lang === 'RU' ? 'Имя комнаты' : 'Room name'} value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} style={getInputStyle(colors.bgInput, colors.borderMuted, colors.text)} />
                        <input type="password" placeholder={lang === 'RU' ? 'Пароль (опционально)' : 'Password (optional)'} value={newRoomPassword} onChange={(e) => setNewRoomPassword(e.target.value)} style={getInputStyle(colors.bgInput, colors.borderMuted, colors.text)} />
                        <label style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
                            {lang === 'RU' ? 'Закрытая' : 'Private'}
                        </label>
                        <button
                            onClick={() => {
                                if (!userName.trim()) return showError(lang === 'RU' ? 'Введите ваш ник!' : 'Enter your nickname!');
                                onCreate(newRoomName, isPrivate, newRoomPassword);
                            }}
                            style={{ ...getBtnStyle(colors.border, colors.text), marginTop: 8 }}
                        >
                            {lang === 'RU' ? 'Создать' : 'Create'}
                        </button>
                    </div>
                )}

                {screen === 'rooms_list' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflow: 'hidden', marginBottom: 40 }}>
                        <input type="text" placeholder={lang === 'RU' ? 'Ваш ник...' : 'Your nickname...'} value={userName} onChange={(e) => onSaveName(e.target.value)} style={getInputStyle(colors.bgInput, colors.borderMuted, colors.text)} />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 65px 32px', fontSize: 10, borderBottom: `1px solid ${colors.border}`, paddingBottom: 4, fontWeight: 'bold', width: '100%', gap: 4 }}>
                            <span>{lang === 'RU' ? 'ИМЯ' : 'NAME'}</span>
                            <span style={{ textAlign: 'center' }}>{lang === 'RU' ? 'ИГРОКОВ' : 'PLAYERS'}</span>
                            <span style={{ textAlign: 'center' }}>{lang === 'RU' ? 'ПАРОЛЬ' : 'PASSWORD'}</span>
                            <span></span>
                        </div>

                        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                            {rooms.length === 0 ? (
                                <span style={{ fontSize: 12, color: colors.borderMuted, textAlign: 'center', marginTop: 20 }}>
                  {lang === 'RU' ? 'Нет доступных публичных комнат' : 'No public rooms available'}
                </span>
                            ) : (
                                rooms.map((r) => {
                                    const displayName = r.name && r.name.trim() !== '' ? r.name : (r.id.length > 8 ? r.id.slice(0, 8) + '...' : r.id);
                                    return (
                                        <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 65px 32px', alignItems: 'center', fontSize: 12, backgroundColor: colors.bgInput, padding: '6px 4px', borderRadius: 4, gap: 4 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.name || r.id}>
                        {displayName}
                      </span>
                                            <span style={{ textAlign: 'center' }}>{r.usersCount}</span>
                                            <span style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {r.hasPassword ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6">
                                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                            </svg>
                        ) : (
                            '—'
                        )}
                      </span>
                                            <button
                                                onClick={() => handleRoomClick(r)}
                                                style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                    <polyline points="12 5 19 12 12 19"></polyline>
                                                </svg>
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {selectedRoomForPass && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 20 }}>
                        <form onSubmit={handleModalSubmit} style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, padding: 16, borderRadius: 8, width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ fontSize: 14, fontWeight: 'bold' }}>
                                {lang === 'RU' ? 'Введите пароль' : 'Enter password'}
                            </div>
                            <input
                                type="password"
                                autoFocus
                                placeholder={lang === 'RU' ? 'Пароль...' : 'Password...'}
                                value={modalPassword}
                                onChange={(e) => setModalPassword(e.target.value)}
                                style={getInputStyle(colors.bgInput, colors.borderMuted, colors.text)}
                            />
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedRoomForPass(null)}
                                    style={{ padding: '6px 12px', backgroundColor: 'transparent', color: colors.text, border: `1px solid ${colors.borderMuted}`, borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                                >
                                    {lang === 'RU' ? 'Отмена' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '6px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}
                                >
                                    ОК
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {screen === 'rooms_list' && onRefreshRooms && (
                    <button
                        onClick={onRefreshRooms}
                        title={lang === 'RU' ? 'Обновить список' : 'Refresh list'}
                        style={{ position: 'absolute', bottom: 12, left: 12, backgroundColor: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 6, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6"/>
                            <path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M2.5 16l1.2 1.2a10 10 0 0 0 18.8-4.2"/>
                        </svg>
                    </button>
                )}

                {screen !== 'main' && (
                    <button
                        onClick={() => setScreen(screen === 'join_code' || screen === 'rooms_list' ? 'join_menu' : 'main')}
                        style={{ position: 'absolute', bottom: 12, right: 12, backgroundColor: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 6, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 14 4 9 9 4"/>
                            <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
                        </svg>
                    </button>
                )}

            </div>
        </div>
    );
};