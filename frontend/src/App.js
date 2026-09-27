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
  CalendarClock,
  ShieldCheck
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
import MetricCard from "./components/dashboard/MetricCard";
import QuickActionCard from "./components/dashboard/QuickActionCard";
import RecentActivityList from "./components/dashboard/RecentActivityList";
import SecondaryPanel from "./components/dashboard/SecondaryPanel";

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

  return (
    <div
      data-testid="app-root-container"
      className="min-h-screen flex flex-col font-sans transition-colors duration-200 dark:bg-[#080D18] bg-slate-50 text-slate-900 dark:text-slate-100 selection:bg-[#38BDF8]/30 selection:text-white"
    >
      <Header
        t={t}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {activeTab === "clean" && (
          <>
            {/* Operational Dashboard Overview (default landing state on /app) */}
            {!currentFile ? (
              <div className="space-y-8">
                <PageHeader
                  title={t.brand_name}
                  subtitle={t.subtitle}
                  status={t.dashboard.status_ready}
                />

                {/* Overview row: real counts derived from already-fetched API data; a
                    metric is simply omitted when its backing fetch failed. */}
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
                    },
                    overview.schedules !== null && {
                      icon: CalendarClock,
                      label: d.metric_schedules,
                      value: overview.schedules.length,
                      testId: "metric-schedules"
                    }
                  ].filter(Boolean);

                  if (metrics.length === 0) return null;

                  return (
                    <div
                      data-testid="dashboard-metrics-row"
                      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
                    >
                      {metrics.map((m) => (
                        <MetricCard key={m.testId} {...m} />
                      ))}
                    </div>
                  );
                })()}

                {/* Quick actions: wired to the existing tab-switch handler, no new logic */}
                <div className="space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t.dashboard.quick_actions_title}
                  </h2>
                  <div
                    data-testid="dashboard-quick-actions"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                  >
                    <QuickActionCard
                      testId="quick-action-clean"
                      icon={UploadCloud}
                      label={t.dashboard.action_clean_label}
                      description={t.dashboard.action_clean_desc}
                      active
                      onClick={() => setActiveTab("clean")}
                    />
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

                {/* Main content: recent activity + compact upload workspace */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  <div className="lg:col-span-1">
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

                  {/* Compact upload panel: same DropZone/analysis pipeline, shrunk into the workspace layout */}
                  <div
                    data-testid="dashboard-workspace-panel"
                    className="lg:col-span-2 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-[#0B1220] bg-white space-y-3"
                  >
                    <div>
                      <h3 className="text-sm font-bold dark:text-white text-slate-900">
                        {t.dashboard.workspace_title}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t.dashboard.workspace_subtitle}
                      </p>
                    </div>
                    <DropZone t={t} onAnalysisComplete={handleAnalysisComplete} />
                  </div>
                </div>

                {/* Secondary: compact panels reusing already-fetched connectors/schedules data */}
                <div className="space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t.dashboard.secondary_title}
                  </h2>
                  <div
                    data-testid="dashboard-secondary-row"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                  >
                    <SecondaryPanel
                      testId="secondary-connectors"
                      icon={Cloud}
                      title={t.dashboard.secondary_connectors_title}
                      action={
                        <button
                          onClick={() => setActiveTab("connectors")}
                          className="text-[10px] font-semibold text-[#38BDF8] hover:underline cursor-pointer"
                        >
                          {t.dashboard.secondary_connectors_cta}
                        </button>
                      }
                    >
                      {overview.connectors === null || overview.connectors.length === 0 ? (
                        <p>{t.dashboard.secondary_connectors_empty}</p>
                      ) : (
                        <ul className="space-y-1">
                          {overview.connectors.slice(0, 3).map((c) => (
                            <li key={c.id} className="truncate">
                              {c.name || c.bucket || `Conector #${c.id}`}
                            </li>
                          ))}
                        </ul>
                      )}
                    </SecondaryPanel>

                    <SecondaryPanel
                      testId="secondary-schedules"
                      icon={CalendarClock}
                      title={t.dashboard.secondary_schedules_title}
                      action={
                        <button
                          onClick={() => setActiveTab("schedules")}
                          className="text-[10px] font-semibold text-[#38BDF8] hover:underline cursor-pointer"
                        >
                          {t.dashboard.secondary_schedules_cta}
                        </button>
                      }
                    >
                      {overview.schedules === null || overview.schedules.length === 0 ? (
                        <p>{t.dashboard.secondary_schedules_empty}</p>
                      ) : (
                        <ul className="space-y-1">
                          {overview.schedules.slice(0, 3).map((s) => (
                            <li key={s.id} className="truncate">
                              {s.name || `Programación #${s.id}`}
                            </li>
                          ))}
                        </ul>
                      )}
                    </SecondaryPanel>

                    <SecondaryPanel
                      testId="secondary-audit"
                      icon={ShieldCheck}
                      title={t.dashboard.secondary_audit_title}
                      action={
                        <button
                          onClick={() => setActiveTab("history")}
                          className="text-[10px] font-semibold text-[#38BDF8] hover:underline cursor-pointer"
                        >
                          {t.dashboard.secondary_audit_cta}
                        </button>
                      }
                    >
                      <p>{t.dashboard.secondary_audit_desc}</p>
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
