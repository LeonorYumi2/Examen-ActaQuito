import { useLinkingURL } from 'expo-linking';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { authRepository } from '../data/auth-repository';
import { useAuth } from './auth-state';

export function AuthBootstrap() {
  const url = useLinkingURL();
  const operational = useAuth((state) => state.access?.kind === 'operational');
  const synchronize = useAuth((state) => state.synchronize);
  const openLink = useAuth((state) => state.openLink);

  useEffect(() => {
    void synchronize();
    const unsubscribe = authRepository.onSessionChanged(() => { void synchronize(); });
    const lifecycle = AppState.addEventListener('change', (state) => {
      authRepository.setForeground(state === 'active' && useAuth.getState().access?.kind === 'operational');
      if (state === 'active') void synchronize();
    });
    return () => {
      lifecycle.remove();
      unsubscribe();
      authRepository.setForeground(false);
    };
  }, [synchronize]);

  useEffect(() => {
    authRepository.setForeground(operational && AppState.currentState === 'active');
  }, [operational]);

  useEffect(() => {
    if (url) void openLink(url);
  }, [url, openLink]);

  return null;
}
