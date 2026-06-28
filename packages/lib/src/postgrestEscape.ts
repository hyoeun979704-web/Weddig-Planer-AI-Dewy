// Escape helpers for PostgREST / Supabase queries.
//
// PostgREST's filter syntax has two distinct levels of escaping:
//
// 1. LIKE/ILIKE pattern wildcards — the SQL layer.
//    `%` matches any sequence, `_` matches a single char, `\` is the LIKE
//    escape char. User input that contains these chars must be escaped or
//    the query behaves as a wildcard search the user didn't ask for
//    (e.g. typing "50%" matches everything that starts with "50").
//
// 2. .or() / .and() filter string parsing — the URL layer.
//    PostgREST parses the .or() string as a comma-separated list of
//    conditions and uses parentheses for grouping. A user value that
//    contains `,`, `(`, or `)` breaks the parser → 400 error from the
//    server. The fix is to wrap the value in double quotes; commas and
//    parens inside quotes are literal. Quotes and backslashes inside the
//    value must themselves be escaped with backslash.

export function escapeLikePattern(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

export function quoteForOr(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}
