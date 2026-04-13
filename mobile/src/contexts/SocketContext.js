import React, { createContext, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import { API_URL } from '../services/api';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = React.useState(null);
  const { user, token } = useContext(AuthContext);

  useEffect(() => {
    let newSocket;
    if (user && token) {
      // Connect to the base domain
      const baseUrl = API_URL.replace('/api', '');
      newSocket = io(baseUrl, {
        auth: { token },
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
      });

      setSocket(newSocket);
    }

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [user, token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
