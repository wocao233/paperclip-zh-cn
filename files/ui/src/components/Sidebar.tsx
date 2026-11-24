import { CoordinatorSidebar } from "./CoordinatorSidebar";
import { isWaitingToStart } from "../lib/agent-queue-wait";
import { useCoordinatorWorkspaceEnabled } from "@/hooks/useCoordinatorWorkspaceEnabled";
import {
  Inbox,
  ListChecks,
  CircleCheck,
  Target,
  LayoutDashboard,
  DollarSign,
  History,
  Search,
  SquarePen,
  Network,
  Boxes,
  Repeat,
  Layers,
  GitBranch,
  Package,
  Settings,
  FolderOpen,
  Unplug,
  MessagesSquare,
  MessageCircle,
  GanttChartSquare,
  LayoutGrid,
  Users,
  Compass,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { SidebarSection } from "./SidebarSection";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarAgents } from "./SidebarAgents";
import { SidebarProjects } from "./SidebarProjects";
import { SidebarStarredProjects } from "./SidebarStarredProjects";
import { useAgentChatEnabled } from "@/hooks/useAgentChatEnabled";
import { useAgentChatNavigation } from "@/hooks/useAgentChatNavigation";
import { useResponsibilitiesEnabled } from "@/hooks/useResponsibilitiesEnabled";
import { SidebarRecentTasks } from "./SidebarRecentTasks";
import { useDialogActions } from "../context/DialogContext";
import { useCompany } from "../context/CompanyContext";
import { useTranslation } from "@/i18n";
import { heartbeatsApi } from "../api/heartbeats";
import { instanceSettingsApi } from "../api/instanceSettings";
import { queryKeys } from "../lib/queryKeys";
import { useAttentionBadge } from "../hooks/useAttentionViews";
import { useInboxBadge } from "../hooks/useInboxBadge";
import { useStreamlinedUiEnabled } from "../hooks/useStreamlinedUiEnabled";
import { usePublishSharedQueryData, useSharedPollingQuery } from "../hooks/useSharedPolling";
import { cn } from "../lib/utils";
import { PluginSlotOutlet } from "@/plugins/slots";
import { PluginLauncherOutlet } from "@/plugins/launchers";
import { SidebarCompanyMenu } from "./SidebarCompanyMenu";
import { primarySidebarStyles } from "./primary-sidebar-styles";

export function Sidebar({ children }: { children?: ReactNode }) {
  const { enabled } = useCoordinatorWorkspaceEnabled();
  return enabled ? <CoordinatorSidebar>{children}</CoordinatorSidebar> : <ClassicSidebar>{children}</ClassicSidebar>;
}

function ClassicSidebar({ children }: { children?: ReactNode }) {
  const { t } = useTranslation();
  const { openNewIssue } = useDialogActions();
  const { enabled: agentChatEnabled } = useAgentChatEnabled();
  const chatNavigation = useAgentChatNavigation();
  const unreadChatCount = chatNavigation.chats.data?.filter(chat => chat.isUnreadForMe).length ?? 0;
  // Every labeled section is collapsible (session-scoped, default open) —
  // one policy across static nav groups and the data-driven sections.
  const [workOpen, setWorkOpen] = useState(true);
  const [organizationOpen, setOrganizationOpen] = useState(true);
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { enabled: streamlinedUiEnabled } = useStreamlinedUiEnabled();
  const inboxBadge = useInboxBadge(selectedCompanyId);
  const { data: experimentalSettings } = useQuery({
    queryKey: queryKeys.instance.experimentalSettings,
    queryFn: () => instanceSettingsApi.getExperimental(),
  });
  const liveRunsQueryKey = queryKeys.liveRuns(selectedCompanyId!);
  const sharedLiveRuns = useSharedPollingQuery({
    companyId: selectedCompanyId,
    resourceKey: "live-runs",
    queryKey: liveRunsQueryKey,
    enabled: !!selectedCompanyId,
    // Event-sourced via LiveUpdatesProvider (GitHub issue 9627) + reconnect reconcile — no
    // interval poll needed. Polling here also re-armed React Query's timer on
    // every live-event cache write, a major source of steady-state churn.
    refetchInterval: false,
    leaderOnly: true,
  });
  const { data: liveRuns, dataUpdatedAt: liveRunsUpdatedAt } = useQuery({
    queryKey: liveRunsQueryKey,
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: sharedLiveRuns.enabled,
    refetchInterval: sharedLiveRuns.refetchInterval,
  });
  usePublishSharedQueryData(sharedLiveRuns, liveRuns, liveRunsUpdatedAt);
  const liveRunCount = (liveRuns ?? []).filter((run) => !isWaitingToStart(run)).length;
  const liveIssueIds = new Set(
    (liveRuns ?? []).flatMap((run) => run.issueId ? [run.issueId] : []),
  );
  const chatRail = agentChatEnabled && streamlinedUiEnabled;
  // The merged Tasks page only exists in the streamlined shell, so the legacy
  // shell keeps its Inbox row even with the flag on.
  const combinedInboxTasks = streamlinedUiEnabled && experimentalSettings?.enableCombinedInboxTasks === true;
  const showWorkspacesLink = experimentalSettings?.enableIsolatedWorkspaces === true;
  const showStatusCards = experimentalSettings?.enableStatusCards === true;
  const goalsLinkPending = experimentalSettings === undefined;
  const showGoalsLink = experimentalSettings?.enableGoalsSidebarLink === true;
  // Decisions (attention home) is an experimental surface (PAP-13481): the nav
  // item is hidden entirely until the flag is enabled (same no-flash pattern as
  // showWorkspacesLink — it defaults hidden, so no placeholder is needed).
  const showDecisions = experimentalSettings?.enableDecisions === true;
  // The shared "For you" badge (PAP-749 Rule 5): same query as the Decisions
  // page and the coordinator navigation, with no midnight reset.
  const { count: attentionCount } = useAttentionBadge(selectedCompanyId, {
    enabled: showDecisions,
    refetchInterval: 60_000,
  });
  const showCases = experimentalSettings?.enableCases === true;
  // Conference Room Chat flag (PAP-136/PAP-137): the Conference Room nav item
  // is a new surface, hidden entirely while the flag is off (same no-flash
  // pattern as showWorkspacesLink above).
  const conferenceRoomChatEnabled = experimentalSettings?.enableConferenceRoomChat === true;
  // Responsibilities (experimental) is home: it leads the primary group with
  // Chat, Tasks and Inbox directly beneath it, and Dashboard moves down into
  // Work. Hidden until the flag is known (no-flash, same as above).
  const { enabled: responsibilitiesHome } = useResponsibilitiesEnabled();

  const chatItem = <SidebarNavItem to="/chats" label={t("sidebar.chat")} icon={MessageCircle} badge={unreadChatCount} badgeLabel={t("sidebar.unreadChats")} />;
  // Combined Inbox + Task List: Inbox is a view inside Tasks, so the
  // unread/failed-run badge rides on Tasks.
  const tasksItem = combinedInboxTasks ? (
    <SidebarNavItem
      to="/issues"
      label={t("sidebar.tasks")}
      icon={CircleCheck}
      badge={inboxBadge.inbox}
      badgeLabel={t("common.unread")}
      badgeTone={inboxBadge.failedRuns > 0 ? "danger" : "default"}
      alert={inboxBadge.failedRuns > 0}
    />
  ) : (
    <SidebarNavItem to="/issues" label={t("sidebar.tasks")} icon={CircleCheck} />
  );
  const inboxItem = !combinedInboxTasks ? (
    <SidebarNavItem
      to="/inbox"
      label={t("sidebar.inbox")}
      icon={Inbox}
      badge={inboxBadge.inbox}
      badgeLabel={t("common.unread")}
      badgeTone={inboxBadge.failedRuns > 0 ? "danger" : "default"}
      alert={inboxBadge.failedRuns > 0}
    />
  ) : null;
  // The classic dashboard. With Responsibilities as home that page takes the "Dashboard" name and this row is not shown.
  const dashboardItem = <SidebarNavItem to="/dashboard" label={t("sidebar.dashboard")} icon={LayoutDashboard} liveCount={liveRunCount} />;

  const pluginContext = {
    companyId: selectedCompanyId,
    companyPrefix: selectedCompany?.issuePrefix ?? null,
  };

  return (
    <aside
      className={cn(
        "w-full h-full min-h-0 flex flex-col",
        streamlinedUiEnabled
          ? primarySidebarStyles.surface
          : "border-r border-border bg-background",
      )}
    >
      {/* Top bar: company name, aligned with top sections and borderless.
          Search deliberately does NOT live here:
          the header's spare width goes to the workspace/organization name,
          which is the user's orientation anchor and truncates otherwise.
          Search is the first nav item below instead. */}
      <div className="flex h-(--sz-60px) shrink-0 items-center gap-1 px-3">
        <SidebarCompanyMenu />
      </div>

      <nav className={primarySidebarStyles.nav}>
        <div className={primarySidebarStyles.group}>
          {/* New Task button aligned with nav items */}
          <button
            onClick={() => openNewIssue()}
            data-slot="icon-button"
            className="flex items-center gap-2.5 mx-2 rounded-lg px-2 py-1.5 pointer-coarse:py-1 text-(length:--text-compact) font-medium text-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <SquarePen className="h-4 w-4 shrink-0" />
            <span className="truncate">{t("sidebar.newTask")}</span>
          </button>
          <SidebarNavItem to="/search" label={t("sidebar.search")} icon={Search} />
          {responsibilitiesHome ? (
            <>
              <SidebarNavItem to="/responsibilities" label={t("sidebar.responsibilities")} icon={Compass} />
              {agentChatEnabled ? chatItem : null}
              {tasksItem}
              {inboxItem}
            </>
          ) : (
            <>
              {dashboardItem}
              {inboxItem}
              {agentChatEnabled && !chatRail ? chatItem : null}
            </>
          )}
          {showDecisions ? (
            <SidebarNavItem
              to="/decisions"
              label={t("sidebar.decisions")}
              icon={ListChecks}
              badge={attentionCount}
              badgeLabel={t("common.decisions")}
            />
          ) : null}
          {showStatusCards ? (
            <SidebarNavItem to="/status" label={t("sidebar.status")} icon={LayoutGrid} textBadge={t("common.beta")} />
          ) : null}
          {conferenceRoomChatEnabled ? (
            <SidebarNavItem to="/board-chat" label={t("sidebar.conferenceRoom")} icon={MessagesSquare} />
          ) : null}
        </div>

        <SidebarSection label={t("sidebar.work")} collapsible={{ open: workOpen, onOpenChange: setWorkOpen }}>
          {/* Agent Chat: Chat leads the Work group as a single row — the
              agents you talk to live in the Chat surface's own secondary rail
              (ChatContextualSidebar), not in the primary nav. */}
          {responsibilitiesHome ? null : (
            <>
              {chatRail ? chatItem : null}
              {tasksItem}
            </>
          )}
          {streamlinedUiEnabled ? (
            <>
              <SidebarNavItem to="/projects" label={t("sidebar.projects")} icon={FolderOpen} />
              <SidebarStarredProjects />
            </>
          ) : null}
          <SidebarNavItem to="/routines" label={t("sidebar.routines")} icon={Repeat} />
          <SidebarNavItem to="/artifacts" label={t("sidebar.artifacts")} icon={Package} />
          {showCases ? (
            <SidebarNavItem to="/cases" label={t("sidebar.cases")} icon={Layers} textBadge={t("common.beta")} />
          ) : null}
          {showGoalsLink ? (
            <SidebarNavItem to="/goals" label={t("sidebar.goals")} icon={Target} />
          ) : goalsLinkPending ? (
            <div
              data-testid="sidebar-goals-placeholder"
              className="h-8 pointer-coarse:h-7"
              aria-hidden="true"
            />
          ) : null}
          {showWorkspacesLink ? (
            <SidebarNavItem to="/workspaces" label={t("sidebar.workspaces")} icon={GitBranch} />
          ) : null}
          <PluginSlotOutlet
            slotTypes={["sidebar"]}
            context={pluginContext}
            className="flex flex-col gap-0.5"
            itemClassName="text-(length:--text-compact) font-medium"
            missingBehavior="placeholder"
          />
          <PluginLauncherOutlet
            placementZones={["sidebar"]}
            context={pluginContext}
            className="flex flex-col gap-0.5"
            itemClassName="text-(length:--text-compact) font-medium"
          />
        </SidebarSection>

        {streamlinedUiEnabled ? (
          <SidebarSection
            label={t("sidebar.org")}
            collapsible={{ open: organizationOpen, onOpenChange: setOrganizationOpen }}
          >
            <SidebarNavItem to="/agents" label={t("sidebar.agents")} icon={Users} />
            <SidebarNavItem to="/skills" label={t("sidebar.skills")} icon={Boxes} />
            <SidebarNavItem to="/apps" label={t("sidebar.connectors")} icon={Unplug} />
            <SidebarNavItem to="/activity" label={t("sidebar.audit")} icon={History} />
          </SidebarSection>
        ) : null}

        {children ?? (streamlinedUiEnabled ? <SidebarAgents streamlined /> : null)}

        {streamlinedUiEnabled ? (
          <SidebarRecentTasks companyId={selectedCompanyId} liveIssueIds={liveIssueIds} />
        ) : (
          <>
            <SidebarProjects />
            <SidebarAgents />
            <SidebarSection
              label={t("sidebar.org")}
              collapsible={{ open: organizationOpen, onOpenChange: setOrganizationOpen }}
            >
              <SidebarNavItem to="/org" label={t("sidebar.org")} icon={Network} />
              <SidebarNavItem to="/apps" label={t("sidebar.connectors")} icon={Unplug} />
              <SidebarNavItem to="/timeline" label={t("sidebar.timeline")} icon={GanttChartSquare} />
              <SidebarNavItem to="/costs" label={t("sidebar.costs")} icon={DollarSign} />
              <SidebarNavItem to="/activity" label={t("sidebar.activity")} icon={History} />
              <SidebarNavItem to="/activity/commentary" label={t("sidebar.commentary")} icon={History} />
              <SidebarNavItem to="/company/settings" label={t("sidebar.settings")} icon={Settings} />
            </SidebarSection>
          </>
        )}

        <PluginSlotOutlet
          slotTypes={["sidebarPanel"]}
          context={pluginContext}
          className="flex flex-col gap-3"
          itemClassName="rounded-lg border border-border p-3"
          missingBehavior="placeholder"
        />
      </nav>
    </aside>
  );
}
