export const APP_NAME = 'Orderspace';

export function escapeHtml(value: string | number): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Base URL of the web app, used for links inside emails. */
export function appUrl(): string {
    return (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}

export function paragraph(text: string): string {
    return `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#374151;">${escapeHtml(text)}</p>`;
}

export function codeBlock(code: string): string {
    return `<p style="margin:0 0 16px;font-size:28px;letter-spacing:6px;font-weight:700;color:#111827;">${escapeHtml(code)}</p>`;
}

export function button(label: string, href: string): string {
    return `<p style="margin:0 0 16px;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;">${escapeHtml(label)}</a></p>`;
}

export function table(headers: string[], rows: Array<Array<string | number>>): string {
    const head = headers
        .map(
            (h) =>
                `<th align="left" style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">${escapeHtml(h)}</th>`,
        )
        .join('');
    const body = rows
        .map(
            (row) =>
                `<tr>${row
                    .map(
                        (cell) =>
                            `<td style="padding:8px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;">${escapeHtml(cell)}</td>`,
                    )
                    .join('')}</tr>`,
        )
        .join('');
    return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px;"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function renderLayout(options: {
    title: string;
    preheader?: string;
    bodyHtml: string;
}): string {
    const { title, preheader = '', bodyHtml } = options;
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:8px;padding:32px;">
<tr><td>
<h1 style="margin:0 0 24px;font-size:20px;color:#111827;">${escapeHtml(APP_NAME)}</h1>
<h2 style="margin:0 0 16px;font-size:18px;color:#111827;">${escapeHtml(title)}</h2>
${bodyHtml}
<p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Sent by ${escapeHtml(APP_NAME)}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}