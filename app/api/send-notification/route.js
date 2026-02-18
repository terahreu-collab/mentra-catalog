import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function buildAssignmentEmail({ teamMemberName, lessonTitle, courseName, companyName, appUrl }) {
  return {
    subject: `New Video Lesson Assigned: ${lessonTitle}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; background-color: #0e0b1a; border-radius: 16px; overflow: hidden; border: 1px solid #2d1b69;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); padding: 32px 28px; text-align: center;">
          <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: white; margin-bottom: 12px; line-height: 48px;">M</div>
          <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">New Lesson Assigned</h1>
          <p style="color: rgba(255,255,255,0.75); margin: 6px 0 0 0; font-size: 14px;">Mentra Video Catalog</p>
        </div>

        <!-- Body -->
        <div style="padding: 28px;">
          <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
            Hi <strong style="color: #e9d5ff;">${teamMemberName || 'there'}</strong>,
          </p>
          <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
            You've been assigned a new video lesson to work on. Here are the details:
          </p>

          <!-- Details Card -->
          <div style="background-color: #13102a; border: 1px solid #2d1b69; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #71717a; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; width: 110px;">Company</td>
                <td style="padding: 8px 0; color: #e4e4e7; font-size: 14px;">${companyName || '—'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #71717a; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Course</td>
                <td style="padding: 8px 0; color: #e4e4e7; font-size: 14px;">${courseName || '—'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #71717a; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Lesson</td>
                <td style="padding: 8px 0; color: #c084fc; font-size: 14px; font-weight: 600;">${lessonTitle || '—'}</td>
              </tr>
            </table>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; text-decoration: none; padding: 12px 32px; border-radius: 10px; font-size: 14px; font-weight: 600; letter-spacing: 0.3px;">Open Video Catalog →</a>
          </div>

          <p style="color: #52525b; font-size: 12px; text-align: center; margin: 0; line-height: 1.5;">
            This is an automated notification from Mentra Video Catalog.
          </p>
        </div>
      </div>
    `,
  }
}

function buildCompletionEmail({ teamMemberName, lessonTitle, courseName, companyName, dateCompleted, appUrl }) {
  return {
    subject: `Video Completed: ${lessonTitle}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; background-color: #0e0b1a; border-radius: 16px; overflow: hidden; border: 1px solid #2d1b69;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px 28px; text-align: center;">
          <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; color: white; margin-bottom: 12px; line-height: 48px;">✓</div>
          <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">Video Completed!</h1>
          <p style="color: rgba(255,255,255,0.75); margin: 6px 0 0 0; font-size: 14px;">Mentra Video Catalog</p>
        </div>

        <!-- Body -->
        <div style="padding: 28px;">
          <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
            A video lesson has been marked as completed. Here are the details:
          </p>

          <!-- Details Card -->
          <div style="background-color: #13102a; border: 1px solid #2d1b69; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #71717a; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; width: 120px;">Lesson</td>
                <td style="padding: 8px 0; color: #34d399; font-size: 14px; font-weight: 600;">${lessonTitle || '—'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #71717a; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Completed By</td>
                <td style="padding: 8px 0; color: #e4e4e7; font-size: 14px;">${teamMemberName || 'Unassigned'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #71717a; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Course</td>
                <td style="padding: 8px 0; color: #e4e4e7; font-size: 14px;">${courseName || '—'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #71717a; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Company</td>
                <td style="padding: 8px 0; color: #e4e4e7; font-size: 14px;">${companyName || '—'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #71717a; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Date Completed</td>
                <td style="padding: 8px 0; color: #e4e4e7; font-size: 14px;">${dateCompleted || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
              </tr>
            </table>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; text-decoration: none; padding: 12px 32px; border-radius: 10px; font-size: 14px; font-weight: 600; letter-spacing: 0.3px;">Open Video Catalog →</a>
          </div>

          <p style="color: #52525b; font-size: 12px; text-align: center; margin: 0; line-height: 1.5;">
            This is an automated notification from Mentra Video Catalog.
          </p>
        </div>
      </div>
    `,
  }
}

function buildApprovalEmail({ creatorName, teamMemberName, lessonTitle, courseName, companyName, dateApproved, appUrl }) {
  return {
    subject: `Payment Ready: ${lessonTitle} - Approved for Payment`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; background-color: #0e0b1a; border-radius: 16px; overflow: hidden; border: 1px solid #2d1b69;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 28px; text-align: center;">
          <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; color: white; margin-bottom: 12px; line-height: 48px;">💰</div>
          <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">Approved for Payment</h1>
          <p style="color: rgba(255,255,255,0.75); margin: 6px 0 0 0; font-size: 14px;">Mentra Video Catalog</p>
        </div>

        <!-- Body -->
        <div style="padding: 28px;">
          <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
            This lesson has been approved and is ready for creator payment.
          </p>

          <!-- Details Card -->
          <div style="background-color: #13102a; border: 1px solid #2d1b69; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #71717a; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; width: 120px;">Lesson</td>
                <td style="padding: 8px 0; color: #60a5fa; font-size: 14px; font-weight: 600;">${lessonTitle || '—'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #71717a; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Creator</td>
                <td style="padding: 8px 0; color: #e4e4e7; font-size: 14px;">${creatorName || '—'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #71717a; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Assigned To</td>
                <td style="padding: 8px 0; color: #e4e4e7; font-size: 14px;">${teamMemberName || 'Unassigned'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #71717a; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Course</td>
                <td style="padding: 8px 0; color: #e4e4e7; font-size: 14px;">${courseName || '—'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #71717a; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Company</td>
                <td style="padding: 8px 0; color: #e4e4e7; font-size: 14px;">${companyName || '—'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #71717a; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Date Approved</td>
                <td style="padding: 8px 0; color: #e4e4e7; font-size: 14px;">${dateApproved || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
              </tr>
            </table>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; text-decoration: none; padding: 12px 32px; border-radius: 10px; font-size: 14px; font-weight: 600; letter-spacing: 0.3px;">Open Video Catalog →</a>
          </div>

          <p style="color: #52525b; font-size: 12px; text-align: center; margin: 0; line-height: 1.5;">
            This is an automated notification from Mentra Video Catalog.
          </p>
        </div>
      </div>
    `,
  }
}

const REVIEW_CAT_LABELS = {
  music: 'Music',
  script_narration: 'Script/Narration',
  color_branding: 'Color/Branding',
  format_resolution: 'Format/Resolution',
  title_page_intro: 'Title Page/Intro',
  transitions_effects: 'Transitions/Effects',
  audio_quality: 'Audio Quality',
  pacing_timing: 'Pacing/Timing',
  captions_subtitles: 'Captions/Subtitles',
  overall_quality: 'Overall Quality',
}

function buildReviewEmail({ reviewerName, lessonTitle, teamMemberName, categories, additionalNotes, appUrl }) {
  const catRows = Object.entries(categories || {}).map(([key, val]) => {
    const label = REVIEW_CAT_LABELS[key] || key
    const approved = val.status === 'approved'
    const statusColor = approved ? '#34d399' : '#fbbf24'
    const statusText = approved ? '✓ Approved' : '⚠ Needs Changes'
    const notesHtml = val.notes ? `<div style="color: #71717a; font-size: 12px; margin-top: 2px; font-style: italic;">${val.notes}</div>` : ''
    return `
      <tr>
        <td style="padding: 6px 0; color: #d4d4d8; font-size: 13px; width: 160px; vertical-align: top;">${label}</td>
        <td style="padding: 6px 0; vertical-align: top;">
          <span style="color: ${statusColor}; font-size: 13px; font-weight: 600;">${statusText}</span>
          ${notesHtml}
        </td>
      </tr>`
  }).join('')

  const additionalHtml = additionalNotes
    ? `<div style="background-color: #1a1530; border: 1px solid #2d1b69; border-radius: 8px; padding: 14px; margin-bottom: 24px;">
        <div style="color: #71717a; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Additional Notes</div>
        <div style="color: #d4d4d8; font-size: 13px; line-height: 1.6; white-space: pre-wrap;">${additionalNotes}</div>
      </div>`
    : ''

  const allApproved = Object.values(categories || {}).every((c) => c.status === 'approved')
  const headerBg = allApproved ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
  const headerIcon = allApproved ? '✓' : '⚠'
  const headerTitle = allApproved ? 'All Categories Approved!' : 'Review Feedback — Changes Needed'

  return {
    subject: `Video Review Feedback: ${lessonTitle}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; background-color: #0e0b1a; border-radius: 16px; overflow: hidden; border: 1px solid #2d1b69;">
        <div style="background: ${headerBg}; padding: 32px 28px; text-align: center;">
          <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; color: white; margin-bottom: 12px; line-height: 48px;">${headerIcon}</div>
          <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">${headerTitle}</h1>
          <p style="color: rgba(255,255,255,0.75); margin: 6px 0 0 0; font-size: 14px;">Mentra Video Catalog</p>
        </div>

        <div style="padding: 28px;">
          <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin: 0 0 8px 0;">
            <strong style="color: #e9d5ff;">${reviewerName || 'A reviewer'}</strong> has submitted feedback for:
          </p>
          <p style="color: #c084fc; font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">${lessonTitle || '—'}</p>
          <p style="color: #71717a; font-size: 13px; margin: 0 0 24px 0;">Assigned to: ${teamMemberName || 'Unassigned'}</p>

          <div style="background-color: #13102a; border: 1px solid #2d1b69; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">${catRows}</table>
          </div>

          ${additionalHtml}

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; text-decoration: none; padding: 12px 32px; border-radius: 10px; font-size: 14px; font-weight: 600; letter-spacing: 0.3px;">Open Video Catalog →</a>
          </div>

          <p style="color: #52525b; font-size: 12px; text-align: center; margin: 0; line-height: 1.5;">
            This is an automated notification from Mentra Video Catalog.
          </p>
        </div>
      </div>
    `,
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { type = 'assignment' } = body

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mentra-catalog.vercel.app'

    let to, subject, html

    if (type === 'completion') {
      const { managerEmail, teamMemberName, lessonTitle, courseName, companyName, dateCompleted } = body

      if (!managerEmail) {
        return Response.json({ error: 'managerEmail is required' }, { status: 400 })
      }

      to = Array.isArray(managerEmail) ? managerEmail : [managerEmail]
      const email = buildCompletionEmail({ teamMemberName, lessonTitle, courseName, companyName, dateCompleted, appUrl })
      subject = email.subject
      html = email.html
    } else if (type === 'review') {
      const { recipients, reviewerName, lessonTitle, teamMemberName, categories, additionalNotes } = body

      if (!recipients || !recipients.length) {
        return Response.json({ error: 'recipients is required' }, { status: 400 })
      }

      to = recipients
      const email = buildReviewEmail({ reviewerName, lessonTitle, teamMemberName, categories, additionalNotes, appUrl })
      subject = email.subject
      html = email.html
    } else if (type === 'approval') {
      const { recipientEmail, creatorName, teamMemberName, lessonTitle, courseName, companyName, dateApproved } = body

      if (!recipientEmail) {
        return Response.json({ error: 'recipientEmail is required' }, { status: 400 })
      }

      to = [recipientEmail]
      const email = buildApprovalEmail({ creatorName, teamMemberName, lessonTitle, courseName, companyName, dateApproved, appUrl })
      subject = email.subject
      html = email.html
    } else {
      const { teamMemberEmail, teamMemberName, lessonTitle, courseName, companyName } = body

      if (!teamMemberEmail) {
        return Response.json({ error: 'teamMemberEmail is required' }, { status: 400 })
      }

      to = [teamMemberEmail]
      const email = buildAssignmentEmail({ teamMemberName, lessonTitle, courseName, companyName, appUrl })
      subject = email.subject
      html = email.html
    }

    const { data, error } = await resend.emails.send({
      from: 'Mentra Video Catalog <notifications@mentra-ai.ai>',
      to,
      subject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, data })
  } catch (err) {
    console.error('Send notification error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
