import { Crosshair, Radar, ScanLine, Shield } from "lucide-react";
import type { AgentRole } from "@/lib/domain";
export function RoleIcon({ role, size = 18 }: { role: AgentRole; size?: number }) {
  const Icon = { duelist: Crosshair, initiator: Radar, controller: ScanLine, sentinel: Shield }[role];
  return <Icon size={size} aria-hidden="true"/>;
}
export function AgentGlyph({ id, role, name, large = false }: { id: string; role: AgentRole; name: string; large?: boolean }) {
  return <div className={`agent-glyph role-${role} ${large ? "glyph-large" : ""}`} aria-label={`${name}的原创几何标识`}><div className="glyph-grid"/><span className="glyph-letter">{id.slice(0,1).toUpperCase()}</span><span className="glyph-orbit"/><span className="glyph-role"><RoleIcon role={role} size={large ? 24 : 16}/></span><span className="glyph-index">{id.toUpperCase()}</span></div>;
}
