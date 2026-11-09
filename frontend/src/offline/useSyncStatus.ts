import { useEffect, useState } from 'react';
import { onStatus, getStatus, syncNow, type SyncStatus } from './sync';

export function useSyncStatus(): SyncStatus & { syncNow: () => void } {
  const [s, setS] = useState<SyncStatus>(getStatus());
  useEffect(() => onStatus(setS), []);
  return { ...s, syncNow };
}
