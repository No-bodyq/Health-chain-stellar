/**
 * Schema Snapshot Matcher
 *
 * Validates responses against frozen schema snapshots to detect:
 * - Breaking field changes (removed, renamed, type changes)
 * - Breaking field validation changes (required → optional, etc.)
 * - Response structure mutations
 *
 * Failures indicate breaking API changes that need explicit review.
 */

export interface SchemaSnapshot {
  name: string;
  version: string;
  timestamp: string;
  schema: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Extract schema from a response object
 */
export function extractSchema(data: any, maxDepth = 5): Record<string, any> {
  if (maxDepth === 0) return { type: 'depth_limit' };

  if (data === null) return { type: 'null' };
  if (data === undefined) return { type: 'undefined' };

  const type = Array.isArray(data) ? 'array' : typeof data;

  if (type === 'object') {
    const schema: Record<string, any> = {
      type: 'object',
      properties: {},
      required: Object.keys(data).filter((k) => data[k] !== undefined),
    };

    for (const [key, value] of Object.entries(data)) {
      schema.properties[key] = extractSchema(value, maxDepth - 1);
    }

    return schema;
  }

  if (type === 'array') {
    const arraySchema: Record<string, any> = {
      type: 'array',
    };

    if (data.length > 0) {
      // Infer item schema from first element (assumes homogeneous arrays)
      arraySchema.items = extractSchema(data[0], maxDepth - 1);
    }

    return arraySchema;
  }

  return { type, value: typeof data === 'string' ? `"${data}"` : data };
}

/**
 * Validate response against a frozen schema snapshot
 *
 * Strict validation: any schema deviation is considered breaking
 */
export function validateAgainstSnapshot(
  response: any,
  snapshot: SchemaSnapshot,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const currentSchema = extractSchema(response);

  // Check required fields haven't changed (breaking)
  const requiredFields = currentSchema.required || [];
  const snapshotRequired = snapshot.schema.required || [];

  for (const field of snapshotRequired) {
    if (!requiredFields.includes(field)) {
      errors.push(
        `BREAKING: Required field '${field}' is no longer required in snapshot v${snapshot.version}`,
      );
    }
  }

  // Check for new required fields (breaking to consumers)
  for (const field of requiredFields) {
    if (!snapshotRequired.includes(field)) {
      errors.push(
        `BREAKING: New required field '${field}' added; may break existing consumers`,
      );
    }
  }

  // Check for removed fields (breaking to consumers reading them)
  const snapshotFields = Object.keys(snapshot.schema.properties || {});
  const currentFields = Object.keys(currentSchema.properties || {});

  for (const field of snapshotFields) {
    if (!currentFields.includes(field)) {
      errors.push(
        `BREAKING: Field '${field}' removed from snapshot v${snapshot.version}`,
      );
    }
  }

  // Check for type changes on existing fields (breaking)
  for (const field of currentFields) {
    if (snapshotFields.includes(field)) {
      const snapshotFieldType = snapshot.schema.properties[field]?.type;
      const currentFieldType = currentSchema.properties[field]?.type;

      if (snapshotFieldType && currentFieldType !== snapshotFieldType) {
        errors.push(
          `BREAKING: Field '${field}' type changed from '${snapshotFieldType}' to '${currentFieldType}'`,
        );
      }
    } else {
      warnings.push(
        `INFO: New field '${field}' added to response (may be non-breaking if optional)`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Create a new schema snapshot (typically during setup)
 */
export function createSnapshot(
  name: string,
  version: string,
  data: any,
): SchemaSnapshot {
  return {
    name,
    version,
    timestamp: new Date().toISOString(),
    schema: extractSchema(data),
  };
}
