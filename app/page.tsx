'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  HiOutlineInbox,
  HiOutlineBell,
  HiOutlineCog6Tooth,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineUser,
  HiOutlinePencilSquare,
  HiOutlineCheckBadge,
  HiOutlineFunnel,
  HiOutlineChevronLeft,
  HiOutlineEnvelope,
  HiOutlineExclamationTriangle,
  HiOutlineInboxStack,
  HiOutlinePaperAirplane,
  HiOutlineXMark,
  HiOutlineMagnifyingGlass,
  HiOutlineServer,
  HiOutlineCpuChip,
  HiOutlineSignal,
  HiOutlineDocumentText,
  HiOutlineShieldCheck,
  HiOutlineInformationCircle,
  HiOutlineBars3,
} from 'react-icons/hi2'
import { Loader2 } from 'lucide-react'

// ===== TYPES =====

interface ActionItem {
  task: string
  owner: string
  type: string
}

interface Deadline {
  item: string
  date: string
}

interface Email {
  email_id: string
  sender: string
  subject: string
  date: string
  summary: string
  technical_context: string
  tone: string
  priority_level: string
  priority_rationale: string
  urgency_signals: string[]
  action_items: ActionItem[]
  technical_decisions: string[]
  deadlines: Deadline[]
  stakeholder_requests: string[]
  system_references: string[]
  reply_draft: string
  reply_tone: string
  key_points_addressed: string[]
  replied?: boolean
}

interface ProcessedData {
  emails: Email[]
  total_emails: number
  critical_count: number
  high_count: number
  processing_timestamp: string
}

interface Settings {
  maxEmails: number
  vipSenders: string
  priorityKeywords: string
  defaultQuery: string
}

// ===== CONSTANTS =====

const MANAGER_AGENT_ID = '699bc611cdfd71b8f1835e77'

const AGENTS = [
  { id: '699bc611cdfd71b8f1835e77', name: 'Email Orchestrator Manager', purpose: 'Coordinates all sub-agents and aggregates results' },
  { id: '699bc5e9cdfd71b8f1835e75', name: 'Email Summarization Agent', purpose: 'Generates concise email summaries' },
  { id: '699bc5e974f59c4579ca7c05', name: 'Key Points Extractor Agent', purpose: 'Extracts action items, decisions, deadlines' },
  { id: '699bc5e9d0caccbfc05176e9', name: 'Priority Classifier Agent', purpose: 'Classifies email priority levels' },
  { id: '699bc5f8cf61d847321959ea', name: 'Reply Suggestion Agent', purpose: 'Generates professional reply drafts' },
]

const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }

const SAMPLE_EMAILS: Email[] = [
  {
    email_id: 'sample-001',
    sender: 'Dr. Sarah Chen <s.chen@nyu.edu>',
    subject: 'URGENT: Azure AD Federation Migration - Production Deadline Friday',
    date: '2026-02-23T09:15:00Z',
    summary: 'Dr. Chen requires immediate attention for the Azure AD federation migration scheduled for Friday. The IAM team has discovered compatibility issues with the legacy SAML assertions that could affect 12,000 faculty accounts. She is requesting an emergency architecture review before the change window.',
    technical_context: 'Azure AD federation, SAML 2.0 assertions, legacy IdP migration, OAuth 2.0 token exchange, conditional access policies',
    tone: 'urgent',
    priority_level: 'Critical',
    priority_rationale: 'Production-impacting migration with a hard Friday deadline affecting 12,000+ user accounts. Compatibility issues discovered late in the cycle require immediate architecture review.',
    urgency_signals: ['Production deadline Friday', 'Compatibility issues discovered', '12,000 accounts affected', 'Emergency review requested'],
    action_items: [
      { task: 'Schedule emergency architecture review meeting', owner: 'Solutions Architect', type: 'meeting' },
      { task: 'Review SAML assertion compatibility matrix', owner: 'IAM Team', type: 'technical' },
      { task: 'Prepare rollback plan for federation cutover', owner: 'DevOps', type: 'planning' },
    ],
    technical_decisions: ['Evaluate SAML 2.0 vs OAuth 2.0 migration path', 'Determine conditional access policy impact'],
    deadlines: [
      { item: 'Federation migration cutover', date: '2026-02-27' },
      { item: 'Architecture review completion', date: '2026-02-24' },
    ],
    stakeholder_requests: ['Emergency architecture review before Friday', 'Risk assessment for faculty account migration'],
    system_references: ['Azure AD', 'SAML IdP', 'NYU Central Authentication'],
    reply_draft: '',
    reply_tone: 'professional',
    key_points_addressed: [],
    replied: false,
  },
  {
    email_id: 'sample-002',
    sender: 'James Rodriguez <j.rodriguez@nyu.edu>',
    subject: 'Re: Kubernetes Cluster Scaling - Spring Semester Load Projections',
    date: '2026-02-23T08:30:00Z',
    summary: 'James shares updated load projections for the spring semester showing a 340% increase in compute demand for the research computing cluster. He proposes moving to a multi-cluster architecture with Istio service mesh and requests budget approval for 48 additional nodes.',
    technical_context: 'Kubernetes, AKS, Istio service mesh, HPA/VPA autoscaling, GPU node pools, Prometheus monitoring',
    tone: 'informational',
    priority_level: 'High',
    priority_rationale: 'Significant infrastructure scaling decision with budget implications. Spring semester load increase requires proactive planning to avoid service disruptions.',
    urgency_signals: ['340% compute demand increase', 'Budget approval needed', 'Spring semester timeline'],
    action_items: [
      { task: 'Review multi-cluster architecture proposal', owner: 'Solutions Architect', type: 'technical' },
      { task: 'Submit budget request for 48 additional nodes', owner: 'James Rodriguez', type: 'administrative' },
      { task: 'Evaluate Istio service mesh performance impact', owner: 'Platform Team', type: 'technical' },
    ],
    technical_decisions: ['Multi-cluster vs single-cluster with larger node pools', 'Istio vs Linkerd for service mesh'],
    deadlines: [
      { item: 'Spring semester infrastructure readiness', date: '2026-03-15' },
      { item: 'Budget approval submission', date: '2026-03-01' },
    ],
    stakeholder_requests: ['Architecture review of multi-cluster proposal', 'Cost-benefit analysis for node expansion'],
    system_references: ['AKS Research Cluster', 'Prometheus/Grafana Stack', 'GPU Node Pool'],
    reply_draft: '',
    reply_tone: 'technical',
    key_points_addressed: [],
    replied: false,
  },
  {
    email_id: 'sample-003',
    sender: 'Maria Thompson <m.thompson@nyu.edu>',
    subject: 'Data Pipeline Optimization Results - Q4 Report',
    date: '2026-02-22T16:45:00Z',
    summary: 'Maria presents the Q4 data pipeline optimization results showing a 67% reduction in processing latency and 42% cost savings after migrating to Apache Spark on Databricks. She recommends extending the approach to three additional research departments.',
    technical_context: 'Apache Spark, Databricks, Delta Lake, ETL pipelines, data lakehouse architecture, cost optimization',
    tone: 'formal',
    priority_level: 'Medium',
    priority_rationale: 'Positive results report with expansion recommendations. No immediate action required but strategic decision on department-wide rollout needed.',
    urgency_signals: ['Q4 results ready for review', 'Expansion recommendation pending'],
    action_items: [
      { task: 'Review Q4 pipeline optimization metrics', owner: 'Solutions Architect', type: 'review' },
      { task: 'Assess feasibility of department-wide Databricks rollout', owner: 'Data Engineering', type: 'planning' },
    ],
    technical_decisions: ['Approve Databricks expansion to additional departments', 'Delta Lake vs Iceberg for new pipelines'],
    deadlines: [{ item: 'Q1 planning submission', date: '2026-03-10' }],
    stakeholder_requests: ['Approval for three-department expansion', 'Resource allocation for migration team'],
    system_references: ['Databricks Workspace', 'Azure Data Lake', 'ETL Pipeline Registry'],
    reply_draft: '',
    reply_tone: 'professional',
    key_points_addressed: [],
    replied: false,
  },
  {
    email_id: 'sample-004',
    sender: 'Alex Kim <a.kim@nyu.edu>',
    subject: 'Monthly Security Audit Summary - February 2026',
    date: '2026-02-22T11:00:00Z',
    summary: 'Alex provides the monthly security audit summary. No critical vulnerabilities found. Two medium-severity items flagged: an outdated TLS configuration on the staging API gateway and a missing WAF rule for the new student portal endpoint. Both have recommended fixes attached.',
    technical_context: 'TLS 1.3 configuration, WAF rules, API gateway security, vulnerability scanning, compliance audit',
    tone: 'formal',
    priority_level: 'Low',
    priority_rationale: 'Routine security audit with no critical findings. Medium-severity items have recommended fixes and no immediate exploitation risk.',
    urgency_signals: ['Routine monthly report', 'No critical vulnerabilities'],
    action_items: [
      { task: 'Update TLS configuration on staging API gateway', owner: 'Platform Team', type: 'security' },
      { task: 'Add WAF rule for student portal endpoint', owner: 'Security Team', type: 'security' },
    ],
    technical_decisions: ['TLS 1.3 minimum version enforcement timeline'],
    deadlines: [{ item: 'Medium-severity remediation', date: '2026-03-15' }],
    stakeholder_requests: ['Acknowledge audit findings'],
    system_references: ['API Gateway (Staging)', 'Student Portal WAF', 'Qualys Scanner'],
    reply_draft: '',
    reply_tone: 'professional',
    key_points_addressed: [],
    replied: false,
  },
  {
    email_id: 'sample-005',
    sender: 'Prof. David Park <d.park@nyu.edu>',
    subject: 'GPU Cluster Access Request - Machine Learning Research Lab',
    date: '2026-02-23T07:20:00Z',
    summary: 'Professor Park requests dedicated GPU cluster access for the ML Research Lab. The team needs 8x A100 GPUs for a large language model training project with a grant deadline in April. He asks about available capacity and any approval process needed.',
    technical_context: 'NVIDIA A100 GPUs, CUDA, distributed training, SLURM scheduler, HPC cluster, model training infrastructure',
    tone: 'casual',
    priority_level: 'High',
    priority_rationale: 'Grant-funded research project with April deadline. GPU resource allocation requires planning and may impact other research workloads.',
    urgency_signals: ['Grant deadline in April', 'Dedicated GPU allocation needed', 'Resource contention risk'],
    action_items: [
      { task: 'Check GPU cluster availability for 8x A100 allocation', owner: 'HPC Team', type: 'technical' },
      { task: 'Initiate GPU access approval workflow', owner: 'Solutions Architect', type: 'administrative' },
      { task: 'Coordinate scheduling with other research groups', owner: 'Research Computing', type: 'planning' },
    ],
    technical_decisions: ['Dedicated vs shared GPU allocation model', 'SLURM partition configuration for ML workloads'],
    deadlines: [
      { item: 'Grant submission deadline', date: '2026-04-15' },
      { item: 'GPU access provisioning', date: '2026-03-01' },
    ],
    stakeholder_requests: ['GPU cluster access approval', 'Capacity and availability information'],
    system_references: ['HPC GPU Cluster', 'SLURM Scheduler', 'Research Computing Portal'],
    reply_draft: '',
    reply_tone: 'professional',
    key_points_addressed: [],
    replied: false,
  },
]

// ===== HELPERS =====

function deepParseJSON(value: any, depth = 0): any {
  if (depth > 5) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed)
        return deepParseJSON(parsed, depth + 1)
      } catch {
        return value
      }
    }
    return value
  }
  return value
}

function findEmailsInObject(obj: any, depth = 0): any[] | null {
  if (depth > 8 || !obj || typeof obj !== 'object') return null

  if (Array.isArray(obj.emails) && obj.emails.length > 0) {
    return obj.emails
  }

  if (Array.isArray(obj) && obj.length > 0 && (obj[0]?.subject || obj[0]?.sender)) {
    return obj
  }

  const keys = ['result', 'response', 'data', 'output', 'content', 'message', 'text']
  for (const key of keys) {
    if (obj[key] != null) {
      let val = obj[key]
      val = deepParseJSON(val)
      const found = findEmailsInObject(val, depth + 1)
      if (found) return found
    }
  }

  return null
}

function extractCountsFromObject(obj: any, depth = 0): { total?: number; critical?: number; high?: number; timestamp?: string } {
  if (depth > 8 || !obj || typeof obj !== 'object') return {}

  const counts: any = {}
  if (typeof obj.total_emails === 'number') counts.total = obj.total_emails
  if (typeof obj.critical_count === 'number') counts.critical = obj.critical_count
  if (typeof obj.high_count === 'number') counts.high = obj.high_count
  if (typeof obj.processing_timestamp === 'string') counts.timestamp = obj.processing_timestamp

  if (Object.keys(counts).length > 0) return counts

  const keys = ['result', 'response', 'data', 'output']
  for (const key of keys) {
    if (obj[key] != null) {
      let val = obj[key]
      val = deepParseJSON(val)
      if (val && typeof val === 'object') {
        const found = extractCountsFromObject(val, depth + 1)
        if (Object.keys(found).length > 0) return found
      }
    }
  }

  return {}
}

function normalizeEmail(raw: any): Email {
  if (!raw || typeof raw !== 'object') {
    return {
      email_id: `email-${Math.random().toString(36).slice(2, 10)}`,
      sender: 'Unknown',
      subject: 'No Subject',
      date: new Date().toISOString(),
      summary: '',
      technical_context: '',
      tone: '',
      priority_level: 'Medium',
      priority_rationale: '',
      urgency_signals: [],
      action_items: [],
      technical_decisions: [],
      deadlines: [],
      stakeholder_requests: [],
      system_references: [],
      reply_draft: '',
      reply_tone: '',
      key_points_addressed: [],
    }
  }
  return {
    email_id: raw.email_id || raw.id || raw.messageId || raw.message_id || `email-${Math.random().toString(36).slice(2, 10)}`,
    sender: raw.sender || raw.from || raw.senderName || raw.sender_name || 'Unknown',
    subject: raw.subject || raw.title || 'No Subject',
    date: raw.date || raw.timestamp || raw.received_at || raw.receivedAt || new Date().toISOString(),
    summary: raw.summary || raw.description || raw.snippet || '',
    technical_context: raw.technical_context || raw.technicalContext || '',
    tone: raw.tone || '',
    priority_level: raw.priority_level || raw.priorityLevel || raw.priority || 'Medium',
    priority_rationale: raw.priority_rationale || raw.priorityRationale || '',
    urgency_signals: Array.isArray(raw.urgency_signals) ? raw.urgency_signals : Array.isArray(raw.urgencySignals) ? raw.urgencySignals : [],
    action_items: Array.isArray(raw.action_items) ? raw.action_items.map((a: any) => ({
      task: a?.task || a?.description || a?.text || String(a || ''),
      owner: a?.owner || a?.assignee || 'Unassigned',
      type: a?.type || a?.category || 'task',
    })) : Array.isArray(raw.actionItems) ? raw.actionItems.map((a: any) => ({
      task: a?.task || a?.description || String(a || ''),
      owner: a?.owner || 'Unassigned',
      type: a?.type || 'task',
    })) : [],
    technical_decisions: Array.isArray(raw.technical_decisions) ? raw.technical_decisions : Array.isArray(raw.technicalDecisions) ? raw.technicalDecisions : [],
    deadlines: Array.isArray(raw.deadlines) ? raw.deadlines.map((d: any) => ({
      item: d?.item || d?.description || d?.task || String(d || ''),
      date: d?.date || d?.due || d?.deadline || '',
    })) : [],
    stakeholder_requests: Array.isArray(raw.stakeholder_requests) ? raw.stakeholder_requests : Array.isArray(raw.stakeholderRequests) ? raw.stakeholderRequests : [],
    system_references: Array.isArray(raw.system_references) ? raw.system_references : Array.isArray(raw.systemReferences) ? raw.systemReferences : [],
    reply_draft: raw.reply_draft || raw.replyDraft || raw.reply || '',
    reply_tone: raw.reply_tone || raw.replyTone || '',
    key_points_addressed: Array.isArray(raw.key_points_addressed) ? raw.key_points_addressed : Array.isArray(raw.keyPointsAddressed) ? raw.keyPointsAddressed : [],
  }
}

function parseManagerResponse(result: any): ProcessedData | null {
  console.log('[EmailHub] Raw callAIAgent result:', JSON.stringify(result).slice(0, 500))

  if (!result) return null

  if (result.success === false) {
    console.log('[EmailHub] Agent returned error:', result.error || result.response?.message)
    return null
  }

  // Build list of candidate objects to search for emails
  const candidates: any[] = []

  if (result.response?.result != null) {
    candidates.push(deepParseJSON(result.response.result))
  }
  if (result.response != null) {
    candidates.push(deepParseJSON(result.response))
  }
  if (result.raw_response) {
    candidates.push(deepParseJSON(result.raw_response))
  }
  candidates.push(result)

  console.log('[EmailHub] Searching', candidates.length, 'candidates for emails array')

  for (const candidate of candidates) {
    const emails = findEmailsInObject(candidate)
    if (emails && emails.length > 0) {
      console.log('[EmailHub] Found', emails.length, 'emails in candidate')
      const normalizedEmails = emails.map(normalizeEmail)
      const counts = extractCountsFromObject(candidate)

      return {
        emails: normalizedEmails,
        total_emails: counts.total || normalizedEmails.length,
        critical_count: counts.critical ?? normalizedEmails.filter(e => e.priority_level === 'Critical').length,
        high_count: counts.high ?? normalizedEmails.filter(e => e.priority_level === 'High').length,
        processing_timestamp: counts.timestamp || new Date().toISOString(),
      }
    }
  }

  console.log('[EmailHub] No emails found in any candidate. Full result:', JSON.stringify(result).slice(0, 1000))
  return null
}

function getPriorityColor(level: string): string {
  switch (level) {
    case 'Critical':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'High':
      return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'Medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'Low':
      return 'bg-green-100 text-green-700 border-green-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

function getPriorityDot(level: string): string {
  switch (level) {
    case 'Critical':
      return 'bg-red-500'
    case 'High':
      return 'bg-orange-500'
    case 'Medium':
      return 'bg-yellow-500'
    case 'Low':
      return 'bg-green-500'
    default:
      return 'bg-gray-400'
  }
}

function formatTimestamp(ts: string): string {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ts
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return ts
  }
}

function truncateText(text: string, max: number): string {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '...' : text
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

// ===== ERROR BOUNDARY =====

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ===== SUB-COMPONENTS =====

function EmailSkeletonCards() {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  )
}

function DetailSkeletonPanel() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-32 mb-4" />
      </div>
      <div className="glass-card rounded-xl p-5">
        <Skeleton className="h-4 w-20 mb-3" />
        <Skeleton className="h-3 w-full mb-2" />
        <Skeleton className="h-3 w-full mb-2" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <div>
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-48 rounded-full" />
          <Skeleton className="h-8 w-40 rounded-full" />
          <Skeleton className="h-8 w-56 rounded-full" />
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4 text-muted-foreground">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2 tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{description}</p>
    </div>
  )
}

function PriorityBadge({ level }: { level: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(level)}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${getPriorityDot(level)}`} />
      {level || 'Unknown'}
    </span>
  )
}

function StatBadge({
  label,
  value,
  variant,
}: {
  label: string
  value: number
  variant: 'default' | 'critical' | 'high' | 'total'
}) {
  const styles: Record<string, string> = {
    default: 'bg-muted text-foreground',
    critical: 'bg-red-50 text-red-700 border border-red-200',
    high: 'bg-orange-50 text-orange-700 border border-orange-200',
    total: 'bg-primary/5 text-foreground border border-border',
  }
  return (
    <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${styles[variant] ?? styles.default}`}>
      <span className="text-lg font-bold tracking-tight">{value}</span>
      <span className="opacity-70">{label}</span>
    </div>
  )
}

function ChipItem({
  icon,
  text,
  subtext,
}: {
  icon: React.ReactNode
  text: string
  subtext?: string
}) {
  return (
    <div className="inline-flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/60 border border-border/50 text-sm">
      <span className="mt-0.5 flex-shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <span className="text-foreground leading-snug">{text}</span>
        {subtext && (
          <span className="block text-xs text-muted-foreground mt-0.5">{subtext}</span>
        )}
      </div>
    </div>
  )
}

function AgentStatusPanel({ activeAgentId }: { activeAgentId: string | null }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <HiOutlineSignal className="w-3.5 h-3.5" />
          Agent Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="space-y-1.5">
          {AGENTS.map((agent) => (
            <div
              key={agent.id}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${activeAgentId === agent.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeAgentId === agent.id ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30'}`} />
              <span className="font-medium truncate">{agent.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ===== MAIN PAGE =====

export default function Page() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'alerts' | 'settings'>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [totalEmails, setTotalEmails] = useState(0)
  const [criticalCount, setCriticalCount] = useState(0)
  const [highCount, setHighCount] = useState(0)
  const [lastProcessed, setLastProcessed] = useState<string | null>(null)

  const [isProcessing, setIsProcessing] = useState(false)
  const [processError, setProcessError] = useState<string | null>(null)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  const [replyDraft, setReplyDraft] = useState('')
  const [isGeneratingReply, setIsGeneratingReply] = useState(false)
  const [isSendingReply, setIsSendingReply] = useState(false)
  const [replyStatus, setReplyStatus] = useState<string | null>(null)
  const [showReplySection, setShowReplySection] = useState(false)

  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [showSampleData, setShowSampleData] = useState(false)

  const [settings, setSettings] = useState<Settings>({
    maxEmails: 10,
    vipSenders: '',
    priorityKeywords: '',
    defaultQuery: '',
  })
  const [settingsSaved, setSettingsSaved] = useState(false)

  const [detailTab, setDetailTab] = useState<string>('summary')

  // Load settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nyu-email-hub-settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        setSettings((prev) => ({ ...prev, ...parsed }))
      }
    } catch {}
  }, [])

  // Handle sample data toggle
  useEffect(() => {
    if (showSampleData) {
      setEmails(SAMPLE_EMAILS)
      setTotalEmails(SAMPLE_EMAILS.length)
      setCriticalCount(SAMPLE_EMAILS.filter((e) => e.priority_level === 'Critical').length)
      setHighCount(SAMPLE_EMAILS.filter((e) => e.priority_level === 'High').length)
      setLastProcessed(new Date().toISOString())
      setSelectedEmail(null)
    } else {
      setEmails([])
      setTotalEmails(0)
      setCriticalCount(0)
      setHighCount(0)
      setLastProcessed(null)
      setSelectedEmail(null)
    }
    setReplyDraft('')
    setReplyStatus(null)
    setShowReplySection(false)
    setProcessError(null)
  }, [showSampleData])

  // Filter emails
  const filteredEmails = emails.filter((email) => {
    const matchesPriority = priorityFilter === 'all' || email?.priority_level === priorityFilter
    const query = searchQuery.toLowerCase()
    const matchesSearch =
      !query ||
      (email?.sender ?? '').toLowerCase().includes(query) ||
      (email?.subject ?? '').toLowerCase().includes(query)
    return matchesPriority && matchesSearch
  })

  const urgentEmails = emails.filter(
    (e) => e?.priority_level === 'Critical' || e?.priority_level === 'High'
  )

  // Process emails
  const processEmails = useCallback(async () => {
    setIsProcessing(true)
    setProcessError(null)
    setSelectedEmail(null)
    setReplyDraft('')
    setReplyStatus(null)
    setShowReplySection(false)
    setActiveAgentId(MANAGER_AGENT_ID)
    setShowSampleData(false)

    try {
      const query = settings.defaultQuery || 'Fetch and process my recent emails'
      const message = `${query}. Summarize each email, extract key points and action items, and classify priority. Max emails: ${settings.maxEmails}. Return the results as a JSON object with an "emails" array where each email has: email_id, sender, subject, date, summary, technical_context, tone, priority_level (Critical/High/Medium/Low), priority_rationale, urgency_signals, action_items (array of {task, owner, type}), technical_decisions, deadlines (array of {item, date}), stakeholder_requests, system_references, reply_draft, reply_tone, key_points_addressed. Also include total_emails, critical_count, high_count, and processing_timestamp at the top level.${settings.vipSenders ? ` VIP senders to prioritize: ${settings.vipSenders}.` : ''}${settings.priorityKeywords ? ` Priority keywords: ${settings.priorityKeywords}.` : ''}`

      console.log('[EmailHub] Sending process request to agent:', MANAGER_AGENT_ID)
      const result = await callAIAgent(message, MANAGER_AGENT_ID)
      console.log('[EmailHub] Got response, success:', result?.success)

      const parsed = parseManagerResponse(result)
      if (parsed && parsed.emails.length > 0) {
        const sorted = [...parsed.emails].sort(
          (a, b) => (PRIORITY_ORDER[a?.priority_level] ?? 4) - (PRIORITY_ORDER[b?.priority_level] ?? 4)
        )
        setEmails(sorted)
        setTotalEmails(parsed.total_emails)
        setCriticalCount(parsed.critical_count)
        setHighCount(parsed.high_count)
        setLastProcessed(parsed.processing_timestamp)
      } else {
        // Extract the most useful error message
        const errorMsg = result?.error
          || result?.response?.message
          || (result?.response?.result?.text)
          || (typeof result?.response?.result === 'string' ? result.response.result : null)
          || 'No emails were returned. The agent may not have found any recent emails, or the response format was unexpected. Check the console for details.'
        setProcessError(errorMsg)
      }
    } catch (err) {
      console.error('[EmailHub] Process emails error:', err)
      setProcessError(err instanceof Error ? err.message : 'An unexpected error occurred while processing emails.')
    } finally {
      setIsProcessing(false)
      setActiveAgentId(null)
    }
  }, [settings])

  // Generate reply
  const generateReply = useCallback(
    async (email: Email) => {
      setIsGeneratingReply(true)
      setReplyDraft('')
      setReplyStatus(null)
      setShowReplySection(true)
      setActiveAgentId(MANAGER_AGENT_ID)

      try {
        const actionTasks = Array.isArray(email?.action_items)
          ? email.action_items.map((a) => a?.task ?? '').join(', ')
          : 'None'

        const message = `Generate a professional reply for this email:
From: ${email?.sender ?? 'Unknown'}
Subject: ${email?.subject ?? 'No Subject'}
Summary: ${email?.summary ?? ''}
Key Points: ${actionTasks}
Technical Context: ${email?.technical_context ?? ''}
Priority: ${email?.priority_level ?? 'Medium'}`

        const result = await callAIAgent(message, MANAGER_AGENT_ID)
        console.log('[EmailHub] Reply result:', JSON.stringify(result).slice(0, 500))

        if (result?.success) {
          // Deep search for reply_draft in the nested response
          const findReplyDraft = (obj: any, depth = 0): string => {
            if (depth > 6 || !obj) return ''
            if (typeof obj === 'string') {
              const parsed = deepParseJSON(obj)
              if (parsed && typeof parsed === 'object') return findReplyDraft(parsed, depth + 1)
              return obj
            }
            if (typeof obj !== 'object') return ''
            if (obj.reply_draft && typeof obj.reply_draft === 'string') return obj.reply_draft
            if (obj.replyDraft && typeof obj.replyDraft === 'string') return obj.replyDraft
            if (obj.reply && typeof obj.reply === 'string') return obj.reply
            if (obj.draft && typeof obj.draft === 'string') return obj.draft
            if (Array.isArray(obj.emails) && obj.emails[0]?.reply_draft) return obj.emails[0].reply_draft
            const keys = ['result', 'response', 'data', 'output']
            for (const key of keys) {
              if (obj[key] != null) {
                const found = findReplyDraft(deepParseJSON(obj[key]), depth + 1)
                if (found) return found
              }
            }
            return ''
          }

          const draft = findReplyDraft(result.response) || findReplyDraft(result) || result?.response?.message || ''
          setReplyDraft(draft)
          if (!draft) {
            setReplyStatus('Reply generated but no draft text was returned. Please try again.')
          }
        } else {
          setReplyStatus(result?.error || 'Failed to generate reply. Please try again.')
        }
      } catch (err) {
        console.error('[EmailHub] Reply generation error:', err)
        setReplyStatus('Failed to generate reply. Please try again.')
      } finally {
        setIsGeneratingReply(false)
        setActiveAgentId(null)
      }
    },
    []
  )

  // Send reply
  const sendReply = useCallback(
    async (email: Email) => {
      if (!replyDraft.trim()) {
        setReplyStatus('Reply cannot be empty.')
        return
      }
      setIsSendingReply(true)
      setReplyStatus(null)
      setActiveAgentId(MANAGER_AGENT_ID)

      try {
        const message = `Send this reply to the email thread:
To: ${email?.sender ?? ''}
Subject: Re: ${email?.subject ?? ''}
Reply body: ${replyDraft}
Use GMAIL_REPLY_TO_THREAD to send this reply.`

        const result = await callAIAgent(message, MANAGER_AGENT_ID)

        if (result?.success) {
          setReplyStatus('Reply sent successfully!')
          setEmails((prev) =>
            prev.map((e) =>
              e.email_id === email.email_id ? { ...e, replied: true } : e
            )
          )
          if (selectedEmail?.email_id === email.email_id) {
            setSelectedEmail((prev) => (prev ? { ...prev, replied: true } : prev))
          }
          setReplyDraft('')
          setShowReplySection(false)
        } else {
          setReplyStatus('Failed to send reply. Please try again.')
        }
      } catch {
        setReplyStatus('Failed to send reply. Please try again.')
      } finally {
        setIsSendingReply(false)
        setActiveAgentId(null)
      }
    },
    [replyDraft, selectedEmail]
  )

  // Save settings
  const saveSettings = useCallback(() => {
    try {
      localStorage.setItem('nyu-email-hub-settings', JSON.stringify(settings))
      setSettingsSaved(true)
      const timer = setTimeout(() => setSettingsSaved(false), 2000)
      return () => clearTimeout(timer)
    } catch {}
  }, [settings])

  // Select email handler
  const handleSelectEmail = useCallback((email: Email) => {
    setSelectedEmail(email)
    setReplyDraft(email?.reply_draft ?? '')
    setReplyStatus(null)
    setShowReplySection(false)
    setDetailTab('summary')
  }, [])

  return (
    <ErrorBoundary>
      <div className="min-h-screen gradient-bg font-sans tracking-tight">
        <div className="flex h-screen overflow-hidden">
          {/* ===== LEFT SIDEBAR ===== */}
          <aside className={`flex-shrink-0 border-r border-border transition-all duration-300 ${sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'}`} style={{ backgroundColor: 'hsl(210 40% 97%)' }}>
            <div className="flex flex-col h-full w-56">
              {/* Logo */}
              <div className="px-5 py-5 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                    <HiOutlineEnvelope className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-sm font-bold text-foreground tracking-tight leading-none">NYU Email Hub</h1>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Solutions Architect</p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-3 py-4 space-y-1">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                >
                  <HiOutlineInbox className="w-[18px] h-[18px] flex-shrink-0" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'alerts' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                >
                  <HiOutlineBell className="w-[18px] h-[18px] flex-shrink-0" />
                  Priority Alerts
                  {urgentEmails.length > 0 && (
                    <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'alerts' ? 'bg-white/20 text-primary-foreground' : 'bg-red-100 text-red-700'}`}>
                      {urgentEmails.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                >
                  <HiOutlineCog6Tooth className="w-[18px] h-[18px] flex-shrink-0" />
                  Settings
                </button>
              </nav>

              {/* Agent Status */}
              <div className="px-3 pb-4">
                <AgentStatusPanel activeAgentId={activeAgentId} />
              </div>
            </div>
          </aside>

          {/* ===== MAIN AREA ===== */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* ===== HEADER ===== */}
            <header className="flex-shrink-0 border-b border-border bg-background/80 backdrop-blur-sm">
              <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                    aria-label="Toggle sidebar"
                  >
                    {sidebarOpen ? (
                      <HiOutlineChevronLeft className="w-4 h-4" />
                    ) : (
                      <HiOutlineBars3 className="w-5 h-5" />
                    )}
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-foreground tracking-tight leading-tight">Email Intelligence Hub</h2>
                    {lastProcessed && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Last processed: {formatTimestamp(lastProcessed)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer select-none">
                      Sample Data
                    </Label>
                    <Switch
                      id="sample-toggle"
                      checked={showSampleData}
                      onCheckedChange={setShowSampleData}
                      disabled={isProcessing}
                    />
                  </div>

                  <Separator orientation="vertical" className="h-6" />

                  {emails.length > 0 && (
                    <div className="hidden md:flex items-center gap-2">
                      <StatBadge label="Total" value={totalEmails} variant="total" />
                      <StatBadge label="Critical" value={criticalCount} variant="critical" />
                      <StatBadge label="High" value={highCount} variant="high" />
                    </div>
                  )}

                  <Button
                    onClick={processEmails}
                    disabled={isProcessing}
                    className="gap-2 font-medium shadow-sm"
                    size="sm"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <HiOutlineArrowPath className="w-3.5 h-3.5" />
                    )}
                    {isProcessing ? 'Processing...' : 'Process Emails'}
                  </Button>
                </div>
              </div>
            </header>

            {/* ===== CONTENT AREA ===== */}
            <div className="flex-1 overflow-hidden">
              {/* ===== DASHBOARD TAB ===== */}
              {activeTab === 'dashboard' && (
                <div className="flex h-full">
                  {/* Left Column - Email List */}
                  <div className="w-[40%] flex-shrink-0 border-r border-border flex flex-col bg-background/50">
                    {/* Filter Bar */}
                    <div className="flex-shrink-0 px-4 py-3 border-b border-border space-y-2">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Search sender or subject..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-8 text-sm bg-background"
                          />
                        </div>
                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                          <SelectTrigger className="w-[120px] h-8 text-sm bg-background">
                            <SelectValue placeholder="Priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="Critical">Critical</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Email Cards */}
                    <ScrollArea className="flex-1">
                      {isProcessing ? (
                        <EmailSkeletonCards />
                      ) : processError ? (
                        <div className="p-4">
                          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700">
                            <div className="flex items-start gap-2">
                              <HiOutlineExclamationTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium">Processing Error</p>
                                <p className="text-xs mt-1 opacity-80">{processError}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : filteredEmails.length > 0 ? (
                        <div className="p-3 space-y-2">
                          {filteredEmails.map((email) => (
                            <button
                              key={email?.email_id ?? Math.random().toString()}
                              onClick={() => handleSelectEmail(email)}
                              className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 hover:shadow-md ${selectedEmail?.email_id === email?.email_id ? 'ring-2 ring-primary border-primary/30 bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-border/80'}`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <PriorityBadge level={email?.priority_level ?? ''} />
                                <span className="text-[10px] text-muted-foreground">
                                  {formatTimestamp(email?.date ?? '')}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {email?.sender ?? 'Unknown Sender'}
                                </p>
                                {email?.replied && (
                                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 flex-shrink-0">
                                    Replied
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-foreground/80 font-medium truncate mb-1">
                                {email?.subject ?? 'No Subject'}
                              </p>
                              <p className="text-xs text-muted-foreground leading-relaxed" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {truncateText(email?.summary ?? '', 120)}
                              </p>
                            </button>
                          ))}
                        </div>
                      ) : emails.length > 0 ? (
                        <EmptyState
                          icon={<HiOutlineFunnel className="w-7 h-7" />}
                          title="No emails match your filters"
                          description="Try adjusting your search query or priority filter to see more results."
                        />
                      ) : (
                        <EmptyState
                          icon={<HiOutlineInboxStack className="w-7 h-7" />}
                          title="No emails yet"
                          description="Click 'Process Emails' to fetch and analyze your recent emails, or toggle 'Sample Data' to explore the interface."
                        />
                      )}
                    </ScrollArea>
                  </div>

                  {/* Right Column - Detail Panel */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    {isProcessing && !selectedEmail ? (
                      <DetailSkeletonPanel />
                    ) : selectedEmail ? (
                      <ScrollArea className="h-full">
                        <div className="p-6 space-y-5">
                          {/* Email Header */}
                          <div>
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="min-w-0">
                                <h3 className="text-lg font-bold text-foreground tracking-tight leading-snug">
                                  {selectedEmail?.subject ?? 'No Subject'}
                                </h3>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <p className="text-sm text-muted-foreground">
                                    {selectedEmail?.sender ?? 'Unknown'}
                                  </p>
                                  <span className="text-xs text-muted-foreground/50">|</span>
                                  <p className="text-xs text-muted-foreground">
                                    {formatTimestamp(selectedEmail?.date ?? '')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <PriorityBadge level={selectedEmail?.priority_level ?? ''} />
                                {selectedEmail?.replied && (
                                  <Badge variant="secondary" className="text-xs">
                                    <HiOutlineCheckCircle className="w-3 h-3 mr-1" />
                                    Replied
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {selectedEmail?.tone && (
                              <Badge variant="outline" className="text-[10px] capitalize">
                                Tone: {selectedEmail.tone}
                              </Badge>
                            )}
                          </div>

                          {/* Detail Tabs */}
                          <Tabs value={detailTab} onValueChange={setDetailTab}>
                            <TabsList className="w-full justify-start bg-muted/50 p-1 h-auto">
                              <TabsTrigger value="summary" className="text-xs px-3 py-1.5 data-[state=active]:shadow-sm">Summary</TabsTrigger>
                              <TabsTrigger value="keypoints" className="text-xs px-3 py-1.5 data-[state=active]:shadow-sm">Key Points</TabsTrigger>
                              <TabsTrigger value="priority" className="text-xs px-3 py-1.5 data-[state=active]:shadow-sm">Priority</TabsTrigger>
                              <TabsTrigger value="reply" className="text-xs px-3 py-1.5 data-[state=active]:shadow-sm">Reply</TabsTrigger>
                            </TabsList>

                            {/* Summary Tab */}
                            <TabsContent value="summary" className="mt-4 space-y-4">
                              <div className="glass-card rounded-xl p-5">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                  <HiOutlineDocumentText className="w-3.5 h-3.5" />
                                  Summary
                                </h4>
                                <div className="text-sm text-foreground leading-relaxed">
                                  {renderMarkdown(selectedEmail?.summary ?? '')}
                                </div>
                              </div>

                              {selectedEmail?.technical_context && (
                                <div className="glass-card rounded-xl p-5">
                                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <HiOutlineCpuChip className="w-3.5 h-3.5" />
                                    Technical Context
                                  </h4>
                                  <div className="text-sm text-foreground leading-relaxed">
                                    {renderMarkdown(selectedEmail.technical_context)}
                                  </div>
                                </div>
                              )}
                            </TabsContent>

                            {/* Key Points Tab */}
                            <TabsContent value="keypoints" className="mt-4 space-y-5">
                              {Array.isArray(selectedEmail?.action_items) && selectedEmail.action_items.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <HiOutlineCheckCircle className="w-3.5 h-3.5" />
                                    Action Items ({selectedEmail.action_items.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {selectedEmail.action_items.map((item, idx) => (
                                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/40">
                                        <HiOutlineCheckCircle className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm text-foreground font-medium">{item?.task ?? ''}</p>
                                          <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                              {item?.owner ?? 'Unassigned'}
                                            </Badge>
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                                              {item?.type ?? 'task'}
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {Array.isArray(selectedEmail?.technical_decisions) && selectedEmail.technical_decisions.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <HiOutlineCpuChip className="w-3.5 h-3.5" />
                                    Technical Decisions
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedEmail.technical_decisions.map((decision, idx) => (
                                      <ChipItem
                                        key={idx}
                                        icon={<HiOutlineCpuChip className="w-3.5 h-3.5" />}
                                        text={decision ?? ''}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {Array.isArray(selectedEmail?.deadlines) && selectedEmail.deadlines.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <HiOutlineClock className="w-3.5 h-3.5" />
                                    Deadlines
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedEmail.deadlines.map((deadline, idx) => (
                                      <ChipItem
                                        key={idx}
                                        icon={<HiOutlineClock className="w-3.5 h-3.5" />}
                                        text={deadline?.item ?? ''}
                                        subtext={deadline?.date ?? ''}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {Array.isArray(selectedEmail?.stakeholder_requests) && selectedEmail.stakeholder_requests.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <HiOutlineUser className="w-3.5 h-3.5" />
                                    Stakeholder Requests
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedEmail.stakeholder_requests.map((req, idx) => (
                                      <ChipItem
                                        key={idx}
                                        icon={<HiOutlineUser className="w-3.5 h-3.5" />}
                                        text={req ?? ''}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {Array.isArray(selectedEmail?.system_references) && selectedEmail.system_references.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <HiOutlineServer className="w-3.5 h-3.5" />
                                    System References
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedEmail.system_references.map((ref, idx) => (
                                      <ChipItem
                                        key={idx}
                                        icon={<HiOutlineServer className="w-3.5 h-3.5" />}
                                        text={ref ?? ''}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {Array.isArray(selectedEmail?.key_points_addressed) && selectedEmail.key_points_addressed.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <HiOutlineCheckBadge className="w-3.5 h-3.5" />
                                    Key Points Addressed
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedEmail.key_points_addressed.map((point, idx) => (
                                      <ChipItem
                                        key={idx}
                                        icon={<HiOutlineCheckBadge className="w-3.5 h-3.5" />}
                                        text={point ?? ''}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {(!Array.isArray(selectedEmail?.action_items) || selectedEmail.action_items.length === 0) &&
                                (!Array.isArray(selectedEmail?.technical_decisions) || selectedEmail.technical_decisions.length === 0) &&
                                (!Array.isArray(selectedEmail?.deadlines) || selectedEmail.deadlines.length === 0) &&
                                (!Array.isArray(selectedEmail?.stakeholder_requests) || selectedEmail.stakeholder_requests.length === 0) &&
                                (!Array.isArray(selectedEmail?.system_references) || selectedEmail.system_references.length === 0) && (
                                  <EmptyState
                                    icon={<HiOutlineDocumentText className="w-7 h-7" />}
                                    title="No key points extracted"
                                    description="This email did not contain identifiable action items, decisions, or deadlines."
                                  />
                                )}
                            </TabsContent>

                            {/* Priority Tab */}
                            <TabsContent value="priority" className="mt-4 space-y-4">
                              <div className="glass-card rounded-xl p-5">
                                <div className="flex items-center gap-3 mb-4">
                                  <PriorityBadge level={selectedEmail?.priority_level ?? ''} />
                                  <span className="text-sm font-medium text-foreground">Priority Classification</span>
                                </div>

                                {selectedEmail?.priority_rationale && (
                                  <div className="mb-4">
                                    <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Rationale</h5>
                                    <div className="text-sm text-foreground leading-relaxed">
                                      {renderMarkdown(selectedEmail.priority_rationale)}
                                    </div>
                                  </div>
                                )}

                                {Array.isArray(selectedEmail?.urgency_signals) && selectedEmail.urgency_signals.length > 0 && (
                                  <div>
                                    <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Urgency Signals</h5>
                                    <div className="space-y-1.5">
                                      {selectedEmail.urgency_signals.map((signal, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                          <HiOutlineExclamationTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                          <span className="text-foreground">{signal ?? ''}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TabsContent>

                            {/* Reply Tab */}
                            <TabsContent value="reply" className="mt-4 space-y-4">
                              {!showReplySection && !replyDraft && (
                                <div className="text-center py-8">
                                  <Button
                                    onClick={() => generateReply(selectedEmail)}
                                    disabled={isGeneratingReply}
                                    variant="outline"
                                    className="gap-2"
                                  >
                                    {isGeneratingReply ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <HiOutlinePencilSquare className="w-4 h-4" />
                                    )}
                                    {isGeneratingReply ? 'Generating...' : 'Generate Reply Suggestion'}
                                  </Button>
                                  <p className="text-xs text-muted-foreground mt-3 max-w-xs mx-auto leading-relaxed">
                                    The AI will draft a professional reply based on the email context and action items.
                                  </p>
                                </div>
                              )}

                              {isGeneratingReply && (
                                <div className="flex items-center justify-center py-8 gap-3">
                                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                  <span className="text-sm text-muted-foreground">Generating reply draft...</span>
                                </div>
                              )}

                              {(showReplySection || replyDraft) && !isGeneratingReply && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                      <HiOutlinePencilSquare className="w-3.5 h-3.5" />
                                      Reply Draft
                                    </h4>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setShowReplySection(false)
                                        setReplyDraft('')
                                        setReplyStatus(null)
                                      }}
                                      className="h-7 px-2 text-xs text-muted-foreground"
                                    >
                                      <HiOutlineXMark className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                  <Textarea
                                    value={replyDraft}
                                    onChange={(e) => setReplyDraft(e.target.value)}
                                    rows={10}
                                    className="text-sm leading-relaxed resize-y bg-background"
                                    placeholder="Reply draft will appear here..."
                                  />
                                  <div className="flex items-center gap-2">
                                    <Button
                                      onClick={() => sendReply(selectedEmail)}
                                      disabled={isSendingReply || !replyDraft.trim()}
                                      className="gap-2"
                                      size="sm"
                                    >
                                      {isSendingReply ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <HiOutlinePaperAirplane className="w-3.5 h-3.5" />
                                      )}
                                      {isSendingReply ? 'Sending...' : 'Send Reply'}
                                    </Button>
                                    <Button
                                      onClick={() => generateReply(selectedEmail)}
                                      disabled={isGeneratingReply}
                                      variant="outline"
                                      size="sm"
                                      className="gap-2"
                                    >
                                      <HiOutlineArrowPath className="w-3.5 h-3.5" />
                                      Regenerate
                                    </Button>
                                  </div>

                                  {replyStatus && (
                                    <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${replyStatus.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                      {replyStatus.includes('success') ? (
                                        <HiOutlineCheckCircle className="w-4 h-4 flex-shrink-0" />
                                      ) : (
                                        <HiOutlineExclamationTriangle className="w-4 h-4 flex-shrink-0" />
                                      )}
                                      {replyStatus}
                                    </div>
                                  )}
                                </div>
                              )}
                            </TabsContent>
                          </Tabs>
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <EmptyState
                          icon={<HiOutlineEnvelope className="w-7 h-7" />}
                          title="Select an email to view details"
                          description="Choose an email from the list to see its summary, key points, priority analysis, and reply options."
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ===== ALERTS TAB ===== */}
              {activeTab === 'alerts' && (
                <ScrollArea className="h-full">
                  <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-foreground tracking-tight">Priority Alerts</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Critical and High priority emails requiring attention
                        </p>
                      </div>
                      {urgentEmails.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {urgentEmails.length} urgent
                        </Badge>
                      )}
                    </div>

                    <Separator />

                    {isProcessing ? (
                      <div className="space-y-4">
                        {[1, 2].map((i) => (
                          <Card key={i} className="border-border">
                            <CardContent className="p-5">
                              <div className="flex items-center gap-3 mb-3">
                                <Skeleton className="h-5 w-20 rounded-full" />
                                <Skeleton className="h-4 w-32" />
                              </div>
                              <Skeleton className="h-5 w-3/4 mb-3" />
                              <Skeleton className="h-3 w-full mb-2" />
                              <Skeleton className="h-3 w-full mb-2" />
                              <Skeleton className="h-3 w-2/3" />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : urgentEmails.length > 0 ? (
                      <div className="space-y-4">
                        {urgentEmails.map((email) => (
                          <Card key={email?.email_id ?? ''} className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-5">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <PriorityBadge level={email?.priority_level ?? ''} />
                                  <span className="text-xs text-muted-foreground">
                                    {formatTimestamp(email?.date ?? '')}
                                  </span>
                                </div>
                                {email?.replied && (
                                  <Badge variant="secondary" className="text-xs">
                                    <HiOutlineCheckCircle className="w-3 h-3 mr-1" />
                                    Replied
                                  </Badge>
                                )}
                              </div>

                              <p className="text-sm text-muted-foreground mb-1">
                                {email?.sender ?? 'Unknown'}
                              </p>
                              <h4 className="text-base font-semibold text-foreground mb-3 tracking-tight">
                                {email?.subject ?? 'No Subject'}
                              </h4>

                              <div className="text-sm text-foreground/80 leading-relaxed mb-4">
                                {renderMarkdown(email?.summary ?? '')}
                              </div>

                              {Array.isArray(email?.action_items) && email.action_items.length > 0 && (
                                <div className="mb-4">
                                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                    Action Items
                                  </h5>
                                  <div className="space-y-1.5">
                                    {email.action_items.map((item, idx) => (
                                      <div key={idx} className="flex items-start gap-2 text-sm">
                                        <HiOutlineCheckCircle className="w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0" />
                                        <span className="flex-1">{item?.task ?? ''}</span>
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 flex-shrink-0">
                                          {item?.owner ?? ''}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {email?.priority_rationale && (
                                <div className="p-3 rounded-lg bg-muted/50 border border-border/40 mb-4">
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                                    Priority Rationale
                                  </p>
                                  <p className="text-sm text-foreground/80 leading-relaxed">
                                    {email.priority_rationale}
                                  </p>
                                </div>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                onClick={() => {
                                  setActiveTab('dashboard')
                                  handleSelectEmail(email)
                                  setDetailTab('reply')
                                }}
                              >
                                <HiOutlinePencilSquare className="w-3.5 h-3.5" />
                                Suggest Reply
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={<HiOutlineCheckBadge className="w-7 h-7" />}
                        title="No urgent emails"
                        description="You're all caught up! No Critical or High priority emails were found in your recent messages."
                      />
                    )}
                  </div>
                </ScrollArea>
              )}

              {/* ===== SETTINGS TAB ===== */}
              {activeTab === 'settings' && (
                <ScrollArea className="h-full">
                  <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-foreground tracking-tight">Settings</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Configure email processing preferences
                      </p>
                    </div>

                    <Separator />

                    {/* Gmail Connection */}
                    <Card className="border-border/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <HiOutlineShieldCheck className="w-4 h-4 text-green-600" />
                          Gmail Connection
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Authentication is managed by the AI agent pipeline
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-sm font-medium text-green-700">Connected</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            OAuth handled automatically via agent integration
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Priority Rules */}
                    <Card className="border-border/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <HiOutlineExclamationTriangle className="w-4 h-4" />
                          Priority Rules
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Customize how the AI classifies email priority
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="vip-senders" className="text-xs font-medium">
                            VIP Senders
                          </Label>
                          <Input
                            id="vip-senders"
                            placeholder="e.g., dean@nyu.edu, provost@nyu.edu"
                            value={settings.vipSenders}
                            onChange={(e) =>
                              setSettings((prev) => ({ ...prev, vipSenders: e.target.value }))
                            }
                            className="mt-1.5 text-sm"
                          />
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Comma-separated email addresses to always flag as high priority
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="priority-keywords" className="text-xs font-medium">
                            Priority Keywords
                          </Label>
                          <Input
                            id="priority-keywords"
                            placeholder="e.g., deadline, urgent, outage, security"
                            value={settings.priorityKeywords}
                            onChange={(e) =>
                              setSettings((prev) => ({ ...prev, priorityKeywords: e.target.value }))
                            }
                            className="mt-1.5 text-sm"
                          />
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Comma-separated keywords that should boost priority classification
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Processing Preferences */}
                    <Card className="border-border/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <HiOutlineCog6Tooth className="w-4 h-4" />
                          Processing Preferences
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Control how emails are fetched and processed
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="max-emails" className="text-xs font-medium">
                            Max Emails to Process
                          </Label>
                          <Input
                            id="max-emails"
                            type="number"
                            min={1}
                            max={50}
                            value={settings.maxEmails}
                            onChange={(e) =>
                              setSettings((prev) => ({ ...prev, maxEmails: parseInt(e.target.value) || 10 }))
                            }
                            className="mt-1.5 text-sm w-32"
                          />
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Number of recent emails to fetch and analyze (1-50)
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="default-query" className="text-xs font-medium">
                            Default Query
                          </Label>
                          <Input
                            id="default-query"
                            placeholder="e.g., Fetch emails from this week about infrastructure"
                            value={settings.defaultQuery}
                            onChange={(e) =>
                              setSettings((prev) => ({ ...prev, defaultQuery: e.target.value }))
                            }
                            className="mt-1.5 text-sm"
                          />
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Custom instruction sent to the agent when processing emails
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Save */}
                    <div className="flex items-center gap-3">
                      <Button onClick={saveSettings} className="gap-2" size="sm">
                        <HiOutlineCheckCircle className="w-3.5 h-3.5" />
                        Save Settings
                      </Button>
                      {settingsSaved && (
                        <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                          <HiOutlineCheckCircle className="w-4 h-4" />
                          Settings saved!
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4 rounded-xl bg-muted/50 border border-border/40">
                      <div className="flex items-start gap-3">
                        <HiOutlineInformationCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground mb-1">How it works</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            The Email Intelligence Hub uses a pipeline of five specialized AI agents: the Email Orchestrator Manager coordinates Gmail fetching and delegates to the Email Summarization Agent, Key Points Extractor Agent, Priority Classifier Agent, and Reply Suggestion Agent. All results are aggregated into a unified view for efficient email triage.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
