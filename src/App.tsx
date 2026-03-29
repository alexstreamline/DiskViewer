import React from "react";
import { useDiskStore } from "./store/diskStore";
import ScanButton from "./components/ScanButton";
import StatCards from "./components/StatCards";
import Breadcrumb from "./components/Breadcrumb";
import { Legend } from "./components/TreeMap/Legend";
import TreeMap from "./components/TreeMap/TreeMap";
import CategoryPie from "./components/Charts/CategoryPie";
import TopFilesBar from "./components/Charts/TopFilesBar";
import ModifiedHistogram from "./components/Charts/ModifiedHistogram";
import ExtensionBar from "./components/Charts/ExtensionBar";
import FilterPanel from "./components/FileTable/FilterPanel";
import FileTable from "./components/FileTable/FileTable";

const TABS = ["По типу", "Крупнейшие", "Возраст", "Расширения"] as const;
type Tab = (typeof TABS)[number];

export default function App() {
  const tree = useDiskStore((s) => s.tree);
  const [activeTab, setActiveTab] = React.useState<Tab>("По типу");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* Top 56% */}
      <div style={{ flex: "0 0 56%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <ScanButton />
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Left: treemap area */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <Breadcrumb />
            <StatCards />
            <Legend />
            <div style={{ flex: 1, overflow: "hidden", background: "#0a0a14" }}>
              {tree ? (
                <TreeMap />
              ) : (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#333",
                    fontSize: 13,
                  }}
                >
                  Выберите папку для сканирования
                </div>
              )}
            </div>
          </div>

          {/* Right panel 300px */}
          <div
            style={{
              width: 300,
              flexShrink: 0,
              background: "#0d0d1a",
              borderLeft: "1px solid #2a2a3e",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #2a2a3e", flexShrink: 0 }}>
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    padding: "8px 2px",
                    fontSize: 10,
                    background: "none",
                    border: "none",
                    borderBottom: activeTab === tab ? "2px solid #9FE1CB" : "2px solid transparent",
                    color: activeTab === tab ? "#9FE1CB" : "#666",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Active chart */}
            <div style={{ flex: 1, overflow: "auto" }}>
              {activeTab === "По типу" && <CategoryPie />}
              {activeTab === "Крупнейшие" && <TopFilesBar />}
              {activeTab === "Возраст" && <ModifiedHistogram />}
              {activeTab === "Расширения" && <ExtensionBar />}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 44% */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          borderTop: "1px solid #2a2a3e",
          overflow: "hidden",
        }}
      >
        <FilterPanel />
        <FileTable />
      </div>
    </div>
  );
}
