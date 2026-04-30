/**
 * Interpreter HTML is model-generated and rendered with dangerouslySetInnerHTML.
 * Strip tags and patterns that cause mixed-content warnings or XSS on HTTPS pages.
 */
export function sanitizeInterpreterHtml(html: string): string {
  let s = html;
  s = s.replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "");
  s = s.replace(/<\s*script\b[^>]*\/?>/gi, "");
  s = s.replace(/<\s*iframe\b[^>]*>[\s\S]*?<\s*\/\s*iframe\s*>/gi, "");
  s = s.replace(/<\s*iframe\b[^>]*\/?>/gi, "");
  s = s.replace(/<\s*object\b[^>]*>[\s\S]*?<\s*\/\s*object\s*>/gi, "");
  s = s.replace(/<\s*embed\b[^>]*>/gi, "");
  s = s.replace(/<\s*img\b[^>]*>/gi, "");
  s = s.replace(/<\s*link\b[^>]*>/gi, "");
  s = s.replace(/<\s*meta\b[^>]*>/gi, "");
  s = s.replace(/<\s*base\b[^>]*>/gi, "");
  s = s.replace(/<\s*style\b[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, "");
  s = s.replace(/<\s*svg\b[\s\S]*?<\s*\/\s*svg\s*>/gi, "");
  s = s.replace(/<\s*video\b[\s\S]*?<\s*\/\s*video\s*>/gi, "");
  s = s.replace(/<\s*audio\b[\s\S]*?<\s*\/\s*audio\s*>/gi, "");
  // Inline styles can reference url(http://...) and downgrade HTTPS pages.
  s = s.replace(/\sstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  s = s.replace(/<\s*(\/?)\s*(p|em|strong|br)\b[^>]*>/gi, "<$1$2>");
  return s;
}
