import type { BrainEngine } from '../core/engine.ts';
import { startMcpServer } from '../mcp/server.ts';

// stderr because stdout is reserved for the MCP JSON-RPC protocol
function log(msg: string) {
  process.stderr.write(msg + '\n');
}

export async function runServe(engine: BrainEngine, args: string[] = []) {
  const readonly = args.includes('--readonly');

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
