/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentExportFunction, Field, Typ } from "@/types/component.ts";

function buildJsonSkeleton(field: Field): any {
  const { type, fields } = field.typ;
  switch (type) {
    case "Str":
    case "Chr":
      return "";

    case "Bool":
      return false;

    case "F64":
    case "F32":
    case "U64":
    case "S64":
    case "U32":
    case "S32":
    case "U16":
    case "S16":
    case "U8":
    case "S8":
      return 0;

    case "Record": {
      const obj: Record<string, any> = {};
      fields?.forEach((subField: Field) => {
        obj[subField.name] = buildJsonSkeleton(subField);
      });
      return obj;
    }

    case "Tuple": {
      if (!fields) return [];
      return fields.map((subField: Field) => buildJsonSkeleton(subField));
    }

    case "List": {
      return [];
    }

    case "Option": {
      return null;
    }

    case "Enum": {
      return "";
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
  return data.parameters.map((param) => buildJsonSkeleton(param));
}

/**
 * Converts user’s JSON input into the payload
 * format expected by the server.
 */
export function parseToApiPayload(
  input: any[],
  actionDefinition: ComponentExportFunction
) {
  const payload = { params: [] as Array<{ value: any; typ: Typ }> };

  const parseValue = (data: any, typeDef: Typ) => {
    switch (typeDef.type) {
      case "Str":
      case "Chr":
      case "Bool":
      case "F64":
      case "F32":
      case "U64":
      case "S64":
      case "U32":
      case "S32":
      case "U16":
      case "S16":
      case "U8":
      case "S8":
      case "Tuple":
      case "Record":
      case "Enum":
        return data;
      case "List":
        return Array.isArray(data) ? data : [data];
      default:
        throw new Error(`Unsupported type: ${typeDef.type}`);
    }
  };

  actionDefinition.parameters.forEach((param, index) => {
    // Each param is presumably an item in input
    const userValue = input[index];
    payload.params.push({
      value: parseValue(userValue, param.typ),
      typ: param.typ,
    });
  });

  return payload;
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
  position: number
) {
  const div = document.createElement("div");
  const styles = getComputedStyle(element);
  const properties = [
    "direction",
    "boxSizing",
    "width",
    "height",
    "overflowX",
    "overflowY",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "borderStyle",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontStyle",
    "fontVariant",
    "fontWeight",
    "fontStretch",
    "fontSize",
    "fontSizeAdjust",
    "lineHeight",
    "fontFamily",
    "textAlign",
    "textTransform",
    "textIndent",
    "textDecoration",
    "letterSpacing",
    "wordSpacing",
    "tabSize",
    "MozTabSize",
  ];

  div.id = "input-textarea-caret-position-mirror-div";
  document.body.appendChild(div);

  const style = div.style;
  style.whiteSpace = "pre-wrap";
  style.wordWrap = "break-word";
  style.position = "absolute";
  style.visibility = "hidden";

  properties.forEach((prop: string) => {
    if (
      Object.prototype.hasOwnProperty.call(styles as Record<string, any>, prop)
    ) {
      style.setProperty(prop, (styles as Record<string, any>)[prop]);
    }
  });

  div.textContent = element.value.substring(0, position);
  const span = document.createElement("span");
  span.textContent = element.value.substring(position) || ".";
  div.appendChild(span);

  const coordinates = {
    top: span.offsetTop + Number.parseInt(styles["borderTopWidth"]),
    left: span.offsetLeft + Number.parseInt(styles["borderLeftWidth"]),
    height: Number.parseInt(styles["lineHeight"]),
  };

  document.body.removeChild(div);

  return coordinates;
}

function parseType(typ: any) : any {
  if (!typ) {
    return "null";
  }

  const typeMap = {
    Bool: "bool",
    S8: "i8",
    S16: "i16",
    S32: "i32",
    S64: "i64",
    U8: "u8",
    U16: "u16",
    U32: "u32",
    U64: "U64",
    F32: "f32",
    F64: "f64",
    Char: "char",
    Str: "string"
  };

  if (typeMap[(typ.type as keyof typeof typeMap)]) {
    return typeMap[typ.type as keyof typeof typeMap];
  }

  switch (typ.type) {
    case "List": {
      return `List<${parseType(typ.inner)}>`;
    }
    case "Option": {
      return `Option<${JSON.stringify(parseType(typ.inner))}>`;
    }
    case "Result": {
      return {
        ok: parseType(typ.ok.inner),
        err: `enum (${typ.err.cases.join(", ")})`
      };
    }
    case "Record": {
      const result: Record<string | number, any> = {};
      (typ.fields || []).forEach((field: { name: string | number; typ: any; }) => {
        result[field.name] = parseType(field.typ);
      });
      return result;
    }
    case "Enum": {
      return `enum (${typ.cases.join(", ")})`;
    }
    case "Variant": {
      const variantCases: Record<string | number, any> = {};
      (typ.cases || []).forEach((variant: { name: string | number; typ: any; }) => {
        variantCases[variant.name] = parseType(variant.typ);
      });
      return variantCases;
    }
    default:
      return "unknown";
  }
}

export function parseTypesData(data : ComponentExportFunction) {
  const result: { name: string; datatype: any }[] = [];
  
  data.parameters.forEach(item => {
    if (item.type === "Result") {
      result.push(parseType(item));
    } else if (item.typ.type === "Record") {
      result.push(parseType(item.typ));
    } else {
      result.push(parseType(item.typ));
    }
  });

  return result;
}
