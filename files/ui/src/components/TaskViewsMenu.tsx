import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TASK_VIEW_GROUPS, taskView, type TaskViewKey } from "@/lib/task-views";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * The single control for Inbox views and task status presets (PAP-670).
 * One menu, grouped by scope, so the
 * nav does not have to grow a row every time a view is added.
 */
export function TaskViewsMenu({
  value,
  onChange,
  badgeCount,
  coordinator = false,
}: {
  value: TaskViewKey;
  onChange: (next: TaskViewKey) => void;
  /** Unread count surfaced next to the My-work group, mirroring the nav badge. */
  badgeCount?: number;
  coordinator?: boolean;
}) {
  const { t } = useTranslation();
  const active = taskView(value);
  const viewLabel = (v: { key: TaskViewKey; label: string }) => t(`taskViews.label.${v.key}`, { defaultValue: v.label });
  const viewHint = (v: { key: TaskViewKey; hint: string }) => t(`taskViews.hint.${v.key}`, { defaultValue: v.hint });
  const groupLabel = (g: { label: string }, index: number) => t(`taskViews.group.${index}`, { defaultValue: g.label });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          aria-label={t("taskViews.changeView", { label: viewLabel(active) })}
        >
          <span className="max-w-(--sz-160px) truncate font-medium">{viewLabel(active)}</span>
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-(--sz-260px)">
        {TASK_VIEW_GROUPS.map((group, groupIndex) => (
          <div key={group.label}>
            {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel className="flex items-center justify-between gap-2">
              <span>{groupLabel(group, groupIndex)}</span>
              {groupIndex === 0 && badgeCount != null && badgeCount > 0 ? (
                <span className="rounded-full bg-primary px-1.5 text-(length:--text-nano) leading-tight text-primary-foreground">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              ) : null}
            </DropdownMenuLabel>
            {group.views.filter(view => coordinator || !view.coordinatorOnly).map((view) => {
              const selected = view.key === value;
              return (
                <DropdownMenuItem
                  key={view.key}
                  onSelect={() => onChange(view.key)}
                  className="items-start gap-2"
                  aria-current={selected ? "true" : undefined}
                >
                  <Check
                    aria-hidden="true"
                    className={cn("mt-0.5 size-3.5 shrink-0", selected ? "opacity-100" : "opacity-0")}
                  />
                  <span className="min-w-0">
                    <span className={cn("block truncate", selected && "font-medium")}>{viewLabel(view)}</span>
                    <span className="block text-(length:--text-nano) text-muted-foreground">{viewHint(view)}</span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
