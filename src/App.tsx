import { useEffect } from "react";
import { useDiskStore } from "./store/diskStore";
import Sidebar from "./components/Sidebar";
import ScanButton from "./components/ScanButton";
import EmptyScreen from "./components/screens/EmptyScreen";
import MapScreen from "./components/screens/MapScreen";
import AnalyticsScreen from "./components/screens/AnalyticsScreen";
import FilesScreen from "./components/screens/FilesScreen";
import DuplicatesScreen from "./components/screens/DuplicatesScreen";
import JunkScreen from "./components/screens/JunkScreen";

export default function App() {
  const activeScreen = useDiskStore((s) => s.activeScreen);
  const theme = useDiskStore((s) => s.theme);
  const tree = useDiskStore((s) => s.tree);
  const isScanning = useDiskStore((s) => s.isScanning);

  // Применяем тему при монтировании
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const showEmpty = !tree && !isScanning;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <ScanButton />

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {showEmpty ? (
            <EmptyScreen />
          ) : (
            <>
              {activeScreen === "map"        && <MapScreen />}
              {activeScreen === "analytics"  && <AnalyticsScreen />}
              {activeScreen === "files"      && <FilesScreen />}
              {activeScreen === "duplicates" && <DuplicatesScreen />}
              {activeScreen === "junk"       && <JunkScreen />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
