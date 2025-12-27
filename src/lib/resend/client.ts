import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export interface SupportTicketEmailData {
    ticketId: string;
    ticketType: string;
    subject: string;
    description: string;
    userEmail: string;
    userPhone?: string | null;
    createdAt: string;
}

/**
 * Send email notification for new support ticket
 * @param recipientEmail Email address to send notification to (admin email)
 * @param ticketData Support ticket data
 * @returns Result of email send operation
 */
export async function sendSupportTicketEmail(
    recipientEmail: string,
    ticketData: SupportTicketEmailData
) {
    try {
        // Format ticket type for display
        const ticketTypeDisplay = ticketData.ticketType.charAt(0).toUpperCase() 
            + ticketData.ticketType.slice(1);

        // Format creation date
        const createdDate = new Date(ticketData.createdAt).toLocaleString('en-GB', {
            dateStyle: 'full',
            timeStyle: 'short',
        });

        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'LightVerse Support <support@yourdomain.com>',
            to: recipientEmail,
            subject: `New ${ticketTypeDisplay} Ticket: ${ticketData.subject}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>New Support Ticket</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            background-color: #f5f5f5;
                        }
                        .container {
                            background-color: #ffffff;
                            border-radius: 8px;
                            padding: 30px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        .header {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 20px;
                            border-radius: 8px 8px 0 0;
                            margin: -30px -30px 20px -30px;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 24px;
                        }
                        .badge {
                            display: inline-block;
                            padding: 4px 12px;
                            border-radius: 12px;
                            font-size: 12px;
                            font-weight: 600;
                            margin-top: 8px;
                        }
                        .badge.bug { background-color: #fee2e2; color: #991b1b; }
                        .badge.help { background-color: #dbeafe; color: #1e40af; }
                        .badge.feature { background-color: #d1fae5; color: #065f46; }
                        .badge.other { background-color: #e5e7eb; color: #374151; }
                        .field {
                            margin-bottom: 20px;
                        }
                        .field-label {
                            font-weight: 600;
                            color: #6b7280;
                            font-size: 12px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            margin-bottom: 4px;
                        }
                        .field-value {
                            color: #111827;
                            font-size: 15px;
                        }
                        .description {
                            background-color: #f9fafb;
                            padding: 16px;
                            border-radius: 6px;
                            border-left: 4px solid #667eea;
                            margin-top: 8px;
                            white-space: pre-wrap;
                            word-wrap: break-word;
                        }
                        .footer {
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 1px solid #e5e7eb;
                            font-size: 12px;
                            color: #6b7280;
                        }
                        .ticket-id {
                            font-family: 'Courier New', monospace;
                            background-color: #f3f4f6;
                            padding: 2px 6px;
                            border-radius: 4px;
                            font-size: 13px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎫 New Support Ticket</h1>
                            <span class="badge ${ticketData.ticketType}">${ticketTypeDisplay}</span>
                        </div>
                        
                        <div class="field">
                            <div class="field-label">Ticket ID</div>
                            <div class="field-value">
                                <span class="ticket-id">${ticketData.ticketId}</span>
                            </div>
                        </div>

                        <div class="field">
                            <div class="field-label">Subject</div>
                            <div class="field-value">${ticketData.subject}</div>
                        </div>

                        <div class="field">
                            <div class="field-label">Description</div>
                            <div class="description">${ticketData.description}</div>
                        </div>

                        <div class="field">
                            <div class="field-label">User Email</div>
                            <div class="field-value">
                                <a href="mailto:${ticketData.userEmail}" style="color: #667eea; text-decoration: none;">
                                    ${ticketData.userEmail}
                                </a>
                            </div>
                        </div>

                        ${ticketData.userPhone ? `
                        <div class="field">
                            <div class="field-label">User Phone</div>
                            <div class="field-value">
                                <a href="tel:${ticketData.userPhone}" style="color: #667eea; text-decoration: none;">
                                    ${ticketData.userPhone}
                                </a>
                            </div>
                        </div>
                        ` : ''}

                        <div class="field">
                            <div class="field-label">Submitted On</div>
                            <div class="field-value">${createdDate}</div>
                        </div>

                        <div class="footer">
                            <p>This is an automated notification from LightVerse Support System.</p>
                            <p>Please respond to the user at <a href="mailto:${ticketData.userEmail}" style="color: #667eea;">${ticketData.userEmail}</a></p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            // Also include a plain text version
            text: `
New Support Ticket Submitted

Ticket ID: ${ticketData.ticketId}
Type: ${ticketTypeDisplay}
Subject: ${ticketData.subject}

Description:
${ticketData.description}

User Details:
- Email: ${ticketData.userEmail}
${ticketData.userPhone ? `- Phone: ${ticketData.userPhone}` : ''}

Submitted On: ${createdDate}

---
This is an automated notification from LightVerse Support System.
Please respond to the user at ${ticketData.userEmail}
            `.trim(),
        });

        if (error) {
            console.error('Resend error:', error);
            throw new Error(`Failed to send email: ${error.message}`);
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error sending support ticket email:', error);
        throw error;
    }
}

export default resend;
