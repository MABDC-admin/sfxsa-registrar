import express from 'express';
import pool from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Parse Supabase-style query parameters
function parseQueryParams(query) {
  const filters = [];
  const values = [];
  let valueIndex = 1;
  let selectColumns = '*';
  let orderBy = null;
  let limit = null;
  let offset = null;

  for (const [key, value] of Object.entries(query)) {
    if (key === 'select') {
      selectColumns = value;
      continue;
    }
    if (key === 'order') {
      const parts = value.split('.');
      const column = parts[0];
      const direction = parts[1] === 'desc' ? 'DESC' : 'ASC';
      orderBy = `"${column}" ${direction}`;
      continue;
    }
    if (key === 'limit') {
      limit = parseInt(value);
      continue;
    }
    if (key === 'offset') {
      offset = parseInt(value);
      continue;
    }

    // Handle filters like column=eq.value, column=gt.value, etc.
    const match = value.match(/^(eq|neq|gt|gte|lt|lte|like|ilike|in|is)\.(.+)$/);
    if (match) {
      const [, operator, filterValue] = match;
      let sqlOperator;
      let processedValue = filterValue;

      switch (operator) {
        case 'eq':
          sqlOperator = '=';
          break;
        case 'neq':
          sqlOperator = '!=';
          break;
        case 'gt':
          sqlOperator = '>';
          break;
        case 'gte':
          sqlOperator = '>=';
          break;
        case 'lt':
          sqlOperator = '<';
          break;
        case 'lte':
          sqlOperator = '<=';
          break;
        case 'like':
          sqlOperator = 'LIKE';
          break;
        case 'ilike':
          sqlOperator = 'ILIKE';
          break;
        case 'in':
          sqlOperator = 'IN';
          processedValue = filterValue.replace(/^\(|\)$/g, '').split(',');
          break;
        case 'is':
          if (filterValue === 'null') {
            filters.push(`"${key}" IS NULL`);
            continue;
          } else if (filterValue === 'not.null') {
            filters.push(`"${key}" IS NOT NULL`);
            continue;
          }
          break;
        default:
          sqlOperator = '=';
      }

      if (operator === 'in') {
        const placeholders = processedValue.map(() => `$${valueIndex++}`).join(', ');
        filters.push(`"${key}" IN (${placeholders})`);
        values.push(...processedValue);
      } else {
        filters.push(`"${key}" ${sqlOperator} $${valueIndex++}`);
        values.push(processedValue);
      }
    }
  }

  return { selectColumns, filters, values, orderBy, limit, offset };
}

// GET - Select from table
router.get('/:table', optionalAuth, async (req, res) => {
  try {
    const { table } = req.params;
    const { selectColumns, filters, values, orderBy, limit, offset } = parseQueryParams(req.query);

    // Handle count queries
    const prefer = req.headers['prefer'];
    const countOnly = prefer && prefer.includes('count=exact');
    const headOnly = req.query.head === 'true';

    let sql = `SELECT ${selectColumns} FROM "${table}"`;

    if (filters.length > 0) {
      sql += ` WHERE ${filters.join(' AND ')}`;
    }

    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }

    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    if (offset) {
      sql += ` OFFSET ${offset}`;
    }

    const result = await pool.query(sql, values);

    // Handle count header
    if (countOnly || headOnly) {
      const countSql = `SELECT COUNT(*) FROM "${table}"${filters.length > 0 ? ` WHERE ${filters.join(' AND ')}` : ''}`;
      const countResult = await pool.query(countSql, values);
      res.set('Content-Range', `0-${result.rows.length}/${countResult.rows[0].count}`);
      
      if (headOnly) {
        return res.json({ count: parseInt(countResult.rows[0].count) });
      }
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Select error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST - Insert into table
router.post('/:table', optionalAuth, async (req, res) => {
  try {
    const { table } = req.params;
    const data = req.body;
    const prefer = req.headers['prefer'];
    const returnData = prefer && prefer.includes('return=representation');
    const isUpsert = prefer && prefer.includes('resolution=merge-duplicates');
    const onConflict = req.query.on_conflict;

    // Handle array of records
    const records = Array.isArray(data) ? data : [data];
    const insertedRows = [];

    for (const record of records) {
      const columns = Object.keys(record);
      const values = Object.values(record);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

      let sql = `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')})
                 VALUES (${placeholders})`;
      
      if (isUpsert && onConflict) {
        const updateClause = columns
          .filter(c => !onConflict.split(',').includes(c))
          .map(c => `"${c}" = EXCLUDED."${c}"`)
          .join(', ');
        
        if (updateClause) {
          sql += ` ON CONFLICT (${onConflict.split(',').map(c => `"${c.trim()}"`).join(', ')}) 
                   DO UPDATE SET ${updateClause}`;
        } else {
          sql += ` ON CONFLICT (${onConflict.split(',').map(c => `"${c.trim()}"`).join(', ')}) 
                   DO NOTHING`;
        }
      }

      sql += ` RETURNING *`;

      const result = await pool.query(sql, values);
      insertedRows.push(result.rows[0]);
    }

    if (returnData) {
      res.status(201).json(Array.isArray(data) ? insertedRows : insertedRows[0]);
    } else {
      res.status(201).json({ success: true });
    }
  } catch (error) {
    console.error('Insert error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH - Update table
router.patch('/:table', optionalAuth, async (req, res) => {
  try {
    const { table } = req.params;
    const data = req.body;
    const prefer = req.headers['prefer'];
    const returnData = prefer && prefer.includes('return=representation');

    const { filters, values: filterValues } = parseQueryParams(req.query);

    if (filters.length === 0) {
      return res.status(400).json({ error: 'Update requires at least one filter' });
    }

    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, i) => `"${col}" = $${i + 1}`).join(', ');

    const filterClause = filters.map((f, i) => {
      // Adjust parameter indices for filter values
      return f.replace(/\$\d+/g, () => `$${columns.length + i + 1}`);
    }).join(' AND ');

    const sql = `UPDATE "${table}" SET ${setClause} WHERE ${filterClause} RETURNING *`;

    const result = await pool.query(sql, [...values, ...filterValues]);

    if (returnData) {
      res.json(result.rows);
    } else {
      res.json({ success: true, count: result.rowCount });
    }
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Delete from table
router.delete('/:table', optionalAuth, async (req, res) => {
  try {
    const { table } = req.params;
    const { filters, values } = parseQueryParams(req.query);

    if (filters.length === 0) {
      return res.status(400).json({ error: 'Delete requires at least one filter' });
    }

    const sql = `DELETE FROM "${table}" WHERE ${filters.join(' AND ')} RETURNING *`;
    const result = await pool.query(sql, values);

    res.json(result.rows);
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// RPC - Call stored procedures/functions
router.post('/rpc/:function', optionalAuth, async (req, res) => {
  try {
    const { function: funcName } = req.params;
    const params = req.body;

    const paramNames = Object.keys(params);
    const paramValues = Object.values(params);
    const paramPlaceholders = paramNames.map((name, i) => `${name} := $${i + 1}`).join(', ');

    const sql = `SELECT * FROM "${funcName}"(${paramPlaceholders})`;
    const result = await pool.query(sql, paramValues);

    res.json(result.rows);
  } catch (error) {
    console.error('RPC error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
