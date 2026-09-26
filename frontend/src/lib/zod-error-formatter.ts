export interface FieldError {
  field: string;
  message: string;
}

export interface FormattedZodError {
  title: string;
  summary: string;
  fieldErrors: FieldError[];
}

/**
 * Recursively extracts and formats field errors from Zod format() or raw API error structures
 */
export function formatZodApiError(errorData: any): FormattedZodError {
  const fieldErrors: FieldError[] = [];
  let summary = 'Please correct the highlighted fields below.';

  if (!errorData) {
    return {
      title: 'Validation Error',
      summary: 'An unknown validation error occurred.',
      fieldErrors: [],
    };
  }

  // 1. If errors object is from Zod .format()
  if (errorData.errors && typeof errorData.errors === 'object') {
    extractFromZodFormat(errorData.errors, '', fieldErrors);
  } else if (Array.isArray(errorData.details)) {
    // 2. If details array with { path / field, message }
    errorData.details.forEach((d: any) => {
      const field = Array.isArray(d.path) ? d.path.join('.') : d.field || d.path || 'Field';
      fieldErrors.push({
        field: prettifyFieldName(String(field)),
        message: d.message || 'Invalid value',
      });
    });
  } else if (Array.isArray(errorData.issues)) {
    // 3. Raw Zod issues array
    errorData.issues.forEach((issue: any) => {
      const field = issue.path ? issue.path.join('.') : 'Field';
      fieldErrors.push({
        field: prettifyFieldName(String(field)),
        message: issue.message || 'Validation failed',
      });
    });
  } else if (typeof errorData === 'object') {
    extractFromZodFormat(errorData, '', fieldErrors);
  }

  if (errorData.message && typeof errorData.message === 'string') {
    summary = errorData.message;
  }

  return {
    title: errorData.message || 'Form Validation Failed',
    summary,
    fieldErrors,
  };
}

function extractFromZodFormat(obj: any, prefix: string, acc: FieldError[]) {
  if (!obj || typeof obj !== 'object') return;

  if (Array.isArray(obj._errors) && obj._errors.length > 0) {
    obj._errors.forEach((msg: string) => {
      acc.push({
        field: prefix ? prettifyFieldName(prefix) : 'General',
        message: msg,
      });
    });
  }

  Object.entries(obj).forEach(([key, val]) => {
    if (key === '_errors') return;
    const nextPrefix = prefix ? (isNaN(Number(key)) ? `${prefix}.${key}` : `${prefix}[#${Number(key) + 1}]`) : key;
    extractFromZodFormat(val, nextPrefix, acc);
  });
}

function prettifyFieldName(field: string): string {
  // e.g. "items[#1].productId" -> "Line Item #1 Product"
  // "supplierName" -> "Supplier Name"
  // "destinationWarehouseId" -> "Destination Warehouse"
  return field
    .replace(/items\[#(\d+)\]\.productId/g, 'Line Item #$1 Product')
    .replace(/items\[#(\d+)\]\.quantity/g, 'Line Item #$1 Quantity')
    .replace(/items\[#(\d+)\]\.qtyOrdered/g, 'Line Item #$1 Ordered Qty')
    .replace(/items\[#(\d+)\]\.qtyExpected/g, 'Line Item #$1 Expected Qty')
    .replace(/items\[#(\d+)\]/g, 'Line Item #$1')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/\bId\b/g, '')
    .trim();
}
