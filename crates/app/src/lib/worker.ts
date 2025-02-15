/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ComponentExportFunction,
  Field,
  Typ,
  TypeField,
} from '@/types/component.ts';

function buildJsonSkeleton(field: Field): any {
  const { type, fields, cases, names } = field.typ;
  switch (type) {
    case 'Str':
    case 'Chr':
      return '';

    case 'Bool':
      return false;

    case 'F64':
    case 'F32':
    case 'U64':
    case 'S64':
    case 'U32':
    case 'S32':
    case 'U16':
    case 'S16':
    case 'U8':
    case 'S8':
      return 0;

    case 'Record': {
      const obj: Record<string, any> = {};
      fields?.forEach((subField: Field) => {
        obj[subField.name] = buildJsonSkeleton(subField);
      });
      return obj;
    }

    case 'Tuple': {
      if (!fields) return [];
      return fields.map((subField: Field) => buildJsonSkeleton(subField));
    }

    case 'List': {
      return [];
    }

    case 'Option': {
      return null;
    }

    case 'Flags': {
      return names ? [names[0]] : [];
    }

    case 'Enum': {
      return cases ? cases[0] : '';
    }

    case 'Variant': {
      if (!cases || cases.length === 0) return null;
      const selectedCase = cases[0];
      if (typeof selectedCase !== 'object' || !selectedCase.typ) return null;
      return { [selectedCase.name]: buildJsonSkeleton(selectedCase) };
    }

    case 'Result': {
      return {
        ok:
          field.typ && field.typ.ok
            ? buildJsonSkeleton({
                ...field.typ.ok,
                typ: field.typ.ok,
                name: '',
              })
            : null,
        err: cases ? `enum (${cases.map((c: any) => c.name).join(', ')})` : '',
      };
    }

    default:
      return null;
  }
}

/**
 * Convert a component function’s parameter definition
 * into a default JSON array for user editing.
 */
export function parseToJsonEditor(data: ComponentExportFunction) {
  return data.parameters.map(param => buildJsonSkeleton(param));
}

export function safeFormatJSON(input: string): string {
  try {
    const parsed = JSON.parse(input);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return input; // Return as-is if parse fails
  }
}

export function getCaretCoordinates(
  element: HTMLTextAreaElement,
  position: number,
) {
  const div = document.createElement('div');
  const styles = getComputedStyle(element);
  const properties = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
    'MozTabSize',
  ];

  div.id = 'input-textarea-caret-position-mirror-div';
  document.body.appendChild(div);

  const style = div.style;
  style.whiteSpace = 'pre-wrap';
  style.wordWrap = 'break-word';
  style.position = 'absolute';
  style.visibility = 'hidden';

  properties.forEach((prop: string) => {
    if (
      Object.prototype.hasOwnProperty.call(styles as Record<string, any>, prop)
    ) {
      style.setProperty(prop, (styles as Record<string, any>)[prop]);
    }
  });

  div.textContent = element.value.substring(0, position);
  const span = document.createElement('span');
  span.textContent = element.value.substring(position) || '.';
  div.appendChild(span);

  const coordinates = {
    top: span.offsetTop + Number.parseInt(styles['borderTopWidth']),
    left: span.offsetLeft + Number.parseInt(styles['borderLeftWidth']),
    height: Number.parseInt(styles['lineHeight']),
  };

  document.body.removeChild(div);

  return coordinates;
}

function parseType(typ: any): any {
  if (!typ) {
    return 'null';
  }

  const typeMap = {
    Bool: 'bool',
    S8: 'i8',
    S16: 'i16',
    S32: 'i32',
    S64: 'i64',
    U8: 'u8',
    U16: 'u16',
    U32: 'u32',
    U64: 'U64',
    F32: 'f32',
    F64: 'f64',
    Char: 'char',
    Str: 'string',
  };

  if (typeMap[typ.type as keyof typeof typeMap]) {
    return typeMap[typ.type as keyof typeof typeMap];
  }

  switch (typ.type) {
    case 'List': {
      return `List<${parseType(typ.inner)}>`;
    }
    case 'Flags': {
      return `flags (${typ.names.join(', ')})`;
    }
    case 'Option': {
      return `Option<${JSON.stringify(parseType(typ.inner))}>`;
    }
    case 'Result': {
      return {
        ok: parseType(typ.ok.inner),
        err: `enum (${typ.err.cases.join(', ')})`,
      };
    }
    case 'Record': {
      const result: Record<string, any> = {};
      (typ.fields || []).forEach((field: { name: string; typ: any }) => {
        result[field.name] = parseType(field.typ);
      });
      return result;
    }
    case 'Enum': {
      return `enum (${typ.cases.join(', ')})`;
    }
    case 'Variant': {
      const variantCases: Record<string | number, any> = {};
      (typ.cases || []).forEach(
        (variant: { name: string | number; typ: any }) => {
          variantCases[variant.name] = parseType(variant.typ);
        },
      );
      return variantCases;
    }
    default:
      return 'unknown';
  }
}

export function parseTooltipTypesData(data: ComponentExportFunction) {
  const result: { name: string; datatype: any }[] = [];

  data.parameters.forEach(item => {
    if (item.type === 'Result') {
      result.push(parseType(item));
    } else if (item.typ.type === 'Record') {
      result.push(parseType(item.typ));
    } else {
      result.push(parseType(item.typ));
    }
  });

  return result;
}

export function parseTypesData(input: any): any {
  function transformType(typ: any): any {
    if (!typ || typeof typ !== 'object') return typ;

    switch (typ.type) {
      case 'Str':
      case 'Bool':
      case 'S8':
      case 'S16':
      case 'S32':
      case 'S64':
      case 'U8':
      case 'U16':
      case 'U32':
      case 'U64':
      case 'F32':
      case 'F64':
      case 'Char':
        return { type: typ.type };

      case 'List':
        return { type: 'List', inner: transformType(typ.inner) };

      case 'Option':
        return { type: 'Option', inner: transformType(typ.inner) };

      case 'Enum':
        return { type: 'Enum', cases: typ.cases };

      case 'Flags':
        return { type: 'Flags', names: typ.names };

      case 'Record':
        return {
          type: 'Record',
          fields: (typ.fields || []).map((field: any) => ({
            name: field.name,
            typ: transformType(field.typ),
          })),
        };

      case 'Variant':
        return {
          type: 'Variant',
          cases: (typ.cases || []).map((variant: any) => ({
            name: variant.name,
            typ: transformType(variant.typ),
          })),
        };

      case 'Result':
        return {
          type: 'Result',
          ok: transformType(typ.ok),
          err: transformType(typ.err),
        };

      case 'Tuple':
        return {
          type: 'Tuple',
          items: (typ.items || []).map((item: any) => transformType(item)),
        };

      default:
        return { type: 'Unknown' };
    }
  }

  return {
    typ: {
      type: 'Tuple',
      items: input.parameters.map((param: any) => transformType(param.typ)),
    },
  };
}

export function validateJsonStructure(
  data: any,
  field: TypeField,
): string | null {
  const { type, fields, cases, names } = field.typ;

  switch (type) {
    case 'Str':
    case 'Chr':
      if (typeof data !== 'string') {
        return `Expected a string for field "${field.name}", but got ${typeof data}`;
      }
      break;

    case 'Bool':
      if (typeof data !== 'boolean') {
        return `Expected a boolean for field "${field.name}", but got ${typeof data}`;
      }
      break;

    case 'F64':
    case 'F32':
    case 'U64':
    case 'S64':
    case 'U32':
    case 'S32':
    case 'U16':
    case 'S16':
    case 'U8':
    case 'S8':
      if (typeof data !== 'number') {
        return `Expected a number for field "${field.name}", but got ${typeof data}`;
      }
      break;

    case 'Record': {
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return `Expected an object for field "${field.name}", but got ${typeof data}`;
      }
      if (!fields) break;
      for (const subField of fields) {
        const error = validateJsonStructure(data[subField.name], subField);
        if (error) return error;
      }
      break;
    }

    case 'Tuple': {
      if (!Array.isArray(data)) {
        return `Expected an array for field "${field.name}", but got ${typeof data}`;
      }
      if (!fields) break;
      if (data.length !== fields.length) {
        return `Expected ${fields.length} elements in tuple for field "${field.name}", but got ${data.length}`;
      }
      for (let i = 0; i < fields.length; i++) {
        const error = validateJsonStructure(data[i], fields[i]);
        if (error) return error;
      }
      break;
    }

    case 'List': {
      if (!Array.isArray(data)) {
        return `Expected an array for field "${field.name}", but got ${typeof data}`;
      }
      break;
    }

    case 'Option': {
      if (data !== null && data !== undefined) {
        const error = validateJsonStructure(data, {
          ...field,
          typ: field.typ.inner!,
        });
        if (error) return error;
      }
      break;
    }

    case 'Flags': {
      if (!Array.isArray(data)) {
        return `Expected an array for field "${field.name}", but got ${typeof data}`;
      }
      if (names && !data.every(item => names.includes(item))) {
        return `Expected flags to be one of [${names.join(', ')}] for field "${field.name}"`;
      }
      break;
    }

    case 'Enum': {
      if (cases && !cases.includes(data)) {
        return `Expected enum value to be one of [${cases.join(', ')}] for field "${field.name}"`;
      }
      break;
    }

    case 'Variant': {
      if (!cases || cases.length === 0) break;
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return `Expected an object for field "${field.name}", but got ${typeof data}`;
      }
      const caseNames = cases.map(c => (typeof c === 'string' ? c : c.name));
      const selectedCase = Object.keys(data)[0];
      if (!caseNames.includes(selectedCase)) {
        return `Expected variant to be one of [${caseNames.join(', ')}] for field "${field.name}"`;
      }
      const selectedCaseField = cases.find(
        (c): c is { name: string; typ: Typ } =>
          typeof c !== 'string' && c.name === selectedCase,
      );
      if (selectedCaseField) {
        const error = validateJsonStructure(
          data[selectedCase],
          selectedCaseField,
        );
        if (error) return error;
      }
      break;
    }

    case 'Result': {
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return `Expected an object for field "${field.name}", but got ${typeof data}`;
      }
      if (data.ok !== null && data.ok !== undefined) {
        const error = validateJsonStructure(data.ok, {
          ...field,
          typ: field.typ.ok!,
          name: '',
        });
        if (error) return error;
      }
      if (data.err !== null && data.err !== undefined) {
        if (typeof data.err !== 'string') {
          return `Expected a string for field "${field.name}.err", but got ${typeof data.err}`;
        }
      }
      break;
    }

    default:
      return `Unknown type "${type}" for field "${field.name}"`;
  }

  return null; // No error
}
