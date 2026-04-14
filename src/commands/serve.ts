import type { BrainEngine } from '../core/engine.ts';
import { startMcpServer } from '../mcp/server.ts';

// stderr because stdout is reserved for the MCP JSON-RPC protocol
function log(msg: string) {
  process.stderr.write(msg + '\n');
}

export async function runServe(engine: BrainEngine, args: string[] = []) {
  // Only pass readonly: true when the flag is explicitly set.
  // Passing false would block the env var fallback in startMcpServer
  // because ?? doesn't fall through on false, only on undefined.
  const readonly = args.includes('--readonly') ? true : undefined;

  if (args.includes('--help') || args.includes('-h')) {
    log('Usage: gbrain serve [--readonly]');
    log('');
    log('Start the MCP server over stdio. Connect from Claude Desktop,');
    log('Cursor, or any MCP-compatible client.');
    log('');
    log('Options:');
    log('  --readonly   Hide mutating operations (put_page, delete_page, etc.).');
    log('               Read-only clients can connect without risking writes.');
    log('               Also settable via GBRAIN_MCP_READONLY=1 env var.');
    return;
  }

  await startMcpServer(engine, { readonly });
}
