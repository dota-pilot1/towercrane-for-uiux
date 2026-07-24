import Database from 'better-sqlite3';

/**
 * .sql 스키마(여러 CREATE TABLE + FK)를 mermaid `erDiagram` 텍스트로 변환한다.
 *
 * 정규식 파싱 대신 `:memory:` sqlite에 실제로 실행한 뒤 PRAGMA로 인트로스펙션하므로
 * 컬럼 타입/PK/FK 관계를 정확히 반영한다. 스키마가 유효하지 않으면 예외를 던진다.
 */
export function sqlToMermaidErd(sql: string): string {
  const db = new Database(':memory:');
  try {
    db.pragma('foreign_keys = ON');
    db.exec(sql);

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as { name: string }[];

    const entityLines: string[] = [];
    const relationLines: string[] = [];

    for (const { name } of tables) {
      const entity = sanitizeIdent(name);
      const columns = db.prepare(`PRAGMA table_info("${name}")`).all() as {
        name: string;
        type: string;
        notnull: number;
        pk: number;
      }[];
      const foreignKeys = db
        .prepare(`PRAGMA foreign_key_list("${name}")`)
        .all() as { table: string; from: string; to: string }[];
      const fkColumns = new Set(foreignKeys.map((fk) => fk.from));

      entityLines.push(`  ${entity} {`);
      for (const column of columns) {
        const type = sanitizeType(column.type);
        const keyParts = [
          column.pk ? 'PK' : '',
          fkColumns.has(column.name) ? 'FK' : '',
        ].filter(Boolean);
        const key = keyParts.length > 0 ? ` ${keyParts.join(', ')}` : '';
        entityLines.push(`    ${type} ${sanitizeIdent(column.name)}${key}`);
      }
      entityLines.push('  }');

      for (const fk of foreignKeys) {
        // 자식(name)이 부모(fk.table)를 참조: 부모 ||--o{ 자식
        relationLines.push(
          `  ${sanitizeIdent(fk.table)} ||--o{ ${entity} : "${sanitizeLabel(fk.from)}"`,
        );
      }
    }

    return ['erDiagram', ...entityLines, ...relationLines].join('\n');
  } finally {
    db.close();
  }
}

/** mermaid 엔티티/속성 식별자는 영숫자/언더스코어만 허용. */
function sanitizeIdent(value: string): string {
  const cleaned = (value ?? '').replace(/[^A-Za-z0-9_]/g, '_');
  return cleaned.length > 0 ? cleaned : 'unknown';
}

/** 타입 토큰에서 공백/괄호 제거 (예: `VARCHAR(255)` → `VARCHAR255`). */
function sanitizeType(value: string): string {
  const cleaned = (value ?? '').replace(/[^A-Za-z0-9_]/g, '');
  return cleaned.length > 0 ? cleaned : 'text';
}

/** 관계 라벨(따옴표 안)에서 큰따옴표 제거. */
function sanitizeLabel(value: string): string {
  return (value ?? '').replace(/"/g, "'");
}
