import type React from "react";
import { useEffect, useState } from "react";
import Editor, { type EditorProps, useMonaco } from "@monaco-editor/react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider.tsx";

interface MonacoEditorProps extends EditorProps {
  value?: string;
  language?: string;
  height?: string;
  scriptKeys?: string[];
  suggestVariable?: Record<string, any>;
}

export const RibEditor: React.FC<MonacoEditorProps> = ({
  value,
  onChange,
  className,
  scriptKeys,
  suggestVariable,
  ...props
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [scriptKeywords, _] = useState<string[]>(scriptKeys || []);
  const monacoInstance = useMonaco();

  useEffect(() => {
    if (monacoInstance) {
      // Register Rib language
      monacoInstance.languages.register({ id: "rib" });

      monacoInstance.languages.setLanguageConfiguration("rib", {
        comments: {
          lineComment: "//",
          blockComment: ["/*", "*/"],
        },
        brackets: [
          ["{", "}"],
          ["[", "]"],
          ["(", ")"],
        ],
        autoClosingPairs: [
          { open: "{", close: "}" },
          { open: "[", close: "]" },
          { open: "(", close: ")" },
          { open: '"', close: '"' },
          { open: "'", close: "'" },
        ],
        surroundingPairs: [
          { open: "{", close: "}" },
          { open: "[", close: "]" },
          { open: "(", close: ")" },
          { open: '"', close: '"' },
          { open: "'", close: "'" },
        ],
      });

      monacoInstance.languages.setMonarchTokensProvider("rib", {
        defaultToken: "",
        tokenPostfix: ".rib",

        keywords: [
          "let",
          "if",
          "then",
          "else",
          "for",
          "in",
          "yield",
          "reduce",
          "from",
          "true",
          "false",
          "some",
          "none",
          "ok",
          "error",
        ],

        typeKeywords: [
          "bool",
          "s8",
          "u8",
          "s16",
          "u16",
          "s32",
          "u32",
          "s64",
          "u64",
          "f32",
          "f64",
          "char",
          "string",
          "list",
          "tuple",
          "option",
          "result",
        ],

        operators: [">=", "<=", "==", "<", ">", "&&", "||", "+", "-", "*", "/"],

        symbols: /[=><!~?:&|+\-*/^%]+/,
        escapes:
          /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

        tokenizer: {
          root: [
            // Keywords
            [/\b(fn)\b/, "keyword"],
            [
              /[a-z_$][\w$]*/,
              {
                cases: {
                  "@typeKeywords": "keyword.type",
                  "@keywords": "keyword",
                  "@default": "identifier",
                },
              },
            ],

            // Function names (in declarations)
            [/\b([a-zA-Z_]\w*)\b(?=\s*\()/, "function"],

            // Function calls
            [
              /\b([a-zA-Z_]\w*)\b(?=\s*\()/,
              {
                cases: {
                  "@keywords": "keyword",
                  "@default": "function.call",
                },
              },
            ],

            { include: "@whitespace" },

            // Brackets
            [/[{}()[\]]/, "@brackets"],

            // Operators
            [
              /@symbols/,
              {
                cases: {
                  "@operators": "operator",
                  "@default": "",
                },
              },
            ],

            // Numbers
            [/\d*\.\d+([eE][-+]?\d+)?/, "number.float"],
            [/0[xX][0-9a-fA-F]+/, "number.hex"],
            [/\d+/, "number"],

            // Strings
            [/"([^"\\]|\\.)*$/, "string.invalid"], // Unclosed string
            [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],
          ],

          string: [
            [/[^\\"$]+/, "string"],
            [/\$\{([a-zA-Z_]\w*)\}/, ["string", "variable", "string"]],
            [/""/, "string"],
            [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
            [/\$/, "string"],
            [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/\$\{/, { token: "delimiter.bracket", next: "@bracketCounting" }],
          ],

          comment: [
            [/[^/*]+/, "comment"],
            [/\/\*/, "comment", "@push"],
            ["\\*/", "comment", "@pop"],
            [/[/*]/, "comment"],
          ],

          bracketCounting: [
            [/\{/, "delimiter.bracket", "@bracketCounting"],
            [/\}/, "delimiter.bracket", "@pop"],
            { include: "root" },
          ],

          whitespace: [
            [/[ \t\r\n]+/, "white"],
            [/\/\*/, "comment", "@comment"],
            [/\/\/.*$/, "comment"],
          ],
        },
      });

      // Add custom completions
      monacoInstance.languages.registerCompletionItemProvider("rib", {
        triggerCharacters: [
          ".",
          "r",
          "e",
          "q",
          "u",
          "e",
          "s",
          "t",
          "v",
          "a",
          "r",
        ],

        provideCompletionItems: (model, position) => {
          let requestStructure = {
            path: {
              username: "vasanth",
              nav: "bar",
            },
            query: {
              search: "string",
            },
          };

          const variable = {
            path: {
              username: "vasanth",
              nav: "bar",
            },
            query: {
              search: "string",
            },
          };

          const functions = [
            {
              name: "this_is_function_name",
              args: [
                { name: "args1", datatype: "string" },
                { name: "args2", datatype: "User" }, // Custom datatype
              ],
            },
          ];

          const customTypes = ["User", "Profile", "Settings"]; // Define custom types

          try {
            const code = model.getValue();

            // Extract request object dynamically from the code
            const requestRegex = /request\s*=\s*(\{[\s\S]*?\})/m;
            const match = requestRegex.exec(code);
            if (match) {
              const jsonString = match[1]
                .replace(/(\w+)\s*:/g, '"$1":') // Ensure valid JSON keys
                .replace(/'/g, '"'); // Convert single quotes to double quotes
              requestStructure = JSON.parse(jsonString);
            }

            // Extract custom types from code (e.g., `type User = {...}`)
            const typeRegex = /type\s+(\w+)/g;
            let typeMatch;
            while ((typeMatch = typeRegex.exec(code)) !== null) {
              if (!customTypes.includes(typeMatch[1])) {
                customTypes.push(typeMatch[1]); // Add user-defined types dynamically
              }
            }
          } catch (e) {
            console.error("Error parsing request object or types:", e);
          }

          console.log("Extracted object:", requestStructure);
          console.log("Custom Types:", customTypes);

          const wordUntilPosition = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: wordUntilPosition.startColumn,
            endColumn: wordUntilPosition.endColumn,
          };

          // Extract nested object keys recursively
          const getObjectKeys = (obj, prefix = "") =>
            Object.entries(obj).flatMap(([key, value]) =>
              typeof value === "object"
                ? [
                    {
                      label: prefix + key,
                      insertText: prefix + key,
                      kind: monacoInstance.languages.CompletionItemKind
                        .Property,
                      range,
                    },
                    ...getObjectKeys(value, `${prefix}${key}.`),
                  ]
                : [
                    {
                      label: prefix + key,
                      insertText: prefix + key,
                      kind: monacoInstance.languages.CompletionItemKind
                        .Property,
                      range,
                    },
                  ],
            );

          // Get request-based suggestions
          const requestSuggestions = getObjectKeys(
            requestStructure,
            "request.",
          );

          // Get variable-based suggestions
          const variableSuggestions = getObjectKeys(variable, "variable.");

          // Function suggestions with argument placeholders
          const functionSuggestions = functions.map(fn => ({
            label: fn.name,
            kind: monacoInstance.languages.CompletionItemKind.Function,
            insertText: `${fn.name}(${fn.args.map(arg => `${arg.name}: ${arg.datatype}`).join(", ")})`,
            detail: "Function",
            documentation: `Function: ${fn.name} \nArguments: ${fn.args.map(arg => `${arg.name}: ${arg.datatype}`).join(", ")}`,
            range,
          }));

          // Custom datatype suggestions
          const customTypeSuggestions = customTypes.map(type => ({
            label: type,
            kind: monacoInstance.languages.CompletionItemKind.Struct, // Custom type
            insertText: type,
            detail: "Custom Type",
            documentation: `User-defined type: ${type}`,
            range,
          }));

          return {
            suggestions: [
              ...requestSuggestions,
              ...variableSuggestions,
              ...functionSuggestions,
              ...customTypeSuggestions,
            ],
          };
        },
      });
    }
  }, [monacoInstance]);

  return (
    <div
      className={cn(
        "relative rounded-md border p-2 transition-all duration-200 ease-in-out overflow-hidden",
        isFocused ? "h-[300px] border-primary" : "h-[100px]",
        className,
      )}
    >
      <Editor
        value={value}
        onChange={onChange}
        language={"rib"}
        theme={theme === "dark" ? "vs-dark" : "vs-light"}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          lineNumbers: "off",
          folding: false,
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 0,
          renderLineHighlight: "none",
          glyphMargin: false,
          scrollbar: {
            vertical: "hidden",
            horizontal: "hidden",
          },
        }}
        onMount={(editor, monaco) => {
          editor.onDidFocusEditorWidget(() => setIsFocused(true));
          editor.onDidBlurEditorWidget(() => setIsFocused(false));

          // Increase z-index of the suggestion box dynamically
          setTimeout(() => {
            const suggestWidget = document.querySelector(".suggest-widget");
            if (suggestWidget) {
              (suggestWidget as HTMLElement).style.zIndex = "10000";
            }
          }, 500); // Delay to allow Monaco to render first
        }}
        {...props}
      />
    </div>
  );
};
