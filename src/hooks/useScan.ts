import { useDiskStore } from "../store/diskStore";

export function useScan() {
  const startScan = useDiskStore((s) => s.startScan);
  const cancelScan = useDiskStore((s) => s.cancelScan);
  const isScanning = useDiskStore((s) => s.isScanning);
  const progress = useDiskStore((s) => s.progress);
  const error = useDiskStore((s) => s.error);
  const scanPath = useDiskStore((s) => s.scanPath);

  return { startScan, cancelScan, isScanning, progress, error, scanPath };
}
