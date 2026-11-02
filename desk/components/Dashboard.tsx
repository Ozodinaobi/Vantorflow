"use client";

import { useEffect, useMemo, useState } from "react";

type Data = {
  users: any[];
  counts: { users: number; rfqs: number; opportunities: number; aiCalls: number; tokens: number };
  flags: any[];
  config: any;
  activity: any[];
  partial?: Record<string, boolean>;
  usageWindowStart?: string;
};

const date = (value: any) => value ? new Date(value).toLocaleString() : "Not recorded";
const shortDate = (value: any) => value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Unknown";
const sections = [
  { id: "overview", label: "Overview", icon: "◫" },
  { id: "accounts", label: "Accounts", icon: "◎" },
  { id: "flags", label: "Moderation", icon: "◇" },
  { id: "activity", label: "Audit trail", icon: "≋" },
  { id: "settings", label: "Safety policy", icon: "⌘" },
];

function downloadCsv(name: string, rows: any[][]) {
  const csv = rows.map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("overview");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [cap, setCap] = useState(100);
  const [reason, setReason] = useState("");
  const [confirmAction, setConfirmAction] = useState("");
  const [deleteEmail, setDeleteEmail] = useState("");
  const [rules, setRules] = useState<any>({});
  const [rulesLoaded, setRulesLoaded] = useState(false);
  const [sort, setSort] = useState("newest");
  const [auditQuery, setAuditQuery] = useState("");
  const [auditAction, setAuditAction] = useState("all");
  const [flagStatus, setFlagStatus] = useState("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const PAGE = 25;

  async function load() {
    try {
      setErr("");
      const response = await fetch("/api/admin/overview", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load records");
      setData(result);
      setLastUpdated(new Date());
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not load admin data");
    }
  }

  async function loadRules() {
    try {
      const response = await fetch("/api/admin/config", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load safety rules");
      setRules(result);
      setRulesLoaded(true);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not load safety rules");
    }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (tab === "settings" && !rulesLoaded) void loadRules(); }, [tab, rulesLoaded]);

  async function detail(id: string) {
    try {
      setErr("");
      const response = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load account");
      setSelected(result);
      setCap(result.control?.ai_monthly_cap ?? 100);
      setReason("");
      window.setTimeout(() => document.getElementById("account-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not load account");
    }
  }

  async function post(path: string, body: any) {
    setBusy(true);
    setErr("");
    try {
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Action failed");
      await load();
      if (body.action === "delete") { setSelected(null); setTab("accounts"); }
      else if (selected) await detail(selected.user?.id);
      setConfirmAction("");
      setDeleteEmail("");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function patch(path: string, body: any) {
    setBusy(true);
    setErr("");
    try {
      const response = await fetch(path, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Action failed");
      await load();
      if (selected) await detail(selected.user?.id);
      if (path === "/api/admin/config") setRules(result);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/login";
  }

  const shown = useMemo(() => {
    const list = (data?.users || []).filter(user => (status === "all" || user.status === status) && `${user.email || ""} ${user.id}`.toLowerCase().includes(query.toLowerCase()));
    return list.sort((a, b) => sort === "email" ? String(a.email || "").localeCompare(String(b.email || "")) : sort === "usage" ? (b.usage_count || 0) - (a.usage_count || 0) : new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [data, query, status, sort]);
  const filteredFlags = (data?.flags || []).filter((flag: any) => flagStatus === "all" || flag.status === flagStatus);
  const filteredActivity = (data?.activity || []).filter((item: any) => (auditAction === "all" || item.action === auditAction) && `${item.action || ""} ${item.user_id || ""} ${item.actor_id || ""} ${JSON.stringify(item.details || {})}`.toLowerCase().includes(auditQuery.toLowerCase()));
  const pageRows = shown.slice(page * PAGE, (page + 1) * PAGE);
  const usageThisMonth = (selected?.usage || []).filter((item: any) => data?.usageWindowStart ? item.created_at >= data.usageWindowStart : false).length;
  const userCounts = useMemo(() => ({
    active: (data?.users || []).filter(user => (user.status || "active") === "active").length,
    suspended: (data?.users || []).filter(user => user.status === "suspended").length,
    terminated: (data?.users || []).filter(user => user.status === "terminated").length,
  }), [data]);
  const spark = useMemo(() => {
    const points = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(); day.setDate(day.getDate() - (6 - index)); day.setHours(0, 0, 0, 0);
      return (data?.activity || []).filter(item => { const at = new Date(item.created_at); return at.toDateString() === day.toDateString(); }).length;
    });
    const max = Math.max(1, ...points);
    return points.map((point, index) => `${index * 48 + 8},${76 - (point / max) * 58}`).join(" ");
  }, [data]);

  return <main className="admin-shell">
    <aside className="sidebar">
      <a className="brand" href="#top" aria-label="Vantorflow desk home">vantorflow<span>.</span><small>ADMIN DESK</small></a>
      <div className="side-caption">WORKSPACE</div>
      <nav className="side-nav" aria-label="Admin sections">{sections.map(section => <button key={section.id} className={`side-link ${tab === section.id ? "selected" : ""}`} aria-current={tab === section.id ? "page" : undefined} onClick={() => { setTab(section.id); setSelected(null); }}><span className="side-icon" aria-hidden="true">{section.icon}</span>{section.label}{section.id === "flags" && !!data?.flags?.length && <span className="side-count">{data.flags.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="live-indicator"><i /> System overview</div><div className="side-admin"><span className="avatar">A</span><span><strong>Administrator</strong><small>Platform access</small></span><button className="icon-button" onClick={logout} aria-label="Log out" title="Log out">↗</button></div></div>
    </aside>

    <section className="workspace" id="top">
      <header className="workspace-top"><div className="crumb">VANTORFLOW <span>/</span> CONTROL ROOM</div><div className="top-actions"><span className="synced">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Connecting"}</span><button className="icon-button refresh" onClick={() => void load()} disabled={busy} aria-label="Refresh platform data" title="Refresh data">↻</button><button className="logout-button" onClick={logout}>Log out <span>↗</span></button></div></header>
      <main className="content">
        <div className="page-heading"><div><div className="overline">{tab === "overview" ? "PLATFORM PULSE" : "ADMINISTRATION / " + sections.find(section => section.id === tab)?.label.toUpperCase()}</div><h1>{tab === "overview" ? "Good to see you." : sections.find(section => section.id === tab)?.label}</h1><p>{tab === "overview" ? "A clear view of what is happening across Vantorflow." : tab === "accounts" ? "Search, review and manage platform accounts." : tab === "flags" ? "Review and resolve reported platform activity." : tab === "activity" ? "A traceable history of administrator actions." : "Configure the saved abuse-monitoring policy."}</p></div><button className="primary-button" onClick={() => void load()} disabled={busy}><span>↻</span> Refresh data</button></div>
        {err && <p role="alert" className="error-banner"><span>!</span>{err}<button className="icon-button" onClick={() => setErr("")} aria-label="Dismiss error">×</button></p>}
        {!data ? <div className="loading-card">{err ? "Platform records could not be loaded." : "Loading platform records…"}</div> : <>
          {tab === "overview" && <>
            <div className="stat-grid">
              {[["TOTAL ACCOUNTS", data.counts.users, "All registered accounts", "◉"], ["OPEN OPPORTUNITIES", data.counts.opportunities, "Across the marketplace", "↗"], ["REQUESTS FOR QUOTE", data.counts.rfqs, "Submitted by buyers", "▤"], ["AI CALLS THIS MONTH", data.counts.aiCalls, `${Number(data.counts.tokens || 0).toLocaleString()} tracked tokens`, "✳"]].map(([label, value, note, icon]) => <article className="stat-card" key={String(label)}><div className="stat-top"><span>{label}</span><i>{icon}</i></div><div className="stat-value">{Number(value).toLocaleString()}</div><div className="stat-note"><b />{note}</div></article>)}
            </div>
            <div className="overview-grid">
              <section className="panel activity-panel"><div className="panel-heading"><div><div className="overline">ADMIN ACTIVITY</div><h2>Recent activity</h2></div><button className="text-button" onClick={() => setTab("activity")}>View audit trail <span>↗</span></button></div><div className="chart-summary"><strong>{data.activity.length.toLocaleString()}</strong><span>recent records available</span><svg className="sparkline" viewBox="0 0 296 86" role="img" aria-label="Administrative activity for the last seven days"><defs><linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#10b981" stopOpacity=".32"/><stop offset="1" stopColor="#10b981" stopOpacity="0"/></linearGradient></defs><polygon points={`8,84 ${spark} 296,84`} fill="url(#sparkFill)"/><polyline points={spark} fill="none" stroke="#36d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>{data.activity.slice(0, 5).map((item: any) => <div className="activity-row" key={item.id}><span className="activity-dot"/><div><strong>{item.action || "Platform event"}</strong><small>{item.user_id || "Platform"} · by {item.actor_id || "system"}</small></div><time>{shortDate(item.created_at)}</time></div>)}{!data.activity.length && <p className="empty-state">No audit records returned. History begins when logging was enabled.</p>}</section>
              <section className="panel health-panel"><div className="overline">ACCOUNT HEALTH</div><h2>Access snapshot</h2><p className="panel-copy">Current status across the loaded account directory.</p><div className="health-total"><strong>{data.counts.users.toLocaleString()}</strong><span>total accounts</span></div>{[["Active", userCounts.active, "active"], ["Suspended", userCounts.suspended, "suspended"], ["Terminated", userCounts.terminated, "terminated"]].map(([label, value, key]) => <div className="health-row" key={String(key)}><span><i className={`health-dot ${key}`} />{label}</span><strong>{Number(value).toLocaleString()}</strong></div>)}{data.partial?.accounts && <p className="partial-note">Account directory reached its 10,000-record read limit.</p>}<button className="secondary-button full-button" onClick={() => setTab("accounts")}>Manage accounts <span>↗</span></button></section>
            </div>
            <section className="panel quick-panel"><div className="panel-heading"><div><div className="overline">QUICK ACCESS</div><h2>Administration</h2></div></div><div className="quick-grid">{sections.slice(1).map(section => <button key={section.id} className="quick-card" onClick={() => { setTab(section.id); setSelected(null); }}><span className="quick-icon">{section.icon}</span><span><strong>{section.label}</strong><small>{section.id === "accounts" ? `${data.counts.users.toLocaleString()} registered` : section.id === "flags" ? `${data.flags.length} recent flags` : section.id === "activity" ? `${data.activity.length} recent entries` : "Saved policy controls"}</small></span><b>↗</b></button>)}</div></section>
          </>}

          {tab === "accounts" && <section className="panel table-panel"><div className="panel-heading"><div><div className="overline">DIRECTORY</div><h2>Platform accounts <span className="result-count">{shown.length.toLocaleString()} matching</span></h2></div><button className="secondary-button" onClick={() => downloadCsv("vantorflow-accounts.csv", [["email", "id", "status", "joined", "ai_calls", "rfqs", "opportunities"], ...shown.map(user => [user.email || "", user.id, user.status || "active", user.created_at || "", user.usage_count || 0, user.rfq_count || 0, user.opportunity_count || 0])])}>↓ Export CSV</button></div>
            <div className="filter-bar"><label className="search-box"><span>⌕</span><input aria-label="Search accounts" placeholder="Search by email or account ID" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} />{query && <button onClick={() => { setQuery(""); setPage(0); }} aria-label="Clear account search">×</button>}</label><select aria-label="Filter account status" value={status} onChange={event => { setStatus(event.target.value); setPage(0); }}><option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="terminated">Terminated</option></select><select aria-label="Sort accounts" value={sort} onChange={event => { setSort(event.target.value); setPage(0); }}><option value="newest">Newest first</option><option value="email">Email A–Z</option><option value="usage">Highest usage</option></select></div>
            <div className="table-scroll"><table><thead><tr><th>ACCOUNT</th><th>STATUS</th><th>AI CALLS</th><th>RFQS</th><th>OPPORTUNITIES</th><th>JOINED</th><th /></tr></thead><tbody>{pageRows.map(user => <tr key={user.id}><td><strong>{user.email || "No email"}</strong><small className="id-line">{user.id}</small></td><td><span className={`status-chip ${user.status || "active"}`}><i />{user.status || "active"}</span></td><td>{user.usage_count || 0}<small> / {user.ai_monthly_cap ?? "—"} cap</small></td><td>{user.rfq_count || 0}</td><td>{user.opportunity_count || 0}</td><td>{shortDate(user.created_at)}</td><td><button className="row-action" onClick={() => void detail(user.id)}>View account <span>↗</span></button></td></tr>)}</tbody></table></div>
            {!pageRows.length && <p className="empty-state">No matching accounts. Try a different search or status.</p>}
            <div className="pagination"><span>Showing {shown.length ? page * PAGE + 1 : 0}–{Math.min((page + 1) * PAGE, shown.length)} of {shown.length.toLocaleString()}</span><div><button className="secondary-button" disabled={page === 0} onClick={() => setPage(index => Math.max(0, index - 1))}>← Previous</button><button className="secondary-button" disabled={(page + 1) * PAGE >= shown.length} onClick={() => setPage(index => index + 1)}>Next →</button></div></div>
            {data.partial?.accounts && <p className="partial-note">The directory reached the 10,000-account read limit; results may be incomplete.</p>}
          </section>}

          {tab === "flags" && <section className="panel table-panel"><div className="panel-heading"><div><div className="overline">SAFETY OPERATIONS</div><h2>Moderation flags <span className="result-count">{filteredFlags.length} shown</span></h2></div><select aria-label="Filter moderation status" value={flagStatus} onChange={event => setFlagStatus(event.target.value)}><option value="all">All statuses</option><option value="open">Open</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option><option value="false_positive">False positive</option></select></div>{filteredFlags.length ? filteredFlags.map((flag: any) => <article className="flag-card" key={flag.id}><div className="flag-top"><div><span className={`severity ${flag.severity}`}>{flag.severity || "unrated"} severity</span><strong>{flag.rule_key}</strong></div><span className={`status-chip ${flag.status}`}><i />{flag.status}</span></div><p>{flag.details?.summary || JSON.stringify(flag.details || {})}</p><div className="flag-meta">{shortDate(flag.created_at)} · {flag.user_id || "No linked account"}</div><div className="flag-actions"><button className="secondary-button" disabled={busy || flag.status === "reviewing"} onClick={() => void patch(`/api/admin/flags/${flag.id}`, { status: "reviewing" })}>Mark reviewing</button><button className="secondary-button" disabled={busy || flag.status === "resolved"} onClick={() => void patch(`/api/admin/flags/${flag.id}`, { status: "resolved", note: "Reviewed by administrator" })}>Resolve flag</button><button className="secondary-button" disabled={busy || flag.status === "false_positive"} onClick={() => void patch(`/api/admin/flags/${flag.id}`, { status: "false_positive", note: "Marked false positive by administrator" })}>Mark false positive</button>{flag.user_id && <button className="text-button" onClick={() => { setTab("accounts"); void detail(flag.user_id); }}>View account ↗</button>}</div></article>) : <p className="empty-state">No flags match this review status.</p>}{data.partial?.flags && <p className="partial-note">Showing the latest 100 flags; older records are not included.</p>}</section>}

          {tab === "activity" && <section className="panel table-panel"><div className="panel-heading"><div><div className="overline">ACCOUNTABILITY</div><h2>Administrative history <span className="result-count">{filteredActivity.length} shown</span></h2></div><button className="secondary-button" onClick={() => downloadCsv("vantorflow-audit.csv", [["action", "user_id", "actor_id", "created_at", "details"], ...filteredActivity.map((item: any) => [item.action, item.user_id, item.actor_id, item.created_at, JSON.stringify(item.details || {})])])}>↓ Export audit CSV</button></div><div className="filter-bar"><label className="search-box"><span>⌕</span><input aria-label="Search audit log" placeholder="Search actor, account, action or details" value={auditQuery} onChange={event => setAuditQuery(event.target.value)} />{auditQuery && <button onClick={() => setAuditQuery("")} aria-label="Clear audit search">×</button>}</label><select aria-label="Filter audit action" value={auditAction} onChange={event => setAuditAction(event.target.value)}><option value="all">All actions</option>{Array.from(new Set((data.activity || []).map((item: any) => item.action).filter(Boolean))).sort().map((action: any) => <option key={action} value={action}>{action}</option>)}</select></div>{filteredActivity.length ? filteredActivity.map((item: any) => <div className="audit-row" key={item.id}><span className="audit-icon">≋</span><div className="audit-copy"><strong>{item.action || "Platform event"}</strong><small>{item.user_id || "Platform event"} · actor {item.actor_id || "unknown"}</small>{Object.keys(item.details || {}).length > 0 && <details><summary>View event details</summary><pre>{JSON.stringify(item.details, null, 2)}</pre></details>}</div><time>{date(item.created_at)}</time></div>) : <p className="empty-state">No matching activity records. Older actions are not reconstructed if logging was not enabled.</p>}{data.activity?.length >= 100 && <p className="partial-note">Showing the latest 100 audit records.</p>}</section>}

          {tab === "settings" && <section className="panel policy-panel"><div className="overline">PLATFORM CONTROLS</div><h2>Abuse-monitoring policy</h2><p className="panel-copy">These settings are saved and added to the audit trail. The current desk stores policy values, but the main platform does not enforce these checks yet.</p>{!rulesLoaded ? <p className="empty-state">Loading saved policy…</p> : <><label className="policy-toggle"><span><strong>Enable monitoring policy</strong><small>Save policy as enabled. This does not switch on automated enforcement in the main platform.</small></span><input type="checkbox" checked={!!rules.enabled} onChange={event => setRules({ ...rules, enabled: event.target.checked })} /></label><label className="policy-field"><span><strong>Request rate threshold</strong><small>Maximum requests per minute in the saved policy.</small></span><div><input type="number" min="1" max="10000" value={rules.request_rate_per_minute ?? 60} onChange={event => setRules({ ...rules, request_rate_per_minute: Number(event.target.value) })} /><small>requests / min</small></div></label><label className="policy-field"><span><strong>Monthly AI cap response</strong><small>Saved response when a usage cap is reached.</small></span><select value={rules.monthly_ai_cap_action || "flag"} onChange={event => setRules({ ...rules, monthly_ai_cap_action: event.target.value })}><option value="flag">Flag for review</option><option value="limit">Limit AI access</option></select></label><label className="policy-field"><span><strong>Suspicious pattern response</strong><small>Saved response for suspicious activity patterns.</small></span><select value={rules.suspicious_pattern_action || "flag"} onChange={event => setRules({ ...rules, suspicious_pattern_action: event.target.value })}><option value="flag">Flag for review</option><option value="limit">Limit AI access</option></select></label><div className="policy-footer"><span>Automatic suspension is disabled.</span><button className="primary-button" disabled={busy} onClick={() => void patch("/api/admin/config", rules)}>{busy ? "Saving…" : "Save policy changes"}</button></div></>}</section>}

          {selected && <section className="panel account-detail" id="account-detail"><div className="panel-heading"><div><div className="overline">ACCOUNT RECORD</div><h2>{selected.user?.email || "No email"}</h2><div className="panel-copy">ID {selected.user?.id} · {selected.control?.status || "active"} · joined {date(selected.user?.created_at)}</div></div><button className="secondary-button" onClick={() => setSelected(null)}>Close detail ×</button></div><div className="detail-grid"><article className="detail-card"><div className="overline">AI USAGE THIS MONTH</div><div className="detail-metric">{usageThisMonth}</div><p>Tracked events since {data.usageWindowStart ? new Date(data.usageWindowStart).toLocaleDateString() : "month start"}</p><label className="cap-label">Monthly AI call cap</label><input aria-label="Monthly AI call cap" type="number" min="0" max="1000000" value={cap} onChange={event => setCap(Number(event.target.value))} /><button className="primary-button" disabled={busy || !Number.isInteger(cap) || cap < 0 || cap > 1000000} onClick={() => void post(`/api/admin/users/${selected.user.id}/action`, { action: "set_cap", cap, reason: reason || "Updated from admin desk" })}>Save usage cap</button></article><article className="detail-card"><div className="overline">ACCOUNT ACCESS</div><p className="status-summary">Current status: <strong>{selected.control?.status || "active"}</strong></p><input className="reason-input" aria-label="Moderation reason" placeholder="Reason for moderation (optional)" value={reason} onChange={event => setReason(event.target.value)} /><div className="detail-actions"><button className="secondary-button" disabled={busy || selected.control?.status === "terminated"} onClick={() => setConfirmAction(selected.control?.status === "suspended" ? "unsuspend" : "suspend")}>{selected.control?.status === "suspended" ? "Restore account" : "Suspend account"}</button><button className="secondary-button danger-button" disabled={busy || selected.control?.status === "terminated"} onClick={() => setConfirmAction("terminate")}>Terminate account</button><button className="secondary-button danger-button" disabled={busy} onClick={() => { setDeleteEmail(""); setConfirmAction("delete"); }}>Delete permanently</button></div><small className="warning-copy">Termination applies an extended sign-in ban. Permanent deletion removes the Auth account and can cascade to linked records.</small></article></div>
            <DetailList title={`Opportunities (${selected.opportunities?.length || 0} returned)`} rows={selected.opportunities} render={(item: any) => <><strong>{item.title}</strong><small>{item.buyer || "Buyer not recorded"} · {item.status} · deadline {item.deadline || "not recorded"} · value {item.value ?? "not recorded"}</small></>} /><DetailList title={`RFQs (${selected.rfqs?.length || 0} returned)`} rows={selected.rfqs} render={(item: any) => <><strong>{item.title}</strong><small>{item.buyer || "Buyer not recorded"} · deadline {item.deadline || "not recorded"} · estimated value {item.estimated_value ?? "not recorded"}</small></>} /><DetailList title={`Usage events (${selected.usage?.length || 0} recent)`} rows={selected.usage} render={(item: any) => <><strong>{item.feature}</strong><small>{item.outcome} · {item.tokens_total ?? "tokens not recorded"} tokens</small></>} /><DetailList title="Account flags" rows={selected.flags} render={(item: any) => <><strong>{item.rule_key} · {item.severity}</strong><small>{item.status} · {item.details?.summary || ""}</small></>} /><DetailList title="Account activity" rows={selected.activity} render={(item: any) => <><strong>{item.action}</strong><small>{JSON.stringify(item.details || {})}</small></>} />{Object.entries(selected.partial || {}).some(([, value]) => value) && <p className="partial-note">One or more account sections are limited to the latest 100 records.</p>}
          </section>}
        </>}
      </main>
    </section>
    {confirmAction && selected && <div className="modalback" role="presentation"><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><div className="overline">CONFIRM ACCOUNT ACTION</div><h2 id="confirm-title">{confirmAction === "delete" ? "Permanently delete account?" : confirmAction === "terminate" ? "Terminate account?" : confirmAction === "suspend" ? "Suspend account?" : "Restore account?"}</h2><p>{confirmAction === "delete" ? "This permanently deletes the authentication account. Linked records may also be removed. This cannot be undone. Type the account email below to confirm." : confirmAction === "terminate" ? "This applies an extended sign-in ban and marks the account terminated. It does not delete the user's records." : confirmAction === "suspend" ? "The user will lose sign-in access. You can restore access later." : "This restores sign-in access for this account."}</p>{confirmAction === "delete" && <input className="reason-input" aria-label="Type account email to confirm deletion" placeholder={selected.user?.email || "Account email"} value={deleteEmail} onChange={event => setDeleteEmail(event.target.value)} />}<div className="modal-actions"><button className="secondary-button" disabled={busy} onClick={() => setConfirmAction("")}>Cancel</button><button className={`primary-button ${confirmAction === "terminate" || confirmAction === "delete" ? "danger-button" : ""}`} disabled={busy || (confirmAction === "delete" && deleteEmail !== selected.user?.email)} onClick={() => void post(`/api/admin/users/${selected.user.id}/action`, confirmAction === "delete" ? { action: "delete", email: selected.user?.email, confirm_email: deleteEmail, reason } : { action: confirmAction, reason: reason || undefined })}>{busy ? "Working…" : confirmAction === "delete" ? "Delete permanently" : "Confirm action"}</button></div></section></div>}
  </main>;
}

function DetailList({ title, rows, render }: { title: string; rows?: any[]; render: (item: any) => React.ReactNode }) {
  return <div className="detail-list"><h3>{title}</h3>{rows?.length ? rows.map((item: any) => <div className="detail-row" key={item.id}><div>{render(item)}</div><time>{date(item.updated_at || item.created_at)}</time></div>) : <p>No records returned.</p>}</div>;
}
