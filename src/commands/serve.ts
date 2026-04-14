import type { BrainEngine } from '../core/engine.ts';
import { startMcpServer } from '../mcp/server.ts';

export async function runServe(engine: BrainEngine, args: string[] = []) {
  const readonly = args.includes('--readonly');

  if (args.includes('--help') || args.includes('-h')) {
    console.error('Usage: gbrain serve [--readonly]');
    console.error('');
    console.error('Start the MCP server over stdio. Connect from Claude Desktop,');
    console.error('Cursor, or any MCP-compatible client.');
    console.error('');
    console.error('Options:');
    console.error('  --readonly   Hide mutating operations (put_page, delete_page, etc.).');
    console.error('               Read-only clients can connect without risking writes.');
    console.error('               Also settable via GBRAIN_MCP_READONLY=1 env var.');
    return;
  }

  await startMcpServer(engine, { readonly });
}
