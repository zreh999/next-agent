import type { ReportSnapshot } from "./domain";
export function sanitizeReportForShare(report: ReportSnapshot): ReportSnapshot {
  return {
    createdAt: report.createdAt,
    dimensions: structuredClone(report.dimensions),
    agents: structuredClone(report.agents),
    result: {
      ...structuredClone(report.result),
      recommendations: report.result.recommendations.map(rec => ({
        ...structuredClone(rec),
        reasons: rec.reasons.map(reason => {
          const dimension = report.dimensions.find(d => d.id === reason.dimension);
          const agent = report.agents.find(a => a.id === rec.agentId);
          const difference = Math.abs(report.result.profile[reason.dimension] - (agent?.profile[reason.dimension] ?? .5));
          const alignment = difference <= .2 ? "较贴近" : difference <= .45 ? "存在一定差异" : "差异较明显";
          return { dimension: reason.dimension, text: `在${dimension?.label ?? "这一维度"}上，你的自述偏好与这名特工的玩法画像${alignment}。`, questionIds: [] };
        })
      }))
    }
  };
}
