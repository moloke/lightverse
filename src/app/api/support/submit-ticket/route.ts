import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSupportTicketEmail } from "@/lib/email/client";

export async function POST(request: NextRequest) {
    try {
        const { ticketType, email, subject, description } = await request.json();

        // Validate required fields
        if (!ticketType || !email || !subject || !description) {
            return NextResponse.json(
                { error: "Ticket type, email, subject, and description are required" },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: "Invalid email address" },
                { status: 400 }
            );
        }

        // Validate ticket type
        const validTypes = ['bug', 'help', 'feature', 'other'];
        if (!validTypes.includes(ticketType)) {
            return NextResponse.json(
                { error: "Invalid ticket type" },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "You must be logged in to submit a support ticket" },
                { status: 401 }
            );
        }

        // Get user profile for email/phone
        const { data: userProfile } = await supabase
            .from('users')
            .select('phone_number')
            .eq('id', user.id)
            .single();

        // Create support ticket
        const { data, error } = await supabase
            .from('support_tickets')
            .insert({
                user_id: user.id,
                user_email: email.trim(), // Use the email from the form
                user_phone: userProfile?.phone_number || null,
                ticket_type: ticketType,
                subject: subject.trim(),
                description: description.trim(),
                status: 'open',
                priority: 'medium', // Default priority
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating support ticket:', error);
            return NextResponse.json(
                { error: "Failed to create support ticket" },
                { status: 500 }
            );
        }

        // Send email notification if configured
        const adminEmail = process.env.SUPPORT_NOTIFICATION_EMAIL;
        if (adminEmail) {
            try {
                await sendSupportTicketEmail(adminEmail, {
                    ticketId: data.id,
                    ticketType: data.ticket_type,
                    subject: data.subject,
                    description: data.description,
                    userEmail: data.user_email,
                    userPhone: data.user_phone,
                    createdAt: data.created_at,
                });
                console.log('Support ticket email sent successfully to:', adminEmail);
            } catch (emailError) {
                // Log the error but don't fail the request
                // The ticket was created successfully, email is just a notification
                console.error('Failed to send support ticket email:', emailError);
            }
        } else {
            console.warn('SUPPORT_NOTIFICATION_EMAIL not configured - skipping email notification');
        }

        return NextResponse.json({
            success: true,
            message: "Support ticket submitted successfully",
            ticket: {
                id: data.id,
                ticketType: data.ticket_type,
                subject: data.subject,
                status: data.status,
                createdAt: data.created_at,
            },
        });
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json(
            { error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
