"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  FileCheck,
  Search,
  Filter,
  Download,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Layers,
  ArrowUpDown,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { NumberTicker } from "@/components/ui/number-ticker";
import { useLanguage } from "@/context/language-context";
import {
  datasetVersions,
  primaryComparison,
  areaBreakdowns,
  findings,
  type AreaBreakdown,
} from "@/lib/data";
import { formatNumber, formatDate } from "@/lib/utils";

export default function ComparePage() {
  const { t } = useLanguage();
  const [baselineId, setBaselineId] = useState(primaryComparison.baselineId);
  const [targetId, setTargetId] = useState(primaryComparison.targetId);
  const [searchTerm, setSearchTerm] = useState("");
  const [geoFilter, setGeoFilter] = useState<"all" | "Assembly" | "Ward" | "Block">("all");
  const [sortField, setSortField] = useState<keyof AreaBreakdown>("additionRate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Selection validation
  const isValidSelection = baselineId !== targetId;
  const isDefaultPair =
    baselineId === primaryComparison.baselineId && targetId === primaryComparison.targetId;

  // Filter & sort table data
  const filteredAreas = useMemo(() => {
    return areaBreakdowns
      .filter((area) => {
        const matchesSearch =
          area.areaName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          area.areaCode.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGeo =
          geoFilter === "all" || area.areaName.includes(geoFilter);
        return matchesSearch && matchesGeo;
      })
      .sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
        }
        return sortDirection === "desc"
          ? String(bVal).localeCompare(String(aVal))
          : String(aVal).localeCompare(String(bVal));
      });
  }, [searchTerm, geoFilter, sortField, sortDirection]);

  // Associated findings
  const comparisonFindings = useMemo(() => {
    return findings.filter(
      (f) => f.baselineVersion === baselineId && f.targetVersion === targetId
    );
  }, [baselineId, targetId]);

  // Export functions
  const handleExportCSV = () => {
    const headers = ["Area Code", "Area Name", "Total Records", "Additions", "Addition Rate %", "Deletions", "Deletion Rate %", "Corrections"];
    const rows = filteredAreas.map((a) => [
      a.areaCode,
      `"${a.areaName}"`,
      a.totalRecords,
      a.additions,
      a.additionRate,
      a.deletions,
      a.deletionRate,
      a.corrections,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `electralens-comparison-${baselineId}-to-${targetId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const exportData = {
      baseline: baselineId,
      target: targetId,
      exportedAt: new Date().toISOString(),
      summary: primaryComparison,
      data: filteredAreas,
    };
    const jsonContent = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", jsonContent);
    link.setAttribute("download", `electralens-comparison-${baselineId}-to-${targetId}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (field: keyof AreaBreakdown) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  return (
    <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-12 md:py-20">
      {/* Page Header (OriginX Signature Typography) */}
      <div className="mb-12">
        <div className="kicker-tag mb-4 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#2864DC]" />
          <span>{t("compare.kicker", "REVISION COMPARISON WORKSPACE")}</span>
        </div>
        <h1 className="font-serif text-[38px] sm:text-[54px] lg:text-[62px] leading-[1.0] text-[#172033] tracking-[-0.01em] font-normal mb-4">
          {t("compare.title", "Examine the roll delta.")}
        </h1>
        <p className="text-base sm:text-lg text-[#475467] max-w-[720px] leading-[1.6]">
          {t("compare.subhead", "Examine additions, deletions, and corrections across two snapshots of the electoral roll. Filter by administrative hierarchy and inspect statistical divergence on one verifiable canvas.")}
        </p>
      </div>

      {/* Dataset Selection Controls (OriginX Rounded Card) */}
      <div className="card-origin mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
          <div className="lg:col-span-2">
            <label className="block font-mono text-[11px] font-bold tracking-[0.1em] uppercase text-[#475467] mb-2.5">
              {t("compare.baseline", "Baseline Dataset (T₀)")}
            </label>
            <select
              value={baselineId}
              onChange={(e) => setBaselineId(e.target.value)}
              className="w-full bg-[#F7F8FA] border border-[#E4E7EC] rounded-xl p-3 text-sm font-semibold text-[#172033] focus:outline-none focus:border-[#172033] transition-colors"
            >
              {datasetVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} ({formatDate(v.date)})
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block font-mono text-[11px] font-bold tracking-[0.1em] uppercase text-[#475467] mb-2.5">
              {t("compare.target", "Target Dataset (T₁)")}
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full bg-[#F7F8FA] border border-[#E4E7EC] rounded-xl p-3 text-sm font-semibold text-[#172033] focus:outline-none focus:border-[#172033] transition-colors"
            >
              {datasetVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} ({formatDate(v.date)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              onClick={() => {
                setBaselineId(primaryComparison.baselineId);
                setTargetId(primaryComparison.targetId);
              }}
              className="btn-pill-sm btn-subtle w-full py-3"
            >
              {t("compare.reset", "Reset to Primary Pair")}
            </button>
          </div>
        </div>

        {!isValidSelection && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Invalid selection: Baseline and Target datasets cannot be identical. Please select distinct roll revisions.</span>
          </div>
        )}

        {isValidSelection && !isDefaultPair && (
          <div className="mt-4 p-4 bg-[#FFF4EC] border border-[#FDE3CF] rounded-xl flex items-center gap-2 text-[#D9661A] text-xs font-semibold">
            <Info className="w-4 h-4 shrink-0" />
            <span>Note: Full record-level differential matrix is pre-computed for Q1 Draft → Q2 Final. Selected alternative pair displays extrapolated statistical aggregates.</span>
          </div>
        )}
      </div>

      {isValidSelection && (
        <>
          {/* Comparison Stat Cards with Hover Lift */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
            <motion.div
              whileHover={{ y: -3 }}
              className="card-origin p-6 flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 text-[#14663F] mb-1 font-mono text-[11px] font-bold tracking-wider uppercase">
                <TrendingUp className="w-4 h-4" />
                <span>{t("compare.additions", "Additions")}</span>
              </div>
              <p className="text-3xl font-bold font-mono text-[#D9661A] mt-1">
                <NumberTicker value={primaryComparison.additions} prefix="+" />
              </p>
              <p className="text-xs text-[#475467] font-medium mt-1">
                {((primaryComparison.additions / primaryComparison.totalBaseline) * 100).toFixed(2)}% of baseline
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -3 }}
              className="card-origin p-6 flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 text-[#2864DC] mb-1 font-mono text-[11px] font-bold tracking-wider uppercase">
                <TrendingDown className="w-4 h-4" />
                <span>{t("compare.deletions", "Deletions")}</span>
              </div>
              <p className="text-3xl font-bold font-mono text-[#2864DC] mt-1">
                <NumberTicker value={primaryComparison.deletions} prefix="−" />
              </p>
              <p className="text-xs text-[#475467] font-medium mt-1">
                {((primaryComparison.deletions / primaryComparison.totalBaseline) * 100).toFixed(2)}% of baseline
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -3 }}
              className="card-origin p-6 flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 text-[#475467] mb-1 font-mono text-[11px] font-bold tracking-wider uppercase">
                <FileCheck className="w-4 h-4" />
                <span>{t("compare.corrections", "Corrections")}</span>
              </div>
              <p className="text-3xl font-bold font-mono text-[#172033] mt-1">
                <NumberTicker value={primaryComparison.corrections} />
              </p>
              <p className="text-xs text-[#475467] font-medium mt-1">
                {((primaryComparison.corrections / primaryComparison.totalBaseline) * 100).toFixed(2)}% modified
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -3 }}
              className="card-origin p-6 flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 text-[#14663F] mb-1 font-mono text-[11px] font-bold tracking-wider uppercase">
                <Layers className="w-4 h-4" />
                <span>{t("compare.netShift", "Net Change")}</span>
              </div>
              <p className="text-3xl font-bold font-mono text-[#14663F] mt-1">
                <NumberTicker value={primaryComparison.additions - primaryComparison.deletions} prefix="+" />
              </p>
              <p className="text-xs text-[#475467] font-medium mt-1">
                Target total: {formatNumber(primaryComparison.totalTarget)}
              </p>
            </motion.div>
          </div>

          {/* Graphical Rate Comparison */}
          <div className="card-origin mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
              <div>
                <h3 className="text-lg font-bold text-[#172033]">
                  Constituency Rate Variance (Additions vs Deletions %)
                </h3>
                <p className="text-xs text-[#475467] font-medium">
                  Observed gross percentage shift by geographic subunit
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono font-bold">
                <span className="flex items-center gap-1.5 text-[#172033]">
                  <span className="w-3 h-3 bg-[#F07824] rounded-sm inline-block" /> Additions %
                </span>
                <span className="flex items-center gap-1.5 text-[#172033]">
                  <span className="w-3 h-3 bg-[#2864DC] rounded-sm inline-block" /> Deletions %
                </span>
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredAreas.slice(0, 10).map((a) => ({
                    name: a.areaName.replace(" Assembly", "").replace(" Ward", "").replace(" Block", ""),
                    additions: a.additionRate,
                    deletions: a.deletionRate,
                  }))}
                  margin={{ top: 10, right: 10, bottom: 20, left: -20 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F7" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#475467" }} tickLine={false} interval={0} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: "#475467" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E4E7EC", backgroundColor: "#FFFFFF" }}
                    formatter={(val, name) => [`${val}%`, name === "additions" ? "Addition Rate" : "Deletion Rate"]}
                  />
                  <Bar dataKey="additions" fill="#F07824" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="deletions" fill="#2864DC" radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Filter, Search & Export Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[260px]">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#475467]" />
                <input
                  type="text"
                  placeholder={t("compare.searchPlaceholder", "Filter by constituency or code...")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#F7F8FA] border border-[#E4E7EC] rounded-full pl-10 pr-4 py-2.5 text-xs font-semibold text-[#172033] placeholder:text-[#475467] focus:outline-none focus:border-[#172033]"
                />
              </div>

              {/* OriginX Chunky Pill Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-[#F7F8FA] border border-[#E4E7EC] rounded-full">
                {(["all", "Assembly", "Ward", "Block"] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setGeoFilter(level)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      geoFilter === level
                        ? "bg-[#172033] text-white shadow-xs"
                        : "text-[#475467] hover:text-[#172033]"
                    }`}
                  >
                    {level === "all" ? t("compare.allLevels", "All Levels") : level}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#475467] mr-1">{filteredAreas.length} subunits shown</span>
              <button
                onClick={handleExportCSV}
                className="btn-pill-sm btn-subtle"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                onClick={handleExportJSON}
                className="btn-pill-sm btn-subtle"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>
            </div>
          </div>

          {/* Breakdown Data Table (OriginX Card Container) */}
          <div className="card-origin p-0 overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-xs" role="table">
                <thead>
                  <tr className="border-b border-border bg-background/60">
                    <th
                      onClick={() => handleSort("areaCode")}
                      className="text-left py-3 px-4 font-semibold text-muted uppercase cursor-pointer hover:text-foreground"
                    >
                      <div className="flex items-center gap-1">
                        Code <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("areaName")}
                      className="text-left py-3 px-4 font-semibold text-muted uppercase cursor-pointer hover:text-foreground"
                    >
                      <div className="flex items-center gap-1">
                        Area Name <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("totalRecords")}
                      className="text-right py-3 px-4 font-semibold text-muted uppercase cursor-pointer hover:text-foreground"
                    >
                      <div className="flex items-center justify-end gap-1">
                        Total Electorate <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("additions")}
                      className="text-right py-3 px-4 font-semibold text-muted uppercase cursor-pointer hover:text-foreground"
                    >
                      <div className="flex items-center justify-end gap-1">
                        Additions <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("additionRate")}
                      className="text-right py-3 px-4 font-semibold text-muted uppercase cursor-pointer hover:text-foreground"
                    >
                      <div className="flex items-center justify-end gap-1">
                        Add % <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("deletions")}
                      className="text-right py-3 px-4 font-semibold text-muted uppercase cursor-pointer hover:text-foreground"
                    >
                      <div className="flex items-center justify-end gap-1">
                        Deletions <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("deletionRate")}
                      className="text-right py-3 px-4 font-semibold text-muted uppercase cursor-pointer hover:text-foreground"
                    >
                      <div className="flex items-center justify-end gap-1">
                        Del % <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("corrections")}
                      className="text-right py-3 px-4 font-semibold text-muted uppercase cursor-pointer hover:text-foreground"
                    >
                      <div className="flex items-center justify-end gap-1">
                        Modifications <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredAreas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted">
                        No geographic units match the active search and filter parameters.
                      </td>
                    </tr>
                  ) : (
                    filteredAreas.map((area) => (
                      <tr key={area.areaCode} className="hover:bg-background/40 transition-colors">
                        <td className="py-2.5 px-4 font-data text-muted">{area.areaCode}</td>
                        <td className="py-2.5 px-4 font-medium text-foreground">
                          {area.areaName}
                        </td>
                        <td className="py-2.5 px-4 text-right font-data">{formatNumber(area.totalRecords)}</td>
                        <td className="py-2.5 px-4 text-right font-data font-semibold text-verified">
                          +{formatNumber(area.additions)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-data font-semibold text-verified">
                          {area.additionRate.toFixed(2)}%
                        </td>
                        <td className="py-2.5 px-4 text-right font-data font-semibold text-critical">
                          −{formatNumber(area.deletions)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-data font-semibold text-critical">
                          {area.deletionRate.toFixed(2)}%
                        </td>
                        <td className="py-2.5 px-4 text-right font-data text-muted">
                          {formatNumber(area.corrections)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Associated Findings in this Comparison (OriginX Card) */}
          <div className="card-origin">
            <h3 className="text-lg font-bold text-[#172033] mb-1">
              Automated Statistical Findings for this Roll Pair
            </h3>
            <p className="text-xs text-[#475467] font-medium mb-6">
              {comparisonFindings.length} findings flagged by rule-based auditing algorithms for this baseline/target snapshot.
            </p>

            <div className="space-y-4">
              {comparisonFindings.map((finding) => (
                <div
                  key={finding.id}
                  className="p-5 border border-[#E4E7EC] rounded-2xl bg-[#F7F8FA] flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#172033] transition-colors"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="font-mono text-xs font-bold text-[#172033]">{finding.id}</span>
                      <Badge variant={finding.signalStrength === "strong" ? "signal-strong" : "signal-moderate"}>
                        {finding.signalStrength} signal
                      </Badge>
                      <span className="text-xs font-semibold text-[#475467]">• {finding.area}</span>
                    </div>
                    <p className="text-xs md:text-sm text-[#344054] leading-relaxed">{finding.explanation}</p>
                  </div>
                  <Link
                    href={`/findings/${finding.id}`}
                    className="btn-pill-sm btn-subtle shrink-0"
                  >
                    <span>Inspect evidence</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
