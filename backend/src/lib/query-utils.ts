/**
 * Query parameter validation utilities for API endpoints
 */

import type { ParsedQs } from 'qs';

export type RiskLevel = 'critical' | 'high' | 'moderate' | 'low';

export interface PaginationParams {
  limit: number;
  offset: number;
  packageId: string | null;
  riskLevels: RiskLevel[] | null;
}

export type PaginationValidationResult =
  | { success: true; params: PaginationParams }
  | { success: false; error: string };

type QueryValue = string | ParsedQs | Array<string | ParsedQs> | undefined;

function getFirstQueryValue(param: QueryValue): { value?: string; provided: boolean } {
  if (typeof param === 'string') {
    return { value: param, provided: true };
  }

  if (Array.isArray(param)) {
    for (const item of param) {
      if (typeof item === 'string') {
        return { value: item, provided: true };
      }
    }
    return { provided: param.length > 0 };
  }

  return { provided: typeof param !== 'undefined' };
}

/**
 * Validate and parse pagination query parameters.
 * Returns a union indicating success or failure so callers can send 400 responses on bad input.
 */
function getQueryValues(param: QueryValue): { values: string[]; provided: boolean } {
  if (typeof param === 'string') {
    return { values: [param], provided: true };
  }

  if (Array.isArray(param)) {
    const values: string[] = [];
    let provided = false;
    for (const item of param) {
      provided = true;
      if (typeof item === 'string') {
        values.push(item);
      }
    }
    return { values, provided };
  }

  return { values: [], provided: typeof param !== 'undefined' };
}

const VALID_RISK_LEVELS: RiskLevel[] = ['critical', 'high', 'moderate', 'low'];
const VALID_RISK_LEVEL_SET = new Set<RiskLevel>(VALID_RISK_LEVELS);

export function validatePaginationParams(
  limitParam: QueryValue,
  offsetParam: QueryValue,
  packageIdParam: QueryValue,
  riskLevelsParam?: QueryValue
): PaginationValidationResult {
  const errors: string[] = [];

  // Defaults
  let limit = 50;
  let offset = 0;
  let packageId: string | null = null;
  let riskLevels: RiskLevel[] | null = null;

  const { value: limitStr, provided: limitProvided } = getFirstQueryValue(limitParam);
  if (limitStr === '') {
    errors.push('limit must be a number between 1 and 200');
  } else if (typeof limitStr === 'string') {
    const parsedLimit = Number.parseInt(limitStr, 10);
    if (Number.isNaN(parsedLimit)) {
      errors.push('limit must be a number between 1 and 200');
    } else {
      limit = Math.min(Math.max(parsedLimit, 1), 200);
    }
  } else if (limitProvided) {
    errors.push('limit must be a number between 1 and 200');
  }

  const { value: offsetStr, provided: offsetProvided } = getFirstQueryValue(offsetParam);
  if (offsetStr === '') {
    errors.push('offset must be a non-negative number');
  } else if (typeof offsetStr === 'string') {
    const parsedOffset = Number.parseInt(offsetStr, 10);
    if (Number.isNaN(parsedOffset)) {
      errors.push('offset must be a non-negative number');
    } else {
      offset = Math.max(parsedOffset, 0);
    }
  } else if (offsetProvided) {
    errors.push('offset must be a non-negative number');
  }

  const { value: packageIdStr, provided: packageProvided } = getFirstQueryValue(packageIdParam);
  if (typeof packageIdStr === 'string') {
    const trimmed = packageIdStr.trim();
    packageId = trimmed.length > 0 ? trimmed : null;
  } else if (packageProvided) {
    errors.push('packageId must be a string');
  }

  if (riskLevelsParam) {
    const { values: riskLevelValues, provided } = getQueryValues(riskLevelsParam);
    if (provided) {
      const parsedLevels = new Set<RiskLevel>();
      riskLevelValues.forEach((value) => {
        value
          .split(',')
          .map((part) => part.trim().toLowerCase())
          .filter((part): part is RiskLevel => VALID_RISK_LEVEL_SET.has(part as RiskLevel))
          .forEach((level) => parsedLevels.add(level));
      });

      if (parsedLevels.size === 0) {
        errors.push('riskLevels must include at least one of: critical, high, moderate, low');
      } else if (parsedLevels.size === VALID_RISK_LEVELS.length) {
        // Treat selecting all levels the same as no filter to keep queries consistent
        riskLevels = null;
      } else {
        riskLevels = Array.from(parsedLevels);
      }
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: errors.join('; ')
    };
  }

  return {
    success: true,
    params: {
      limit,
      offset,
      packageId,
      riskLevels
    }
  };
}
