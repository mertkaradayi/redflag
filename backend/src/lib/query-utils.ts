/**
 * Query parameter validation utilities for API endpoints
 */

import type { ParsedQs } from 'qs';

export interface PaginationParams {
  limit: number;
  offset: number;
  packageId: string | null;
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
export function validatePaginationParams(
  limitParam: QueryValue,
  offsetParam: QueryValue,
  packageIdParam: QueryValue
): PaginationValidationResult {
  const errors: string[] = [];

  // Defaults
  let limit = 50;
  let offset = 0;
  let packageId: string | null = null;

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
      packageId
    }
  };
}

