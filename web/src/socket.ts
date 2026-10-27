import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { API_URL, TOKEN_KEY } from './api';

export interface StatusChangedEvent {
  reportId: string;
  jobOrderId: string | null;
  status: string;
  message: string;
  at: string;
}

let socket: Socket | null = null;

function getSocket(): Socket | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  if (!socket) socket = io(API_URL, { auth: { token } });
  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
}

// runs the callback whenever the server announces a status change
export function useRealtime(onEvent: (e: StatusChangedEvent) => void) {
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  });

  useEffect(() => {
    const s = getSocket();
    if (!s) return undefined;
    const listener = (e: StatusChangedEvent) => handler.current(e);
    s.on('report.statusChanged', listener);
    return () => {
      s.off('report.statusChanged', listener);
    };
  }, []);
}

// true while the live connection is up
export function useLiveStatus(): boolean {
  const [live, setLive] = useState(false);

  useEffect(() => {
    const s = getSocket();
    if (!s) return undefined;
    const up = () => setLive(true);
    const down = () => setLive(false);
    setLive(s.connected);
    s.on('connect', up);
    s.on('disconnect', down);
    s.on('connect_error', down);
    return () => {
      s.off('connect', up);
      s.off('disconnect', down);
      s.off('connect_error', down);
    };
  }, []);

  return live;
}