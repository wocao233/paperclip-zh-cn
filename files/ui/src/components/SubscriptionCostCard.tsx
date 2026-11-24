import { t } from "@/i18n";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { SUBSCRIPTION_CURRENCIES, centsToUsd, usdToCents, type SubscriptionAccountReport, type SubscriptionCostReport, type SubscriptionUsage } from "@paperclipai/shared";
import { subscriptionsApi } from "../api/subscriptions";
import { cn, formatCents, formatDateTime, formatTokens, providerDisplayName } from "../lib/utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ANALYTICS_MASK_CLASS } from "@/lib/analytics/privacy";

export function subscriptionMoney(cents: string, currency: string) {
  return currency === "USD" ? formatCents(Number(cents))
    : new Intl.NumberFormat(undefined, { style: "currency", currency, currencyDisplay: "code" }).format(Number(cents) / 100);
}

export function SubscriptionTokenUsage({ usage }: { usage: SubscriptionUsage }) {
  return <span className="font-mono text-xs text-muted-foreground">
    {formatTokens(usage.inputTokens + usage.cachedInputTokens)} in · {formatTokens(usage.outputTokens)} out
    {usage.cachedInputTokens > 0 && <span className="block">{formatTokens(usage.cachedInputTokens)} input cached</span>}
  </span>;
}

function SubscriptionEditor({ account, accounts, companyId, onDone }: {
  account: SubscriptionAccountReport; accounts: SubscriptionAccountReport[]; companyId: string; onDone: () => void;
}) {
  const [plan, setPlan] = useState(account.price.plan);
  const [amount, setAmount] = useState(account.price.amountCents == null ? "" : centsToUsd(account.price.amountCents).replace(/\.?0+$/, ""));
  const [currency, setCurrency] = useState(account.price.currency);
  const [cadence, setCadence] = useState(account.price.cadence);
  const [status, setStatus] = useState(account.price.status);
  const [targetId, setTargetId] = useState("");
  const save = useMutation({ mutationFn: () => subscriptionsApi.update(companyId, account.id, {
    expectedRevision: account.price.revision, plan, amountCents: amount.trim() ? usdToCents(amount.trim()) : null,
    currency: currency as typeof SUBSCRIPTION_CURRENCIES[number], cadence, status,
  }), onSuccess: onDone });
  const link = useMutation({ mutationFn: () => subscriptionsApi.link(companyId, account.id, targetId, account.price.revision,
    accounts.find(row => row.id === targetId)!.price.revision), onSuccess: onDone });
  const targets = accounts.filter(row => row.id !== account.id && row.provider === account.provider && row.canEdit);
  const busy = save.isPending || link.isPending;
  const selectClass = "h-9 rounded-md border border-input bg-background px-3 text-sm";
  return <div className="space-y-5">
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
      <div className="space-y-2"><Label htmlFor="subscription-plan">Plan</Label><Input id="subscription-plan" value={plan} onChange={event => setPlan(event.target.value)} required maxLength={100} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="subscription-price">Price per billing period</Label><Input id="subscription-price" type="number" min="0" step="any" value={amount} placeholder="Unknown" onChange={event => setAmount(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="subscription-currency">Currency</Label><select id="subscription-currency" className={selectClass} value={currency} onChange={event => setCurrency(event.target.value)}>{SUBSCRIPTION_CURRENCIES.map(code => <option key={code}>{code}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="subscription-cadence">Billed</Label><select id="subscription-cadence" className={selectClass} value={cadence} onChange={event => setCadence(event.target.value as typeof cadence)}><option value="month">Monthly</option><option value="year">Annually</option></select></div>
        <div className="space-y-2"><Label htmlFor="subscription-status">Tracking</Label><select id="subscription-status" className={selectClass} value={status} onChange={event => setStatus(event.target.value as typeof status)}><option value="active">Active</option><option value="ended">Subscription ended</option><option value="excluded">Exclude from this organization</option></select></div>
      </div>
      <p className="text-xs text-muted-foreground">Enter the full amount for one account or seat. Annual prices are divided by 12. Changes apply from now. Ending tracking here does not cancel your provider subscription.</p>
      {save.error && <p role="alert" className="text-sm text-destructive">Could not save this price. Check the amount, or reopen the account if another person updated it.</p>}
      <div className="flex items-center justify-between"><Button type="button" variant="ghost" disabled={busy} onClick={onDone}>Cancel</Button><Button type="submit" disabled={busy}>{save.isPending ? "Saving…" : "Save price"}</Button></div>
    </form>
    {targets.length > 0 && <div className="space-y-2 border-t border-border pt-4">
      <Label htmlFor="subscription-link">Same subscription as another account?</Label>
      <select id="subscription-link" className={cn(selectClass, ANALYTICS_MASK_CLASS)} value={targetId} onChange={event => setTargetId(event.target.value)}><option value="">Choose an account</option>{targets.map(row => <option key={row.id} value={row.id}>{row.name} · {row.price.plan}</option>)}</select>
      <p className="text-xs text-muted-foreground">Linking counts these accounts once, combines their Paperclip usage, and keeps the selected account’s price. Only link the same subscription or paid seat.</p>
      {link.error && <p role="alert" className="text-sm text-destructive">Could not link these accounts. Reopen their details and try again.</p>}
      <Button type="button" variant="outline" disabled={!targetId || busy} onClick={() => link.mutate()}>Link accounts</Button>
    </div>}
  </div>;
}

export function SubscriptionCostCard({ companyId, report, error, onChanged }: {
  companyId: string; report?: SubscriptionCostReport; error?: unknown; onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionAccountReport | null>(null);
  const closeEditor = () => { setEditing(null); onChanged(); };
  const known = report?.monthlyTotals.length;
  const estimatedCount = report?.monthlyTotals.reduce((sum, total) => sum + total.estimatedCount, 0) ?? 0;
  return <>
    <Card className="block p-4">
      <div className="text-(length:--text-micro) uppercase tracking-(--tracking-eyebrow) text-muted-foreground">{t("subscription.title")}</div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums">
        {known ? report!.monthlyTotals.map(total => <div key={total.currency}>{subscriptionMoney(total.amountCents, total.currency)}<span className="text-sm font-normal">/{t("subscription.perMonthShort")}</span></div>) : report && report.activeCount === 0 && report.accounts.length > 0 ? t("subscription.zeroPerMonth") : "—"}
      </div>
      <div className="mt-1 space-y-1 text-xs text-muted-foreground">
        {report ? <>
          {estimatedCount > 0 && <div><Badge variant="outline" className="font-normal text-muted-foreground">{estimatedCount < report.activeCount - report.unknownPriceCount ? t("subscription.partiallyEstimated") : t("subscription.estimated")}</Badge></div>}
          {report.unknownPriceCount > 0 && !!known && <div>{t("subscription.knownSubtotal")}</div>}
          <div>{report.accounts.length === 0 ? t("subscription.noVisible") : <>{t("subscription.activeCount", { count: report.activeCount })}{report.unknownPriceCount > 0 && ` · ${t("subscription.priceUnknown", { count: report.unknownPriceCount })}`}</>}</div>
          {report.accounts.length > 0 && <div>{t("subscription.monthlyFeesVisible")}</div>}
          {report.unidentifiedAccountCount > 0 && <div>{t("subscription.unconfirmed", { count: report.unidentifiedAccountCount })}</div>}
          <SubscriptionTokenUsage usage={report.subscription} />
        </> : error ? <div>{t("subscription.dataUnavailable")}</div> : <div>{t("subscription.loading")}</div>}
        {report && error ? <div>{t("subscription.showingLast")}</div> : null}
      </div>
      <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setOpen(true)} disabled={!report}>{t("subscription.viewDetails")}</Button>
    </Card>
    <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) setEditing(null); }}>
      <DialogContent className="max-h-(--sz-80vh) overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{editing ? t("subscription.priceTitle") : t("subscription.title")}</DialogTitle><DialogDescription>{t("subscription.dialogDescription")}</DialogDescription></DialogHeader>
        {editing ? <SubscriptionEditor key={editing.id} companyId={companyId} account={editing} accounts={report?.accounts ?? []} onDone={closeEditor} /> : <div className="space-y-4">
          {report?.accounts.length === 0 && <p className="text-sm text-muted-foreground">{t("subscription.noneVisible")}</p>}
          {report?.accounts.map(account => <div key={account.id} className="space-y-2 border-b border-border pb-4 last:border-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className={ANALYTICS_MASK_CLASS}><div className="font-medium">{account.name}</div><div className="text-xs text-muted-foreground">{account.shared ? t("subscription.shared") : account.ownerName ?? (account.ownerUserId ? t("subscription.accountOwner") : t("subscription.personalAccounts"))} · {providerDisplayName(account.provider)} · {account.price.plan}</div></div>
              <div className="text-right"><div className="font-mono">{account.price.status !== "active" ? account.price.status === "ended" ? t("subscription.ended") : t("subscription.excluded") : account.price.monthlyCents == null ? t("subscription.priceUnknown") : `${subscriptionMoney(account.price.monthlyCents, account.price.currency)}${t("subscription.perMonthSuffix")}`}</div><div className="text-xs text-muted-foreground">{account.price.source === "catalog" ? t("subscription.estimatedBeforeTax") : account.price.source === "user" ? t("subscription.userSupplied") : ""}{account.price.cadence === "year" ? t("subscription.annualDiv12") : ""}</div></div>
            </div>
            <SubscriptionTokenUsage usage={account.usage} />
            {Number(account.usage.costCents) > 0 && <div className="text-xs text-muted-foreground">{formatCents(Number(account.usage.costCents))} recorded usage charges in selected period, separate from the subscription fee.</div>}
            {account.agents.length > 0 && <div className="text-xs text-muted-foreground">{t("subscription.usedBy")} {account.agents.map(agent => agent.name).join(", ")}</div>}
            {!account.identityVerified && <p className="text-xs text-muted-foreground">{t("subscription.identityUnconfirmed")}</p>}
            {account.observedAt && <div className="text-xs text-muted-foreground">Plan checked {formatDateTime(account.observedAt)}{account.refreshStatus === "unavailable" ? " · latest check unavailable" : ""}</div>}
            {account.refreshStatus === "unavailable" && !account.observedAt && <p className="text-xs text-muted-foreground">{t("subscription.providerNoPlan")}</p>}
            {account.canEdit && <div><Button variant="outline" size="sm" onClick={() => setEditing(account)}>{t("subscription.editPrice")}</Button></div>}
          </div>)}
          {!!report?.unattributedSubscription.eventCount && <p className="text-xs text-muted-foreground">{t("subscription.someUnattributed")}</p>}
          <p className="text-xs text-muted-foreground">{t("subscription.feesFootnote")}</p>
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}
