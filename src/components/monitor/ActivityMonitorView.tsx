import React, { useState } from 'react';
import {
  Activity,
  Clock,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Filter,
} from 'lucide-react';
import { useArchive } from '../../context/ArchiveContext';

export const ActivityMonitorView: React.FC = () => {
  const { activityTasks, clearActivityLogs } = useArchive();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Operations' },
    { id: 'ollama_connection', label: 'Ollama Connection' },
    { id: 'photograph_analysis', label: 'Vision Analysis' },
    { id: 'personality_creation', label: 'Personality Creation' },
    { id: 'memory_retrieval', label: 'Memory Retrieval (RAG)' },
    { id: 'chat_generation', label: 'Chat Generation' },
    { id: 'model_download', label: 'Model Downloads' },
    { id: 'embedding_generation', label: 'Embeddings' },
    { id: 'local_data_storage', label: 'IndexedDB Storage' },
  ];

  const filteredTasks = activityTasks.filter((t) =>
    categoryFilter === 'all' ? true : t.category === categoryFilter
  );

  const formatDuration = (ms?: number) => {
    if (!ms) return 'In progress...';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#232533] pb-6">
        <div>
          <div className="flex items-center space-x-2 text-[#d4af37] text-xs font-semibold uppercase tracking-wider mb-1">
            <Activity className="w-3.5 h-3.5" />
            <span>Real-Time Task Monitoring</span>
          </div>
          <h2 className="text-3xl font-bold font-serif-title gold-gradient-text">
            Activity Monitor
          </h2>
          <p className="text-sm text-[#9c9fae]">
            Transparent telemetry for browser-native IndexedDB operations, RAG similarity queries, and Ollama inference.
          </p>
        </div>

        <button
          onClick={() => clearActivityLogs()}
          className="px-3.5 py-2 bg-[#1b1c28] hover:bg-rose-950/40 text-[#8c8f9f] hover:text-rose-300 border border-[#2b2d3d] text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 self-start md:self-auto"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Activity Log</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-[#14151e] p-4 rounded-xl border border-[#232533]">
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-[#d4af37]" />
          <span className="text-xs text-[#8c8f9f]">Filter Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#0e0f15] border border-[#222432] rounded-lg px-3 py-1.5 text-xs text-[#e8e4dc] focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-[#6d7082] font-code">
          {filteredTasks.length} recorded events
        </span>
      </div>

      {/* Task Stream Feed */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-[#14151e] border border-dashed border-[#232533] text-xs text-[#8c8f9f]">
            No operations recorded in this category.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isRunning = task.status === 'running';

            return (
              <div
                key={task.id}
                className="p-4 rounded-xl bg-[#14151e] border border-[#232533] space-y-2.5 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : isRunning ? (
                      <Radio className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}

                    <div>
                      <h4 className="text-xs font-bold text-[#f5e4be]">{task.title}</h4>
                      <p className="text-[11px] text-[#8c8f9f] mt-0.5">{task.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-[11px] text-[#6d7082]">
                    <span className="flex items-center space-x-1 font-code">
                      <Clock className="w-3 h-3 text-[#d4af37]" />
                      <span>{formatDuration(task.durationMs)}</span>
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-code capitalize ${
                        isCompleted
                          ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                          : isRunning
                          ? 'bg-amber-950/40 text-amber-300 border border-amber-500/30 animate-pulse'
                          : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                </div>

                {/* Progress Bar (if percentage is specified) */}
                {task.progressPercent !== undefined && !task.indeterminate && (
                  <div className="w-full bg-[#0c0d12] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#8e7343] to-[#d4af37] h-1.5 transition-all duration-300"
                      style={{ width: `${task.progressPercent}%` }}
                    />
                  </div>
                )}

                {/* Indeterminate Bar for running unknown length tasks */}
                {isRunning && task.indeterminate && (
                  <div className="w-full bg-[#0c0d12] rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#d4af37] h-1.5 w-1/3 animate-pulse" />
                  </div>
                )}

                {/* Error message */}
                {task.errorMessage && (
                  <div className="p-2 rounded bg-rose-950/30 border border-rose-500/30 text-[11px] text-rose-300">
                    {task.errorMessage}
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-[#555869] pt-1">
                  <span className="font-code uppercase tracking-wider text-[#8e7343]">
                    {task.category.replace(/_/g, ' ')}
                  </span>
                  <span>{new Date(task.startedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
