import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async () => {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)

  const today = new Date()
  const in7Days = new Date(today)
  in7Days.setDate(today.getDate() + 7)
  const in3Days = new Date(today)
  in3Days.setDate(today.getDate() + 3)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  function formatDate(date: Date) {
    return date.toISOString().split('T')[0]
  }

  const alertDates = [
    { date: formatDate(tomorrow), label: 'tomorrow' },
    { date: formatDate(in3Days), label: 'in 3 days' },
    { date: formatDate(in7Days), label: 'in 7 days' },
  ]

  const alerts: any[] = []

  for (const alert of alertDates) {
    const { data: ces } = await supabase
      .from('compensation_events')
      .select(`
        reference,
        description,
        status,
        quotation_due_date,
        pm_reply_due_date,
        subcontracts (
          reference,
          subcontractor_name,
          projects (name)
        )
      `)
      .or(`quotation_due_date.eq.${alert.date},pm_reply_due_date.eq.${alert.date}`)
      .neq('status', 'implemented')

    if (ces && ces.length > 0) {
      for (const ce of ces) {
        alerts.push({
          type: 'CE deadline',
          reference: ce.reference,
          description: ce.description,
          subcontract: ce.subcontracts?.reference,
          subcontractor: ce.subcontracts?.subcontractor_name,
          project: ce.subcontracts?.projects?.name,
          dueLabel: alert.label,
          dueDate: ce.quotation_due_date || ce.pm_reply_due_date,
        })
      }
    }

    const { data: payments } = await supabase
      .from('payment_cycles')
      .select(`
        cycle_number,
        final_payment_date,
        pay_less_notice_date,
        subcontracts (reference, subcontractor_name)
      `)
      .or(`final_payment_date.eq.${alert.date},pay_less_notice_date.eq.${alert.date}`)
      .neq('status', 'paid')

    if (payments && payments.length > 0) {
      for (const payment of payments) {
        alerts.push({
          type: 'Payment deadline',
          reference: `Cycle #${payment.cycle_number}`,
          subcontract: payment.subcontracts?.reference,
          subcontractor: payment.subcontracts?.subcontractor_name,
          dueLabel: alert.label,
          dueDate: payment.final_payment_date || payment.pay_less_notice_date,
        })
      }
    }
  }

  if (alerts.length === 0) {
    return new Response(JSON.stringify({ message: 'No alerts today' }), { status: 200 })
  }

  const emailBody = `
    <h2>NEC4 CE Manager — Deadline Alerts</h2>
    <p>The following deadlines are approaching:</p>
    <table style="width:100%;border-collapse:collapse;">
      <tr style="background:#f1efe8;">
        <th style="padding:8px;text-align:left;border:1px solid #e0ddd5;">Type</th>
        <th style="padding:8px;text-align:left;border:1px solid #e0ddd5;">Reference</th>
        <th style="padding:8px;text-align:left;border:1px solid #e0ddd5;">Subcontract</th>
        <th style="padding:8px;text-align:left;border:1px solid #e0ddd5;">Due</th>
        <th style="padding:8px;text-align:left;border:1px solid #e0ddd5;">Date</th>
      </tr>
      ${alerts.map(a => `
        <tr>
          <td style="padding:8px;border:1px solid #e0ddd5;">${a.type}</td>
          <td style="padding:8px;border:1px solid #e0ddd5;">${a.reference}</td>
          <td style="padding:8px;border:1px solid #e0ddd5;">${a.subcontract} — ${a.subcontractor}</td>
          <td style="padding:8px;border:1px solid #e0ddd5;">${a.dueLabel}</td>
          <td style="padding:8px;border:1px solid #e0ddd5;">${new Date(a.dueDate).toLocaleDateString('en-GB')}</td>
        </tr>
      `).join('')}
    </table>
    <p style="margin-top:24px;color:#888780;font-size:12px;">
      This is an automated alert from NEC4 CE Manager. 
      Log in at https://nec4-ce-manager.vercel.app to take action.
    </p>
  `

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'NEC4 CE Manager <alerts@resend.dev>',
      to: ['samsonelegbede@samelgroup.co.uk'],
      subject: `NEC4 Alert — ${alerts.length} deadline${alerts.length > 1 ? 's' : ''} approaching`,
      html: emailBody,
    }),
  })

  return new Response(JSON.stringify({ message: `Sent ${alerts.length} alerts` }), { status: 200 })
})