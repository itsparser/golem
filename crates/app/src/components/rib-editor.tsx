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
    console.log("scriptKeys", scriptKeys);
    const [scriptKeywords, setScriptKeywords] = useState<string[]>(
      scriptKeys || [],
    );
    const monacoInstance = useMonaco();

    useEffect(() => {
      setScriptKeywords(scriptKeys || []);
    }, [scriptKeys]);

    useEffect(() => {
      if (monacoInstance) {
        // Register Rib language
        monacoInstance.languages.getLanguages().forEach((lang: any) => {
          if (lang.id === "rig") {
            monacoInstance.languages.deregister({ id: "rig" }); // Remove old language
          }
        });
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
              // Namespace (golem:todo)
              [/\b[a-zA-Z_]\w*:\w+\b/, "namespace"],

              // Package (profile)
              [/(?<=:)[a-zA-Z_]\w*(?=\/)/, "package"],

              // Function Name ({update-profile})
              [/\{[\w-]+\}/, "function"],

              // Function Call with String Argument (("input"))
              [/\(\s*".*?"\s*\)/, "string.argument"],

              // Function Call with Parameter (input: string)
              [/\(\s*([\w]+)\s*:/, "parameter"], // Parameter name
              [
                /\b(string|bool|s8|u8|s16|u16|s32|u32|s64|u64|f32|f64|char|list|tuple|option|result)\b/,
                "type",
              ], // Data type

              // Parentheses & Operators
              [/[{}()\[\]]/, "@brackets"],
              [/[.:/]/, "operator"],

              // Include whitespace, numbers, and strings handling
              { include: "@whitespace" },
              { include: "@numbers" },
              { include: "@strings" },
            ],

            whitespace: [
              [/[ \t\r\n]+/, "white"],
              [/\/\/.*$/, "comment"],
              [/\/\*/, "comment", "@comment"],
            ],

            comment: [
              [/[^/*]+/, "comment"],
              [/\/\*/, "comment", "@push"],
              ["\\*/", "comment", "@pop"],
              [/[/*]/, "comment"],
            ],

            numbers: [
              [/\d*\.\d+([eE][-+]?\d+)?/, "number.float"],
              [/0[xX][0-9a-fA-F]+/, "number.hex"],
              [/\d+/, "number"],
            ],

            strings: [
              [
                /"/,
                { token: "string.quote", bracket: "@open", next: "@string" },
              ],
            ],

            string: [
              [/[^\\"$]+/, "string"],
              [/@escapes/, "string.escape"],
              [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
            ],

            // string: [
            //   [/[^\\"$]+/, "string"],
            //   [/\$\{([a-zA-Z_]\w*)\}/, ["string", "variable", "string"]],
            //   [/""/, "string"],
            //   [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
            //   [/\$/, "string"],
            //   [/@escapes/, "string.escape"],
            //   [/\\./, "string.escape.invalid"],
            //   [
            //     /\$\{/,
            //     { token: "delimiter.bracket", next: "@bracketCounting" },
            //   ],
            // ],

            // comment: [
            //   [/[^/*]+/, "comment"],
            //   [/\/\*/, "comment", "@push"],
            //   ["\\*/", "comment", "@pop"],
            //   [/[/*]/, "comment"],
            // ],

            // bracketCounting: [
            //   [/\{/, "delimiter.bracket", "@bracketCounting"],
            //   [/\}/, "delimiter.bracket", "@pop"],
            //   { include: "root" },
            // ],

            // whitespace: [
            //   [/[ \t\r\n]+/, "white"],
            //   [/\/\/.*$/, "comment"],
            //   [/\/\*/, "comment", "@comment"],
            // ],

            // numbers: [
            //   [/\d*\.\d+([eE][-+]?\d+)?/, "number.float"],
            //   [/0[xX][0-9a-fA-F]+/, "number.hex"],
            //   [/\d+/, "number"],
            // ],

            // strings: [
            //   [
            //     /"/,
            //     { token: "string.quote", bracket: "@open", next: "@string" },
            //   ],
            // ],
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

            // console.log("Extracted object:", requestStructure);
            // console.log("Custom Types:", customTypes);

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

            setScriptKeywords(scriptKeys || []);
            console.log("scriptKeywords", scriptKeywords);

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
    }, [monacoInstance, scriptKeys, suggestVariable]);

    useEffect(() => {
      if (!monacoInstance) return;
      // DARK MODE THEME
      monacoInstance.editor.defineTheme("rigDarkTheme", {
        base: "vs-dark", // Dark background
        inherit: true,
        rules: [
          { token: "namespace", foreground: "8A2BE2" }, // Purple (Royal Blue Variant)
          { token: "package", foreground: "20B2AA" }, // Teal (Greenish Blue)
          { token: "function", foreground: "FFA500", fontStyle: "bold" }, // Orange (Bold)
          { token: "string.argument", foreground: "FFD700" }, // Light Yellow
          { token: "parameter", foreground: "00BFFF", fontStyle: "italic" }, // Light Blue (Italic)
          { token: "type", foreground: "00FFFF" }, // Bright Cyan
          { token: "operator", foreground: "808080" }, // Gray
          { token: "comment", foreground: "808080", fontStyle: "italic" }, // Light Gray for comments
        ],
        colors: {
          "editor.background": "#1E1E1E", // Dark background
          "editor.foreground": "#D4D4D4", // Standard text color
          "editor.lineHighlightBackground": "#2E2E2E",
          "editorCursor.foreground": "#FFFFFF",
        },
      });

      // LIGHT MODE THEME
      monacoInstance.editor.defineTheme("rigLightTheme", {
        base: "vs", // Light background
        inherit: true,
        rules: [
          { token: "namespace", foreground: "8A2BE2" }, // Purple (Royal Blue Variant)
          { token: "package", foreground: "20B2AA" }, // Teal (Greenish Blue)
          { token: "function", foreground: "FFA500", fontStyle: "bold" }, // Orange (Bold)
          { token: "string.argument", foreground: "FFD700" }, // Light Yellow
          { token: "parameter", foreground: "00BFFF", fontStyle: "italic" }, // Light Blue (Italic)
          { token: "type", foreground: "00FFFF" }, // Bright Cyan
          { token: "operator", foreground: "808080" }, // Gray
          { token: "comment", foreground: "808080", fontStyle: "italic" }, // Light Gray for comments
        ],
        colors: {
          "editor.background": "#FFFFFF", // Light background
          "editor.foreground": "#333333", // Darker text
          "editor.lineHighlightBackground": "#F0F0F0",
          "editorCursor.foreground": "#000000",
        },
      });
      setRigEditorTheme(theme === "dark");
    }, [theme, monacoInstance]);

    function setRigEditorTheme(isDarkMode: boolean) {
      if (!monacoInstance) return;
      monacoInstance.editor.setTheme(
        isDarkMode ? "rigDarkTheme" : "rigLightTheme",
      );
    }

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
          theme={theme === "dark" ? "rigDarkTheme" : "rigLightTheme"}
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
