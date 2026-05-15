import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, XCircle, ChevronUp, ChevronDown, Flag, Loader2 } from 'lucide-react'
import { n8n } from '@/services/n8nWebhooks'

interface HumanReviewSectionProps {
  claimId: string
}

export function HumanReviewSection({ claimId }: HumanReviewSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState('')
  const [action, setAction] = useState<'approve' | 'reject' | 'escalate' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const handleSubmit = async () => {
    if (!action) return
    setSubmitting(true)
    setResult(null)

    const payload = { notes, reviewer: 'James Wilson', claimId }

    let res
    if (action === 'approve') res = await n8n.claimApproved(claimId, payload)
    else if (action === 'reject') res = await n8n.claimRejected(claimId, payload)
    else res = await n8n.fraudEscalated(claimId, payload)

    setResult({
      ok: res.ok,
      message: res.ok
        ? `Event sent to n8n successfully`
        : `Failed to send to n8n — ${res.error || `HTTP ${res.status}`}`,
    })
    setSubmitting(false)
  }

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Human Review
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={action === 'approve' ? 'default' : 'outline'}
              size="sm"
              className={`gap-1.5 ${action === 'approve' ? '' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950'}`}
              onClick={() => setAction('approve')}
            >
              <CheckCircle2 className="h-4 w-4" /> Approve Audit
            </Button>
            <Button
              variant={action === 'reject' ? 'destructive' : 'outline'}
              size="sm"
              className={`gap-1.5 ${action === 'reject' ? '' : 'text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950'}`}
              onClick={() => setAction('reject')}
            >
              <XCircle className="h-4 w-4" /> Reject Audit
            </Button>
            <Button
              variant={action === 'escalate' ? 'destructive' : 'outline'}
              size="sm"
              className={`gap-1.5 ${action === 'escalate' ? '' : 'text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950'}`}
              onClick={() => setAction('escalate')}
            >
              <Flag className="h-4 w-4" /> Escalate Fraud
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reviewer Notes</label>
            <Textarea
              placeholder="Add your review notes, observations, and recommendations..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {action && (
            <div className={`p-3 rounded-lg border ${
              action === 'approve' ? 'bg-emerald-500/5 border-emerald-500/20' :
              action === 'reject' ? 'bg-red-500/5 border-red-500/20' :
              'bg-amber-500/5 border-amber-500/20'
            }`}>
              <p className="text-sm">
                {action === 'approve' && 'You are about to approve this audit. The claim will be marked as approved and the invoice will be processed for payment.'}
                {action === 'reject' && 'You are about to reject this audit. The claim will be sent back for further investigation and the workshop will be notified.'}
                {action === 'escalate' && 'This case will be escalated to the fraud investigation team. All evidence will be preserved for review.'}
              </p>
            </div>
          )}

          {result && (
            <div className={`p-3 rounded-lg border text-sm ${
              result.ok
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400'
            }`}>
              {result.message}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => { setAction(null); setNotes(''); setResult(null) }}>
              Cancel
            </Button>
            <Button variant="default" size="sm" disabled={!action || submitting} onClick={handleSubmit}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {action === 'approve' ? 'Confirm Approval' :
               action === 'reject' ? 'Confirm Rejection' :
               action === 'escalate' ? 'Escalate Case' : 'Submit'}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
