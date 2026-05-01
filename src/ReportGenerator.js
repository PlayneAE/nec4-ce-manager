import { useState } from 'react'
import { supabase } from './supabaseClient'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function ReportGenerator({ subcontract, project, onClose }) {
  const [generating, setGenerating] = useState(false)
  const [reportType, setReportType] = useState('subcontract')

  async function generateReport() {
    setGenerating(true)

    const [cesRes, ewnsRes, paymentsRes, amendmentsRes] = await Promise.all([
      supabase.from('compensation_events').select('*').eq('subcontract_id', subcontract.id),
      supabase.from('early_warnings').select('*').eq('subcontract_id', subcontract.id),
      supabase.from('payment_cycles').select('*').eq('subcontract_id', subcontract.id).order('cycle_number'),
      supabase.from('contract_amendments').select('*').eq('subcontract_id', subcontract.id),
    ])

    const ces = cesRes.data || []
    const ewns = ewnsRes.data || []
    const payments = paymentsRes.data || []
    const amendments = amendmentsRes.data || []

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 20

    // Header
    doc.setFillColor(44, 44, 42)
    doc.rect(0, 0, pageWidth, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('SubContract Pro', 14, 16)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Subcontract Management Report', 14, 24)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 31)

    y = 52

    // Subcontract details
    doc.setTextColor(44, 44, 42)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`${subcontract.reference} — ${subcontract.subcontractor_name}`, 14, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(`Project: ${project?.name || '—'}   |   NEC4 Option ${subcontract.nec_option}   |   Quotation period: ${subcontract.quotation_period_weeks} weeks   |   PM reply period: ${subcontract.pm_reply_period_weeks} weeks`, 14, y)
    y += 6

    if (subcontract.commencement_date) {
      doc.text(`Commencement: ${new Date(subcontract.commencement_date).toLocaleDateString('en-GB')}   |   Completion: ${subcontract.completion_date ? new Date(subcontract.completion_date).toLocaleDateString('en-GB') : '—'}`, 14, y)
    }
    y += 12

    // Summary stats
    doc.setDrawColor(224, 221, 213)
    doc.setFillColor(249, 248, 245)
    doc.rect(14, y, pageWidth - 28, 28, 'FD')

    const today = new Date()
    const overdueCEs = ces.filter(ce => {
      const dueDate = ce.quotation_due_date || ce.pm_reply_due_date
      if (!dueDate || ce.status === 'implemented') return false
      return new Date(dueDate) < today
    }).length

    const totalAfp = payments.reduce((sum, p) => sum + (parseFloat(p.afp_amount) || 0), 0)
    const totalCertified = payments.reduce((sum, p) => sum + (parseFloat(p.certified_amount) || 0), 0)
    const notifiedValue = ces.reduce((sum, ce) => sum + (parseFloat(ce.notified_value) || 0), 0)

    doc.setTextColor(100, 100, 100)
    doc.setFontSize(8)
    doc.text('TOTAL CEs', 20, y + 8)
    doc.text('OVERDUE CEs', 55, y + 8)
    doc.text('OPEN EWNs', 95, y + 8)
    doc.text('NOTIFIED VALUE', 130, y + 8)
    doc.text('TOTAL AFPs', 168, y + 8)

    doc.setTextColor(44, 44, 42)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(`${ces.length}`, 20, y + 20)
    doc.setTextColor(overdueCEs > 0 ? 163 : 15, overdueCEs > 0 ? 45 : 110, overdueCEs > 0 ? 45 : 86)
    doc.text(`${overdueCEs}`, 55, y + 20)
    doc.setTextColor(44, 44, 42)
    doc.text(`${ewns.filter(e => e.status !== 'closed').length}`, 95, y + 20)
    doc.text(`£${notifiedValue.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`, 130, y + 20)
    doc.text(`£${totalAfp.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`, 168, y + 20)

    y += 36

    // CE Register
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(44, 44, 42)
    doc.text('Compensation Event Register', 14, y)
    y += 6

    autoTable(doc, {
      startY: y,
      head: [['Ref', 'Description', 'Notified by', 'Status', 'Notified value', 'Due date']],
      body: ces.map(ce => [
        ce.reference,
        ce.description.length > 45 ? ce.description.substring(0, 45) + '...' : ce.description,
        ce.notified_by,
        ce.status.replace(/_/g, ' '),
        ce.notified_value ? `£${Number(ce.notified_value).toLocaleString('en-GB')}` : '—',
        ce.quotation_due_date ? new Date(ce.quotation_due_date).toLocaleDateString('en-GB') : '—',
      ]),
      headStyles: { fillColor: [44, 44, 42], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [249, 248, 245] },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 65 },
        2: { cellWidth: 22 },
        3: { cellWidth: 28 },
        4: { cellWidth: 25 },
        5: { cellWidth: 22 },
      },
      margin: { left: 14, right: 14 },
    })

    y = doc.lastAutoTable.finalY + 12

    // EWN Register
    if (y > 240) { doc.addPage(); y = 20 }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(44, 44, 42)
    doc.text('Early Warning Register', 14, y)
    y += 6

    autoTable(doc, {
      startY: y,
      head: [['Ref', 'Description', 'Raised by', 'Status', 'Notified date', 'RRM date']],
      body: ewns.map(ew => [
        ew.reference,
        ew.description.length > 50 ? ew.description.substring(0, 50) + '...' : ew.description,
        ew.raised_by,
        ew.status.replace(/_/g, ' '),
        new Date(ew.notification_date).toLocaleDateString('en-GB'),
        ew.rrm_date ? new Date(ew.rrm_date).toLocaleDateString('en-GB') : '—',
      ]),
      headStyles: { fillColor: [44, 44, 42], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [249, 248, 245] },
      margin: { left: 14, right: 14 },
    })

    y = doc.lastAutoTable.finalY + 12

    // Payment summary
    if (y > 240) { doc.addPage(); y = 20 }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(44, 44, 42)
    doc.text('Payment Summary', 14, y)
    y += 6

    autoTable(doc, {
      startY: y,
      head: [['Cycle', 'Assessment date', 'AFP (£)', 'Certified (£)', 'Final payment date', 'Status']],
      body: payments.map(p => [
        `#${p.cycle_number}`,
        new Date(p.assessment_date).toLocaleDateString('en-GB'),
        p.afp_amount ? `£${Number(p.afp_amount).toLocaleString('en-GB')}` : '—',
        p.certified_amount ? `£${Number(p.certified_amount).toLocaleString('en-GB')}` : '—',
        new Date(p.final_payment_date).toLocaleDateString('en-GB'),
        p.status.replace(/_/g, ' '),
      ]),
      headStyles: { fillColor: [44, 44, 42], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [249, 248, 245] },
      margin: { left: 14, right: 14 },
      foot: [[
        'Total', '', 
        `£${totalAfp.toLocaleString('en-GB')}`,
        `£${totalCertified.toLocaleString('en-GB')}`,
        '', ''
      ]],
      footStyles: { fillColor: [44, 44, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    })

    // Footer on each page
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(`SubContract Pro — ${subcontract.reference} — ${subcontract.subcontractor_name}`, 14, doc.internal.pageSize.getHeight() - 10)
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, doc.internal.pageSize.getHeight() - 10)
    }

    doc.save(`${subcontract.reference}_${subcontract.subcontractor_name.replace(/\s/g, '_')}_Report.pdf`)
    setGenerating(false)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#fff', borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '440px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>Generate report</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888780' }}>×</button>
        </div>

        <div style={{ background: '#f9f8f5', border: '0.5px solid #e0ddd5', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#2c2c2a', marginBottom: '4px' }}>{subcontract.reference} — {subcontract.subcontractor_name}</div>
          <div style={{ fontSize: '12px', color: '#888780' }}>PDF report including CE register, EWN register and payment summary</div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: '#5f5e5a', marginBottom: '8px', fontWeight: 500 }}>Report includes:</div>
          {[
            'Subcontract details and contract data',
            'Summary statistics',
            'Full compensation event register',
            'Early warning register',
            'Payment cycle summary with totals',
          ].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#5f5e5a', marginBottom: '6px' }}>
              <span style={{ color: '#0f6e56', fontSize: '12px' }}>✓</span>
              {item}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '8px 20px', fontSize: '13px', border: '0.5px solid #b4b2a9', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#5f5e5a' }}>
            Cancel
          </button>
          <button onClick={generateReport} disabled={generating}
            style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 500, background: '#2c2c2a', color: '#fff', border: 'none', borderRadius: '6px', cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.7 : 1 }}>
            {generating ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReportGenerator