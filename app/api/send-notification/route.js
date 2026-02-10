import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  try {
    const { teamMemberEmail, teamMemberName, lessonTitle, courseName, companyName } =
      await request.json()

    if (!teamMemberEmail) {
      return Response.json({ error: 'teamMemberEmail is required' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mentra-catalog.vercel.app'

    const { data, error } = await resend.emails.send({
      from: 'Mentra Video Catalog <notifications@mentra-ai.ai>',
      to: [teamMemberEmail],
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
