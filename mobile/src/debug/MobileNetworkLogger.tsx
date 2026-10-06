import { useEffect, useRef, type PropsWithChildren } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  installFetchInterceptor,
  NetworkLoggerFAB,
  NetworkLoggerPanel,
  NetworkLoggerProvider,
  useNetworkLogger,
  type NetworkLoggerAction,
} from "react-native-network-inspector-devtools";
import { isNetworkLoggerEnabled, redactNetworkAction } from "./network-redaction";

function SafeFetchLogger() {
  const { dispatch, activeMocks } = useNetworkLogger();
  const mocks = useRef(activeMocks);
  useEffect(() => { mocks.current = activeMocks; }, [activeMocks]);
  useEffect(() => {
    let active = true;
    const sanitizedDispatch = {
      current: (action: NetworkLoggerAction) => {
        if (active) dispatch(redactNetworkAction(action));
      },
    };
    const stop = installFetchInterceptor(sanitizedDispatch, mocks);
    return () => { active = false; stop(); };
  }, [dispatch]);
  return null;
}

export function MobileNetworkLogger({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const enabled = isNetworkLoggerEnabled(__DEV__, process.env.EXPO_PUBLIC_NETWORK_LOGGER_ENABLED);
  if (!enabled) return <>{children}</>;
  return (
    <NetworkLoggerProvider maxEntries={200} enableConsoleCapture={false} enableWebSync={false}>
      <SafeFetchLogger />
      {children}
      <NetworkLoggerFAB position={{ left: 16, bottom: insets.bottom + 120 }} />
      <NetworkLoggerPanel />
    </NetworkLoggerProvider>
  );
}
