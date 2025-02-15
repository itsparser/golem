import { useTheme } from "@/components/theme-provider.tsx";
import { cn } from "@/lib/utils";
import Editor, { type EditorProps, useMonaco } from "@monaco-editor/react";
import { forwardRef, useEffect, useState } from "react";

interface MonacoEditorProps extends EditorProps {
  value?: string;
  language?: string;
  height?: string;
  scriptKeys?: string[];
  suggestVariable?: Record<string, any>;
  disabled?: boolean;
  allowExpand?: boolean;
  allowCopy?: boolean;
}

export const RibEditor = forwardRef<HTMLDivElement, MonacoEditorProps>(
  (
    {
      value,
      onChange,
      className,
      scriptKeys,
      suggestVariable,
      disabled = false,
      allowExpand = true,
      allowCopy = false,
      ...props
    },
    ref,
  ) => {
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

          operators: [
            ">=",
            "<=", 
            "==",
            "<",
            ">",
            "&&",
            "||",
            "+",
            "-",
            "*",
            "/",
          ],

          symbols: /[=><!~?:&|+\-*/^%]+/,
          escapes:
            /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

          tokenizer: {
            root: [
              [/\b[a-zA-Z_]\w*:\w+\/[\w\/]+\b/, ["namespace"]], // Fixed groups/actions mismatch 
              [/\{\w+\}/, ["function"]], // Fixed groups/actions mismatch
              [/\(\s*([\w]+)\s*:/, ["delimiter.parenthesis", "parameter"]], 
              [
                /\b(string|bool|s8|u8|s16|u16|s32|u32|s64|u64|f32|f64|char|list|tuple|option|result)\b/,
                ["type"],
              ],
              [/[{}()\[\]]/, ["brackets"]], 
              [/[.:/]/, ["operator"]],

              { include: "@whitespace" },
              { include: "@numbers" },
              { include: "@strings" },
            ],

            string: [
              [/[^\\"$]+/, ["string"]],
              [/\$\{([a-zA-Z_]\w*)\}/, ["string", "variable", "string"]],
              [/""/, ["string"]],
              [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
              [/\$/, ["string"]],
              [/@escapes/, ["string.escape"]],
              [/\\./, ["string.escape.invalid"]],
              [
                /\$\{/,
                { token: "delimiter.bracket", next: "@bracketCounting" },
              ],
            ],

            comment: [
              [/[^/*]+/, ["comment"]],
              [/\/\*/, ["comment"], "@push"],
              ["\\*/", ["comment"], "@pop"],
              [/[/*]/, ["comment"]],
            ],

            bracketCounting: [
              [/\{/, ["delimiter.bracket"], "@bracketCounting"],
              [/\}/, ["delimiter.bracket"], "@pop"],
              { include: "root" },
            ],

            whitespace: [
              [/[ \t\r\n]+/, ["white"]],
              [/\/\/.*$/, ["comment"]],
              [/\/\*/, ["comment"], "@comment"],
            ],

            numbers: [
              [/\d*\.\d+([eE][-+]?\d+)?/, ["number.float"]],
              [/0[xX][0-9a-fA-F]+/, ["number.hex"]],
              [/\d+/, ["number"]],
            ],

            strings: [
              [
                /"/,
                { token: "string.quote", bracket: "@open", next: "@string" },
              ],
            ],
          },
        });

        // Rest of the code remains unchanged
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
                  { name: "args2", datatype: "User" },
                ],
              },
            ];

            const customTypes = ["User", "Profile", "Settings"];

            try {
              const code = model.getValue();

              const requestRegex = /request\s*=\s*(\{[\s\S]*?\})/m;
              const match = requestRegex.exec(code);
              if (match) {
                const jsonString = match[1]
                  .replace(/(\w+)\s*:/g, '"$1":')
                  .replace(/'/g, '"');
                requestStructure = JSON.parse(jsonString);
              }

              const typeRegex = /type\s+(\w+)/g;
              let typeMatch;
              while ((typeMatch = typeRegex.exec(code)) !== null) {
                if (!customTypes.includes(typeMatch[1])) {
                  customTypes.push(typeMatch[1]);
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

            const requestSuggestions = getObjectKeys(
              requestStructure,
              "request.",
            );

            const variableSuggestions = getObjectKeys(variable, "variable.");

            const functionSuggestions = scriptKeywords.map(fn => ({
              label: fn,
              kind: monacoInstance.languages.CompletionItemKind.Function,
              insertText: fn,
              detail: "Function",
              documentation: `Function: ${fn}`,
              range,
            }));

            const customTypeSuggestions = customTypes.map(type => ({
              label: type,
              kind: monacoInstance.languages.CompletionItemKind.Struct,
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
        ref={ref}
        className={cn(
          "relative rounded-md border p-2 transition-all duration-200 ease-in-out overflow-hidden",
          isFocused && allowExpand ? "h-[300px] border-primary" : "h-[100px]",
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
            folding: false,
            lineNumbers: "off",
            lineNumbersMinChars: 1,
            lineDecorationsWidth: 0,
            renderLineHighlight: "none",
            glyphMargin: true,
            readOnly: disabled,
            wordWrap: "on",
            scrollbar: {
              vertical: "hidden",
              horizontal: "hidden",
            },
            padding: {
              top: 5,
            },
          }}
          onMount={(editor, monaco) => {
            editor.onDidFocusEditorWidget(() => setIsFocused(true));
            editor.onDidBlurEditorWidget(() => setIsFocused(false));

            setTimeout(() => {
              const suggestWidget = document.querySelector(".suggest-widget");
              if (suggestWidget) {
                (suggestWidget as HTMLElement).style.zIndex = "10000";
              }
            }, 500);
          }}
          {...props}
        />
      </div>
    );
  },
);

RibEditor.displayName = "RibEditor";
