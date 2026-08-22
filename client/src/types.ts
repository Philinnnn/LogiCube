export interface RoomInfo {
    id: string;
    name: string;
    usersCount: number;
    hasPassword: boolean;
}

export type ScreenState = 'main' | 'join_menu' | 'join_code' | 'create' | 'rooms_list';
export type Theme = 'dark' | 'light';
export type Lang = 'RU' | 'EN';