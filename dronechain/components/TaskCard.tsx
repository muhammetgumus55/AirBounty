"use client";

import Link from "next/link";
import { Clock, Coins, ArrowRight, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/types";

// ── Status Config ─────────────────────────────

interface StatusConfig {
  label: string;
  classes: string;
}

const STATUS_MAP: Record<Task["status"], StatusConfig> = {
  open:        { label: "Open",        classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  accepted:    { label: "Accepted",    classes: "bg-blue-500/15 text-blue-400 border-blue-500/30"         },
  in_progress: { label: "In Progress", classes: "bg-amber-500/15 text-amber-400 border-amber-500/30"      },
  submitted:   { label: "Submitted",   classes: "bg-violet-500/15 text-violet-400 border-violet-500/30"   },
  approved:    { label: "Approved",    classes: "bg-teal-500/15 text-teal-400 border-teal-500/30"         },
  rejected:    { label: "Rejected",    classes: "bg-red-500/15 text-red-400 border-red-500/30"            },
  expired:     { label: "Expired",     classes: "bg-slate-500/15 text-slate-400 border-slate-500/30"      },
};

// ── Helpers ────────────────────────────────────

function formatDeadline(unixSeconds: number): string {
  const now   = Date.now() / 1000;
  const delta = unixSeconds - now;

  if (delta < 0)        return "Expired";
  if (delta < 3600)     return `${Math.floor(delta / 60)}m left`;
  if (delta < 86400)    return `${Math.floor(delta / 3600)}h left`;
  return `${Math.floor(delta / 86400)}d left`;
}

function shortenAddr(addr: string): string {
  if (!addr || addr === "0x0000000000000000000000000000000000000000") return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ── Component ─────────────────────────────────

interface TaskCardProps {
  task: Task;
  /** Highlighted wallet address to show ownership context */
  currentAddress?: string | null;
  /** Called when the user clicks Accept (only shown for open tasks) */
  onAccept?: (taskId: string) => void;
  isAccepting?: boolean;
}

export default function TaskCard({
  task,
  currentAddress,
  onAccept,
  isAccepting,
}: TaskCardProps) {
  const status    = STATUS_MAP[task.status];
  const deadlineLabel = formatDeadline(task.deadline);
  const isOwner   = currentAddress?.toLowerCase() === task.creator.toLowerCase();
  const isOperator = currentAddress?.toLowerCase() === task.acceptedBy.toLowerCase();
  const canAccept = task.status === "open" && currentAddress && !isOwner;

  return (
    <Card
      className="group relative flex flex-col bg-slate-900/60 border border-white/8
                 hover:border-violet-500/40 hover:shadow-[0_0_24px_rgba(139,92,246,0.12)]
                 transition-all duration-300 rounded-2xl overflow-hidden"
      id={`task-card-${task.id}`}
    >
      {/* Gradient accent bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 transition-all duration-300
          ${task.status === "open"     ? "bg-gradient-to-r from-emerald-500 to-teal-400" : ""}
          ${task.status === "accepted" ? "bg-gradient-to-r from-blue-500 to-indigo-400"  : ""}
          ${task.status === "submitted"? "bg-gradient-to-r from-violet-500 to-purple-400": ""}
          ${task.status === "approved" ? "bg-gradient-to-r from-teal-500 to-emerald-400" : ""}
          ${task.status === "rejected" ? "bg-gradient-to-r from-red-500 to-rose-400"     : ""}
          ${["in_progress","expired"].includes(task.status) ? "bg-white/10" : ""}
        `}
      />

      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-slate-100 font-semibold text-base leading-snug line-clamp-2 flex-1">
            {task.title}
          </h3>
          <Badge
            variant="outline"
            className={`shrink-0 text-xs font-medium border px-2.5 py-0.5 ${status.classes}`}
          >
            {status.label}
          </Badge>
        </div>

        {/* Owner / Operator badges */}
        <div className="flex gap-2 mt-1">
          {isOwner    && <span className="text-[10px] text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">Your task</span>}
          {isOperator && <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">You accepted</span>}
        </div>
      </CardHeader>

      <CardContent className="px-5 flex-1 space-y-3">
        <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
          {task.description}
        </p>

        {/* Requirements pills */}
        <div className="flex flex-wrap gap-1.5">
          <span className="bg-white/5 text-slate-300 text-xs px-2.5 py-1 rounded-full border border-white/8">
            📡 {task.requirements.minCoverage}% coverage
          </span>
          <span className="bg-white/5 text-slate-300 text-xs px-2.5 py-1 rounded-full border border-white/8">
            ⏱ {task.requirements.maxDurationMinutes}min max
          </span>
          <span className="bg-white/5 text-slate-300 text-xs px-2.5 py-1 rounded-full border border-white/8">
            🪂 {task.requirements.altitudeRange.min}–{task.requirements.altitudeRange.max}m
          </span>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <User size={11} />
            <span>{shortenAddr(task.creator)}</span>
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <Clock size={11} />
            <span className={deadlineLabel.startsWith("Expired") ? "text-red-400" : ""}>
              {deadlineLabel}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-5 pb-5 pt-3 flex items-center justify-between border-t border-white/5 mt-2">
        {/* Reward */}
        <div className="flex items-center gap-1.5">
          <Coins size={16} className="text-amber-400" />
          <span className="text-amber-400 font-bold text-base">{task.reward}</span>
          <span className="text-slate-500 text-xs">MON</span>
        </div>

        <div className="flex gap-2">
          {/* Accept button */}
          {canAccept && onAccept && (
            <Button
              id={`accept-task-${task.id}`}
              size="sm"
              disabled={isAccepting}
              onClick={() => onAccept(task.id)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3 h-8"
            >
              Accept
            </Button>
          )}

          {/* Detail link */}
          <Link href={`/tasks/${task.id}`}>
            <Button
              id={`view-task-${task.id}`}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-200 hover:bg-white/5 text-xs px-3 h-8 gap-1"
            >
              Details <ArrowRight size={12} />
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
