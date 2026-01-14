
export enum AppState {
  LOGIN = 'LOGIN',
  PERMISSION_REQUEST = 'PERMISSION_REQUEST',
  DASHBOARD = 'DASHBOARD'
}

export interface User {
  email: string;
  isLoggedIn: boolean;
}

export interface SecurityInsight {
  status: 'safe' | 'warning' | 'critical';
  message: string;
}
