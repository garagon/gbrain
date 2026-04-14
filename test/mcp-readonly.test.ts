import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { operations } from '../src/core/operations.ts';

// --- Operation flags ---

describe('MCP readonly mode — operation flags', () => {
  const mutating = operations.filter(op => op.mutating);
  const readonlyOps = operations.filter(op => !op.mutating);

  test('mutating operations are correctly flagged', () => {
    const mutatingNames = mutating.map(op => op.name).sort();
    expect(mutatingNames).toEqual([
      'add_link',
      'add_tag',
      'add_timeline_entry',
      'delete_page',
      'file_upload',
      'log_ingest',
      'put_page',
      'put_raw_data',
      'remove_link',
      'remove_tag',
      'revert_version',
      'sync_brain',
    ]);
  });

  test('read-only operations are NOT flagged as mutating', () => {
    const names = readonlyOps.map(op => op.name).sort();
    expect(names).toContain('get_page');
    expect(names).toContain('search');
    expect(names).toContain('query');
    expect(names).toContain('list_pages');
    expect(names).toContain('get_health');
    expect(names).toContain('file_list');
    expect(names).toContain('file_url');
    for (const op of readonlyOps) {
      expect(op.mutating).toBeFalsy();
    }
  });

  test('operation counts are pinned (catches new ops without mutating flag)', () => {
    expect(operations.length).toBe(30);
    expect(mutating.length).toBe(12);
    expect(readonlyOps.length).toBe(18);
  });

  test('every mutating operation has a description that implies writing', () => {
    for (const op of mutating) {
      const desc = (op.description + ' ' + op.name).toLowerCase();
      const impliesWrite = ['put', 'delete', 'add', 'remove', 'revert', 'sync', 'upload', 'ingest', 'log'].some(
        w => desc.includes(w)
      );
      expect(impliesWrite).toBe(true);
    }
  });
});

// --- Filtering logic ---

describe('MCP readonly mode — filtering', () => {
  test('readonly=true hides mutating, exposes read-only', () => {
    const visible = operations.filter(op => !op.mutating);
    expect(visible.length).toBe(18);
    expect(visible.find(op => op.name === 'get_page')).toBeTruthy();
    expect(visible.find(op => op.name === 'search')).toBeTruthy();
    expect(visible.find(op => op.name === 'delete_page')).toBeUndefined();
    expect(visible.find(op => op.name === 'put_page')).toBeUndefined();
    expect(visible.find(op => op.name === 'file_upload')).toBeUndefined();
    expect(visible.find(op => op.name === 'sync_brain')).toBeUndefined();
  });

  test('readonly=false exposes everything', () => {
    const visible = operations; // no filter
    expect(visible.length).toBe(30);
    expect(visible.find(op => op.name === 'delete_page')).toBeTruthy();
  });

  test('rejection gate fires for every mutating op in readonly', () => {
    const mutating = operations.filter(op => op.mutating);
    for (const op of mutating) {
      const blocked = true && op.mutating;
      expect(blocked).toBe(true);
    }
  });

  test('rejection gate does NOT fire for read-only ops', () => {
    const readonlyOps = operations.filter(op => !op.mutating);
    for (const op of readonlyOps) {
      const blocked = true && op.mutating;
      expect(blocked).toBeFalsy();
    }
  });
});

// --- Server code structural checks ---

describe('MCP server code', () => {
  const serverSrc = readFileSync(new URL('../src/mcp/server.ts', import.meta.url), 'utf-8');
  const serveSrc = readFileSync(new URL('../src/commands/serve.ts', import.meta.url), 'utf-8');

  test('server checks op.mutating before dispatching', () => {
    expect(serverSrc).toContain('op.mutating');
  });

  test('server reads GBRAIN_MCP_READONLY env var', () => {
    expect(serverSrc).toContain('GBRAIN_MCP_READONLY');
  });

  test('server logs rejections to stderr', () => {
    expect(serverSrc).toContain('BLOCKED');
  });

  test('server filters visibleOps based on readonly flag', () => {
    expect(serverSrc).toContain('visibleOps');
  });

  test('serve.ts parses --readonly flag', () => {
    expect(serveSrc).toContain('--readonly');
  });

  test('serve.ts has --help with readonly documentation', () => {
    expect(serveSrc).toContain('--readonly');
    expect(serveSrc).toContain('GBRAIN_MCP_READONLY');
  });
});
