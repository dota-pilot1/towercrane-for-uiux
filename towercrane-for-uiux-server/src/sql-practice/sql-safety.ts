import { BadRequestException } from '@nestjs/common';
import type { SqlQueryType } from './sql-practice.types';

const BLOCKED_PATTERNS = [
  /\bATTACH\b/i,
  /\bDETACH\b/i,
  /\bLOAD_EXTENSION\s*\(/i,
  /\bVACUUM\s+INTO\b/i,
  /\bPRAGMA\s+writable_schema\b/i,
  /\bPRAGMA\s+journal_mode\b/i,
  /\bPRAGMA\s+database_list\b/i,
];

export type SanitizedSql = {
  query: string;
  type: SqlQueryType;
};

export function sanitizeSql(rawQuery: string, maxQueryLength: number): SanitizedSql {
  const query = removeTrailingSemicolon(rawQuery.trim());

  if (!query) {
    throw new BadRequestException('SQL query is required');
  }

  if (query.length > maxQueryLength) {
    throw new BadRequestException(`SQL query is too long. Max ${maxQueryLength} characters.`);
  }

  if (hasStatementSeparator(query)) {
    throw new BadRequestException('Only one SQL statement can be executed at a time.');
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(query)) {
      throw new BadRequestException('This SQL statement is not allowed in the practice database.');
    }
  }

  if (/\b(DROP|ALTER)\s+TABLE\s+["'`]?__sql_practice_/i.test(query)) {
    throw new BadRequestException('Internal SQL practice tables cannot be modified.');
  }

  const type = detectQueryType(query);

  return { query, type };
}

export function detectQueryType(query: string): SqlQueryType {
  const upper = query.trimStart().toUpperCase();

  if (upper.startsWith('SELECT') || upper.startsWith('WITH')) return 'SELECT';
  if (upper.startsWith('INSERT')) return 'INSERT';
  if (upper.startsWith('UPDATE')) return 'UPDATE';
  if (upper.startsWith('DELETE')) return 'DELETE';
  if (upper.startsWith('CREATE')) return 'CREATE';
  if (upper.startsWith('DROP')) return 'DROP';
  if (upper.startsWith('ALTER')) return 'ALTER';
  if (upper.startsWith('PRAGMA')) return 'PRAGMA';
  if (upper.startsWith('EXPLAIN')) return 'EXPLAIN';
  return 'OTHER';
}

function removeTrailingSemicolon(query: string) {
  let next = query;
  while (next.endsWith(';')) {
    next = next.slice(0, -1).trimEnd();
  }
  return next;
}

function hasStatementSeparator(query: string) {
  let quote: "'" | '"' | '`' | null = null;

  for (let index = 0; index < query.length; index += 1) {
    const char = query[index];
    const next = query[index + 1];

    if (!quote && char === '-' && next === '-') {
      while (index < query.length && query[index] !== '\n') index += 1;
      continue;
    }

    if (!quote && char === '/' && next === '*') {
      index += 2;
      while (index < query.length && !(query[index] === '*' && query[index + 1] === '/')) {
        index += 1;
      }
      index += 1;
      continue;
    }

    if (quote) {
      if (char === quote) {
        if (query[index + 1] === quote) {
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }

    if (char === ';') return true;
  }

  return false;
}
