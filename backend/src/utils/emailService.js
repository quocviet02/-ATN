const { Resend } = require('resend');

// Render (and most PaaS free tiers) block outbound SMTP (ports 25/465/587)
// entirely at the network level — no amount of Nodemailer config can get
// around that. Resend's API is plain HTTPS (port 443), which isn't blocked.
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 'your_resend_api_key') return null;
  return new Resend(apiKey);
}

// Resend's sandbox sender only delivers to the email address you signed up
// with, until you verify a custom domain at resend.com/domains.
function getFromAddress() {
  return process.env.MAIL_FROM || 'Project Manager <onboarding@resend.dev>';
}

exports.verifyConnection = async () => {
  if (!getResendClient()) {
    console.log('[EMAIL] RESEND_API_KEY not configured — invitation emails will be logged to console instead of sent.');
    return;
  }
  console.log('[EMAIL] Resend API key configured — ready to send messages');
};

function buildInvitationHtml({ inviterName, projectName, roleName, acceptUrl, rejectUrl }) {
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Lời mời tham gia project</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td align="center" style="background:#0052cc;border-radius:8px 8px 0 0;padding:28px 40px;">
            <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-.3px;">📋 Project Manager</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:36px 40px;border-left:1px solid #dfe1e6;border-right:1px solid #dfe1e6;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#172b4d;">
              Bạn nhận được lời mời tham gia project!
            </h1>
            <p style="margin:0 0 24px;color:#42526e;font-size:15px;line-height:1.7;">
              <strong style="color:#172b4d;">${inviterName}</strong> đã mời bạn tham gia project
              <strong style="color:#172b4d;">${projectName}</strong> với vai trò:
            </p>

            <!-- Role badge -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#deebff;border-radius:20px;padding:7px 18px;color:#0052cc;font-size:13px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;">
                  ${roleName}
                </td>
              </tr>
            </table>

            <!-- Accept button -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:10px;width:100%;">
              <tr>
                <td align="center" style="background:#0052cc;border-radius:4px;">
                  <a href="${acceptUrl}"
                     style="display:block;padding:15px 32px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:.1px;">
                    ✓&nbsp;&nbsp;Chấp nhận lời mời
                  </a>
                </td>
              </tr>
            </table>

            <!-- Reject button -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;width:100%;">
              <tr>
                <td align="center" style="border:1.5px solid #dfe1e6;border-radius:4px;">
                  <a href="${rejectUrl}"
                     style="display:block;padding:13px 32px;color:#42526e;font-size:15px;font-weight:500;text-decoration:none;">
                    ✕&nbsp;&nbsp;Từ chối
                  </a>
                </td>
              </tr>
            </table>

            <!-- Divider + note -->
            <p style="margin:0;padding-top:20px;border-top:1px solid #f4f5f7;color:#97a0af;font-size:13px;line-height:1.6;">
              ⏱ Lời mời này sẽ <strong>hết hạn sau 48 giờ</strong>.<br>
              Nếu bạn không muốn tham gia, có thể bỏ qua email này.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f4f5f7;border-radius:0 0 8px 8px;padding:18px 40px;border:1px solid #dfe1e6;border-top:none;">
            <p style="margin:0;color:#97a0af;font-size:12px;text-align:center;line-height:1.6;">
              Email này được gửi tự động từ Project Manager.<br>
              Vui lòng không trả lời email này.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const ORG_ROLE_LABELS = {
  owner:           'Owner',
  admin:           'Admin',
  department_head: 'Trưởng phòng',
  team_lead:       'Trưởng nhóm',
  member:          'Thành viên',
  guest:           'Khách',
};

function buildOrgInvitationHtml({ inviterName, orgName, roleLabel, jobTitle, loginUrl }) {
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Lời mời tham gia tổ chức</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td align="center" style="background:#0052cc;border-radius:8px 8px 0 0;padding:28px 40px;">
            <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-.3px;">🏢 Project Manager</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:36px 40px;border-left:1px solid #dfe1e6;border-right:1px solid #dfe1e6;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#172b4d;">
              Bạn đã được thêm vào một tổ chức!
            </h1>
            <p style="margin:0 0 24px;color:#42526e;font-size:15px;line-height:1.7;">
              <strong style="color:#172b4d;">${inviterName}</strong> đã thêm bạn vào tổ chức
              <strong style="color:#172b4d;">${orgName}</strong>${jobTitle ? ` với chức danh <strong style="color:#172b4d;">${jobTitle}</strong>` : ''} với vai trò:
            </p>

            <!-- Role badge -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#deebff;border-radius:20px;padding:7px 18px;color:#0052cc;font-size:13px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;">
                  ${roleLabel}
                </td>
              </tr>
            </table>

            <!-- Login button -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:10px;width:100%;">
              <tr>
                <td align="center" style="background:#0052cc;border-radius:4px;">
                  <a href="${loginUrl}"
                     style="display:block;padding:15px 32px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:.1px;">
                    Đăng nhập &amp; xem tổ chức
                  </a>
                </td>
              </tr>
            </table>

            <!-- Divider + note -->
            <p style="margin:0;padding-top:20px;border-top:1px solid #f4f5f7;color:#97a0af;font-size:13px;line-height:1.6;">
              Nếu bạn không mong đợi email này, vui lòng bỏ qua.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f4f5f7;border-radius:0 0 8px 8px;padding:18px 40px;border:1px solid #dfe1e6;border-top:none;">
            <p style="margin:0;color:#97a0af;font-size:12px;text-align:center;line-height:1.6;">
              Email này được gửi tự động từ Project Manager.<br>
              Vui lòng không trả lời email này.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

exports.sendOrgInvitationEmail = async ({ toEmail, inviterName, orgName, role, jobTitle }) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:4200';
  const loginUrl  = `${clientUrl}/login`;
  const roleLabel = ORG_ROLE_LABELS[role] || role;

  try {
    const resend = getResendClient();

    if (!resend) {
      console.log('\n[EMAIL — DEV MODE] Organization invitation email (not sent, RESEND_API_KEY not configured)');
      console.log(`  To:       ${toEmail}`);
      console.log(`  Inviter:  ${inviterName}  Org: ${orgName}  Role: ${role}`);
      console.log(`  Login:    ${loginUrl}\n`);
      return;
    }

    const html = buildOrgInvitationHtml({ inviterName, orgName, roleLabel, jobTitle, loginUrl });

    const { data, error } = await resend.emails.send({
      from:    getFromAddress(),
      to:      toEmail,
      subject: `[Project Manager] ${inviterName} đã thêm bạn vào tổ chức "${orgName}"`,
      html,
    });

    if (error) throw new Error(error.message || JSON.stringify(error));

    console.log(`[EMAIL] Organization invitation sent to ${toEmail} (id: ${data?.id})`);
  } catch (error) {
    console.error(`[EMAIL] Failed to send organization invitation to ${toEmail}:`, error.message);
    console.error(error.stack);
  }
};

exports.sendInvitationEmail = async ({ toEmail, inviterName, projectName, role, token }) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:4200';
  const acceptUrl = `${clientUrl}/invite/accept/${token}`;
  const rejectUrl = `${clientUrl}/invite/reject/${token}`;
  const roleName  = role === 'admin' ? 'Admin' : 'Member';

  try {
    const resend = getResendClient();

    if (!resend) {
      // Dev mode — log to console instead of sending
      console.log('\n[EMAIL — DEV MODE] Invitation email (not sent, RESEND_API_KEY not configured)');
      console.log(`  To:     ${toEmail}`);
      console.log(`  Inviter:${inviterName}  Project: ${projectName}  Role: ${role}`);
      console.log(`  Accept: ${acceptUrl}`);
      console.log(`  Reject: ${rejectUrl}\n`);
      return;
    }

    const html = buildInvitationHtml({ inviterName, projectName, roleName, acceptUrl, rejectUrl });

    const { data, error } = await resend.emails.send({
      from:    getFromAddress(),
      to:      toEmail,
      subject: `[Project Manager] ${inviterName} mời bạn tham gia "${projectName}"`,
      html,
    });

    if (error) throw new Error(error.message || JSON.stringify(error));

    console.log(`[EMAIL] Invitation sent to ${toEmail} (id: ${data?.id})`);
  } catch (error) {
    console.error(`[EMAIL] Failed to send invitation to ${toEmail}:`, error.message);
    console.error(error.stack);
  }
};
