import sgMail from '@sendgrid/mail';

export type EmailTemplate = 'invitation-sent' | 'rsvp-reminder' | 'proposals-ready' | 'winner-announced';

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #ece8e1;overflow:hidden">
        <tr><td style="padding:32px 36px 8px">
          <div style="font-family:'DM Serif Display',Georgia,serif;font-size:22px;letter-spacing:-.01em;color:#1a1a1a">GroupPlan</div>
        </td></tr>
        <tr><td style="padding:8px 36px 32px;font-size:15px;line-height:1.55;color:#333">
          <h1 style="font-family:'DM Serif Display',Georgia,serif;font-size:26px;font-weight:400;margin:16px 0 12px;color:#1a1a1a">${escape(title)}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:0 36px 32px;font-size:11px;color:#999;border-top:1px solid #f0ece5;padding-top:16px">
          Sent by GroupPlan — group plans, decided.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(label: string, href: string): string {
  return `<a href="${escape(href)}" style="display:inline-block;padding:12px 22px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;margin:16px 0">${escape(label)}</a>`;
}

export function renderEmail(template: EmailTemplate, data: Record<string, string>): RenderedEmail {
  switch (template) {
    case 'invitation-sent': {
      const hostName  = data['host_name']  ?? 'A friend';
      const eventName = data['event_title'] ?? 'a group dinner';
      const inviteUrl = data['invite_url'] ?? '#';
      return {
        subject: `${hostName} invited you to ${eventName}`,
        html: shell(`You're invited to ${eventName}`, `
          <p><strong>${escape(hostName)}</strong> wants you to join <strong>${escape(eventName)}</strong>.</p>
          <p>Tell us your dietary needs, budget, and the vibe you're after — GroupPlan blends everyone's input into three restaurant picks for the group to vote on.</p>
          ${button('RSVP & share preferences', inviteUrl)}
          <p style="font-size:12px;color:#999;margin-top:24px">Or paste this link: <br/><span style="word-break:break-all">${escape(inviteUrl)}</span></p>
        `),
        text: `${hostName} invited you to ${eventName}.\n\nRSVP and share your preferences: ${inviteUrl}`,
      };
    }

    case 'rsvp-reminder': {
      const eventName = data['event_title'] ?? 'the group dinner';
      const inviteUrl = data['invite_url'] ?? '#';
      const deadline  = data['deadline']    ?? 'soon';
      return {
        subject: `Reminder: RSVP for ${eventName}`,
        html: shell(`Quick reminder`, `
          <p>You haven't responded to <strong>${escape(eventName)}</strong> yet — the host needs everyone's input by <strong>${escape(deadline)}</strong> to lock in plans.</p>
          ${button('RSVP now', inviteUrl)}
        `),
        text: `Reminder: RSVP for ${eventName} by ${deadline}: ${inviteUrl}`,
      };
    }

    case 'proposals-ready': {
      const eventName = data['event_title'] ?? 'your group dinner';
      const voteUrl   = data['vote_url']    ?? '#';
      return {
        subject: `Time to vote: 3 picks for ${eventName}`,
        html: shell(`Your three picks are in`, `
          <p>GroupPlan crunched everyone's preferences for <strong>${escape(eventName)}</strong> and surfaced the three restaurants that fit the group best.</p>
          <p>Rank them now — the highest combined score wins.</p>
          ${button('Cast your votes', voteUrl)}
        `),
        text: `3 restaurant picks are ready for ${eventName}. Rank them: ${voteUrl}`,
      };
    }

    case 'winner-announced': {
      const eventName    = data['event_title']     ?? 'your group dinner';
      const restaurant   = data['restaurant_name'] ?? '';
      const address      = data['restaurant_addr'] ?? '';
      const time         = data['confirmed_time']  ?? '';
      const calendarUrl  = data['calendar_url']    ?? '';
      return {
        subject: `It's settled — ${restaurant} for ${eventName}`,
        html: shell(`The group picked ${restaurant}`, `
          <p>Plans for <strong>${escape(eventName)}</strong> are locked in.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #ece8e1;border-radius:12px;padding:16px;width:100%">
            <tr><td style="font-family:'DM Serif Display',Georgia,serif;font-size:20px;color:#1a1a1a;padding-bottom:6px">${escape(restaurant)}</td></tr>
            <tr><td style="font-size:13px;color:#666;padding-bottom:6px">${escape(address)}</td></tr>
            ${time ? `<tr><td style="font-size:13px;color:#1a1a1a"><strong>${escape(time)}</strong></td></tr>` : ''}
          </table>
          ${calendarUrl ? button('Add to calendar', calendarUrl) : ''}
        `),
        text: `${eventName} is set: ${restaurant} (${address})${time ? ` at ${time}` : ''}.${calendarUrl ? `\nCalendar: ${calendarUrl}` : ''}`,
      };
    }
  }
}

export async function sendEmail(
  apiKey: string,
  fromEmail: string,
  fromName: string,
  to: { name: string; email: string },
  template: EmailTemplate,
  data: Record<string, string>,
): Promise<void> {
  const rendered = renderEmail(template, data);

  sgMail.setApiKey(apiKey);
  await sgMail.send({
    to,
    from: { email: fromEmail, name: fromName },
    ...rendered,
  });
}
