import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { debounce } from "lodash";
import {
  UploadCloud,
  PlayCircle,
  Layers,
  Webhook,
  Cloud,
  History as HistoryIcon,
  Sliders,
  ArrowRight
} from "lucide-react";
import { AuthProvider } from "./context/AuthContext";
import { UIProvider, useUI } from "./context/UIContext";
import { translations } from "./i18n";
import { api } from "./lib/api";
import { useDashboardOverview } from "./hooks/useDashboardOverview";

import Header from "./components/Header";
import DropZone from "./components/DropZone";
import AnalysisSummary from "./components/AnalysisSummary";
import RulesPanel from "./components/RulesPanel";
import ComparisonGrid from "./components/ComparisonGrid";
import ExportBar from "./components/ExportBar";
import RecipesView from "./components/RecipesView";
import HistoryView from "./components/HistoryView";
import BatchProcessingView from "./components/BatchProcessingView";
import AutomationsView from "./components/AutomationsView";
import StreamParsingView from "./components/StreamParsingView";
import ConnectorsView from "./components/ConnectorsView";
import SchedulesView from "./components/SchedulesView";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./components/Landing";
import Login from "./components/Login";
import ActivateAccess from "./components/ActivateAccess";
import PageHeader from "./components/dashboard/PageHeader";
import QuickActionCard from "./components/dashboard/QuickActionCard";
import RecentActivityList from "./components/dashboard/RecentActivityList";
import SecondaryPanel from "./components/dashboard/SecondaryPanel";
import WorkspaceSidebar, { MobileWorkspaceNav } from "./components/dashboard/WorkspaceSidebar";

const listUnique = (arr) => Array.from(new Set(arr));

export function CleanSheetApp() {
  const { theme, setTheme, lang, setLang } = useUI();
  const [activeTab, setActiveTab] = useState("clean"); // "clean" | "stream" | "batch" | "automations" | "connectors" | "schedules" | "recipes" | "history"

  // Active File Data & Analysis
  const [currentFile, setCurrentFile] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [originalPreview, setOriginalPreview] = useState(null);
  const [activeRules, setActiveRules] = useState(null);
  const [normalizedPreview, setNormalizedPreview] = useState(null);
  const [recipeYaml, setRecipeYaml] = useState("");
  const [pythonScript, setPythonScript] = useState("");
  const [isRecalculating, setIsRecalculating] = useState(false);

  const t = translations[lang] || translations.es;
  const overview = useDashboardOverview();

  const handleAnalysisComplete = ({ fileInfo, analysisData }) => {
    setCurrentFile(fileInfo);
    setAnalysisData(analysisData.analysis);
    setOriginalPreview(analysisData.original_preview);
    setActiveRules(analysisData.analysis.default_rules);
    setNormalizedPreview(analysisData.normalized_preview);
    setRecipeYaml(analysisData.analysis.recipe_yaml);
    setPythonScript(analysisData.python_script);
  };

  // Debounced preview recalculation (300ms) when rules change
  const recalculatePreview = useCallback((fileId, newRules) => {
    const debouncedFn = debounce(async (fId, rules) => {
      setIsRecalculating(true);
      try {
        const res = await api.post("/files/preview", {
          file_id: fId,
          rules: rules
        });
        if (res.data) {
          setNormalizedPreview(res.data.preview);
          setRecipeYaml(res.data.recipe_yaml);
          setPythonScript(res.data.python_script);
        }
      } catch (err) {
        console.error("Preview recalculation error:", err);
      } finally {
        setIsRecalculating(false);
      }
    }, 300);
    debouncedFn(fileId, newRules);
  }, []);

  const handleRuleChange = (key, value) => {
    const updated = { ...activeRules, [key]: value };
    setActiveRules(updated);
    if (currentFile?.file_id) {
      recalculatePreview(currentFile.file_id, updated);
    }
  };

  // "New cleaning" is a distinct nav action from "Dashboard": it always jumps to
  // the clean tab AND clears any in-progress file, landing straight on the upload
  // hero instead of wherever the dashboard/clean flow currently sits.
  const startNewCleaning = () => {
    setCurrentFile(null);
    setAnalysisData(null);
    setActiveTab("clean");
  };

  return (
    <div
      data-testid="app-root-container"
      className="min-h-screen flex flex-col font-sans transition-colors duration-200 dark:bg-[#080D18] bg-slate-50 text-slate-900 dark:text-slate-100 selection:bg-[#38BDF8]/30 selection:text-white"
    >
      <Header t={t} />
      <MobileWorkspaceNav t={t} activeTab={activeTab} setActiveTab={setActiveTab} onNewCleaning={startNewCleaning} />

      <div className="flex min-h-0 flex-1">
        <WorkspaceSidebar t={t} activeTab={activeTab} setActiveTab={setActiveTab} onNewCleaning={startNewCleaning} />
        <main className="min-w-0 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {activeTab === "clean" && (
          <>
            {/* Operational Dashboard Overview (default landing state on /app) */}
            {!currentFile ? (
              <div className="space-y-10">
                <PageHeader
                  title={t.brand_name}
                  subtitle={t.subtitle}
                  status={t.dashboard.status_ready}
                />

                {/* 1. Primary action: dominant, unmistakable, first thing seen on the page. */}
                <div
                  data-testid="dashboard-hero-panel"
                  className="relative overflow-hidden rounded-2xl border border-[#3B82F6]/30 bg-gradient-to-br from-[#3B82F6]/10 via-white to-white dark:from-[#3B82F6]/15 dark:via-[#0B1220] dark:to-[#0B1220] p-5 sm:p-7 shadow-sm space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#3B82F6]/15 text-[#0284C7] dark:text-[#38BDF8] border border-[#3B82F6]/30">
                      {t.dashboard.hero_eyebrow}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#3B82F6] flex items-center justify-center shrink-0 shadow-md shadow-[#3B82F6]/30">
                      <UploadCloud className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-extrabold dark:text-white text-slate-950">
                        {t.dashboard.hero_title}
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl mt-0.5">
                        {t.dashboard.hero_subtitle}
                      </p>
                    </div>
                  </div>
                  <DropZone t={t} onAnalysisComplete={handleAnalysisComplete} />
                </div>

                {/* 3. Minimal operational summary: one condensed strip instead of competing cards. */}
                {(() => {
                  const d = t.dashboard;
                  const metrics = [
                    overview.executions !== null && {
                      icon: HistoryIcon,
                      label: d.metric_executions,
                      value: overview.executions.length,
                      testId: "metric-executions"
                    },
                    overview.recipes !== null && {
                      icon: PlayCircle,
                      label: d.metric_recipes,
                      value: overview.recipes.length,
                      testId: "metric-recipes"
                    },
                    overview.automations !== null && {
                      icon: Webhook,
                      label: d.metric_automations,
                      value: overview.automations.length,
                      testId: "metric-automations"
                    },
                    overview.connectors !== null && {
                      icon: Cloud,
                      label: d.metric_connectors,
                      value: overview.connectors.length,
                      testId: "metric-connectors"
                    }
                  ].filter(Boolean);

                  if (metrics.length === 0) return null;

                  return (
                    <div
                      data-testid="dashboard-metrics-row"
                      className="rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-[#0B1220] bg-white shadow-sm grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 dark:divide-slate-800/80"
                    >
                      {metrics.map((m) => (
                        <div key={m.testId} data-testid={m.testId} className="flex items-center gap-2.5 px-4 py-3 min-w-0">
                          <m.icon className="w-4 h-4 text-[#38BDF8] shrink-0" />
                          <div className="min-w-0">
                            <div className="text-base font-bold dark:text-white text-slate-900 leading-none tabular-nums">
                              {m.value}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">{m.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* 2. Secondary actions: clearly less prominent than the hero above. */}
                <div className="space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t.dashboard.quick_actions_title}
                  </h2>
                  <div
                    data-testid="dashboard-quick-actions"
                    className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                  >
                    <QuickActionCard
                      testId="quick-action-recipes"
                      icon={PlayCircle}
                      label={t.dashboard.action_recipe_label}
                      description={t.dashboard.action_recipe_desc}
                      onClick={() => setActiveTab("recipes")}
                    />
                    <QuickActionCard
                      testId="quick-action-batch"
                      icon={Layers}
                      label={t.dashboard.action_batch_label}
                      description={t.dashboard.action_batch_desc}
                      onClick={() => setActiveTab("batch")}
                    />
                    <QuickActionCard
                      testId="quick-action-automations"
                      icon={Webhook}
                      label={t.dashboard.action_automation_label}
                      description={t.dashboard.action_automation_desc}
                      onClick={() => setActiveTab("automations")}
                    />
                    <QuickActionCard
                      testId="quick-action-connectors"
                      icon={Cloud}
                      label={t.dashboard.action_connector_label}
                      description={t.dashboard.action_connector_desc}
                      onClick={() => setActiveTab("connectors")}
                    />
                  </div>
                </div>

                {/* 4 + 5. Recent activity, and a compact module-shortcuts list (not a wall of tiles). */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  <div className="lg:col-span-2">
                    <RecentActivityList
                      testId="dashboard-recent-activity"
                      title={t.dashboard.recent_activity_title}
                      items={(overview.executions || []).slice(0, 5)}
                      emptyLabel={t.dashboard.recent_activity_empty}
                      renderItem={(item) => (
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium dark:text-slate-200 text-slate-800 truncate">
                              {item.file_name || "Archivo"}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                            </div>
                          </div>
                          <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30">
                            {item.status || "ok"}
                          </span>
                        </div>
                      )}
                    />
                    <button
                      data-testid="dashboard-view-full-history"
                      onClick={() => setActiveTab("history")}
                      className="mt-2 w-full text-center px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[#38BDF8] hover:bg-[#3B82F6]/10 border border-transparent hover:border-[#3B82F6]/30 transition-colors cursor-pointer"
                    >
                      {t.dashboard.recent_activity_view_all}
                    </button>
                  </div>

                  <div
                    data-testid="dashboard-explore-modules"
                    className="lg:col-span-1 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-[#0B1220] bg-white overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t.dashboard.explore_title}
                      </h3>
                    </div>
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {[
                        { id: "recipes", icon: PlayCircle, label: t.dashboard.explore_recipes },
                        { id: "batch", icon: Layers, label: t.dashboard.explore_batch },
                        { id: "history", icon: HistoryIcon, label: t.dashboard.explore_history }
                      ].map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            data-testid={`explore-module-${m.id}`}
                            onClick={() => setActiveTab(m.id)}
                            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <m.icon className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                              <span className="truncate">{m.label}</span>
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 6. Advanced / integrations: grouped, muted, clearly secondary to the primary flow. */}
                <div className="space-y-3">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t.dashboard.advanced_title}
                    </h2>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {t.dashboard.advanced_subtitle}
                    </p>
                  </div>
                  <div
                    data-testid="dashboard-advanced-row"
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                  >
                    <SecondaryPanel
                      testId="advanced-stream"
                      icon={Sliders}
                      title={t.dashboard.advanced_stream_title}
                      action={
                        <button
                          onClick={() => setActiveTab("stream")}
                          className="text-[10px] font-semibold text-[#38BDF8] hover:underline cursor-pointer"
                        >
                          {t.dashboard.advanced_cta}
                        </button>
                      }
                    >
                      <p>{t.dashboard.advanced_stream_desc}</p>
                    </SecondaryPanel>

                    <SecondaryPanel
                      testId="advanced-automations"
                      icon={Webhook}
                      title={t.dashboard.advanced_automations_title}
                      action={
                        <button
                          onClick={() => setActiveTab("automations")}
                          className="text-[10px] font-semibold text-[#38BDF8] hover:underline cursor-pointer"
                        >
                          {t.dashboard.advanced_cta}
                        </button>
                      }
                    >
                      <p>{t.dashboard.advanced_automations_desc}</p>
                    </SecondaryPanel>

                    <SecondaryPanel
                      testId="advanced-connectors"
                      icon={Cloud}
                      title={t.dashboard.advanced_connectors_title}
                      action={
                        <button
                          onClick={() => setActiveTab("connectors")}
                          className="text-[10px] font-semibold text-[#38BDF8] hover:underline cursor-pointer"
                        >
                          {t.dashboard.advanced_cta}
                        </button>
                      }
                    >
                      <p>{t.dashboard.advanced_connectors_desc}</p>
                    </SecondaryPanel>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* File Header Bar & Reset Button */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-[#0B1220] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#38BDF8]">
                      Archivo en Limpieza
                    </span>
                    <h3 className="text-base font-bold dark:text-white text-slate-900">
                      {currentFile.filename}
                    </h3>
                  </div>

                  <button
                    data-testid="reset-file-btn"
                    onClick={() => {
                      setCurrentFile(null);
                      setAnalysisData(null);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:border-red-400 text-slate-600 dark:text-slate-400 hover:text-red-400 transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    Cargar otro archivo
                  </button>
                </div>

                {/* Analysis Heuristic Summary with Contextual Drift/Alias Resolution */}
                <AnalysisSummary
                  analysis={analysisData}
                  t={t}
                  onApplyAliasOnce={(candCol, canonicalCol) => {
                    const currentAliases = activeRules?.column_aliases || {};
                    const existing = currentAliases[canonicalCol] || [];
                    handleRuleChange("column_aliases", {
                      ...currentAliases,
                      [canonicalCol]: listUnique([...existing, candCol])
                    });
                  }}
                  onSaveAliasToRecipe={async (candCol, canonicalCol) => {
                    // Persistent versioned update if user has active recipe
                    if (currentFile?.recipe_id) {
                      try {
                        await api.post(`/recipes/${currentFile.recipe_id}/aliases`, {
                          canonical_column: canonicalCol,
                          alias: candCol
                        });
                        alert(`Alias '${candCol}' guardado en la receta de forma versionada.`);
                      } catch (e) {
                        alert("Error al persistir alias en la receta.");
                      }
                    } else {
                      // Apply in memory rules
                      const currentAliases = activeRules?.column_aliases || {};
                      const existing = currentAliases[canonicalCol] || [];
                      handleRuleChange("column_aliases", {
                        ...currentAliases,
                        [canonicalCol]: listUnique([...existing, candCol])
                      });
                      alert(`Alias '${candCol} -> ${canonicalCol}' configurado para esta sesión.`);
                    }
                  }}
                />

                {/* Rules Panel with Live Recalculation */}
                <RulesPanel
                  rules={activeRules}
                  onChangeRule={handleRuleChange}
                  isRecalculating={isRecalculating}
                  analysis={analysisData}
                  t={t}
                />

                {/* Interactive Before / After Comparison Grid */}
                <ComparisonGrid
                  original={originalPreview}
                  normalized={normalizedPreview}
                  t={t}
                />

                {/* Export Bar: Clean Files (XLSX, CSV) + YAML Recipe + Python Script */}
                <ExportBar
                  fileId={currentFile.file_id}
                  rules={activeRules}
                  recipeYaml={recipeYaml}
                  pythonScript={pythonScript}
                  structureFingerprint={analysisData?.structure_fingerprint}
                  t={t}
                  openAuthModal={() => {}}
                  onRecipeSaved={() => setActiveTab("recipes")}
                />
              </div>
            )}
          </>
        )}

        {activeTab === "stream" && (
          <StreamParsingView t={t} />
        )}

        {activeTab === "batch" && (
          <BatchProcessingView t={t} openAuthModal={() => {}} />
        )}

        {activeTab === "automations" && (
          <AutomationsView t={t} openAuthModal={() => {}} />
        )}

        {activeTab === "connectors" && (
          <ConnectorsView t={t} openAuthModal={() => {}} />
        )}

        {activeTab === "schedules" && (
          <SchedulesView t={t} openAuthModal={() => {}} />
        )}

        {activeTab === "recipes" && (
          <RecipesView
            t={t}
            onSelectRecipeForReapplication={(rec) => {
              // Handled within RecipesView modal
            }}
          />
        )}

        {activeTab === "history" && <HistoryView t={t} />}
        </main>
      </div>

      <footer className="w-full border-t border-slate-200 dark:border-slate-800/80 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
        <p>Anclora CleanSheet © 2026. Normalización determinista y reproducible.</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UIProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/activate" element={<ActivateAccess />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <CleanSheetApp />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </UIProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
