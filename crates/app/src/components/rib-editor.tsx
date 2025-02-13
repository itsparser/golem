import type React from "react";
import {useEffect, useState} from "react";
import Editor, {type EditorProps, useMonaco} from "@monaco-editor/react";
import {cn} from "@/lib/utils";
import {useTheme} from "@/components/theme-provider.tsx";

interface MonacoEditorProps extends EditorProps {
    value?: string;
    language?: string;
    height?: string;
    scriptKeys?: string[];
}

export const RibEditor: React.FC<MonacoEditorProps> = ({
                                                           value,
                                                           onChange,
                                                           className,
                                                           scriptKeys,
                                                           ...props
                                                       }) => {
    const {theme} = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [scriptKeywords, _] = useState<string[]>(scriptKeys || []);
    const monacoInstance = useMonaco();

    useEffect(() => {
        if (monacoInstance) {
            // Register Rib language
            monacoInstance.languages.register({id: "rib"});

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
                    {open: "{", close: "}"},
                    {open: "[", close: "]"},
                    {open: "(", close: ")"},
                    {open: '"', close: '"'},
                    {open: "'", close: "'"},
                ],
                surroundingPairs: [
                    {open: "{", close: "}"},
                    {open: "[", close: "]"},
                    {open: "(", close: ")"},
                    {open: '"', close: '"'},
                    {open: "'", close: "'"},
                ],
            });

            monacoInstance.languages.setMonarchTokensProvider("rib", {
                defaultToken: "",
                tokenPostfix: ".rib",

                keywords: [
                    "let", "if", "then", "else", "for", "in", "yield", "reduce", "from", "true", "false", "some", "none", "ok", "error"
                ],

                typeKeywords: [
                    "bool", "s8", "u8", "s16", "u16", "s32", "u32", "s64", "u64", "f32", "f64", "char", "string", "list", "tuple", "option", "result"
                ],

                operators: [
                    ">=", "<=", "==", "<", ">", "&&", "||", "+", "-", "*", "/"
                ],

                symbols: /[=><!~?:&|+\-*/^%]+/,

                escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

                tokenizer: {
                    root: [
                        // Function definitions
                        [/\bfn\s+([a-zA-Z_]\w*)/, ["keyword", "function"]],

                        // Function calls: highlight function name
                        [/\b([a-zA-Z_]\w*)\s*(?=\()/, "function.call"],

                        // Highlight variables & arguments inside functions
                        // [/\b([a-zA-Z_]\w*)\b/, {
                        //     cases: {
                        //         "@functions": "function.argument",
                        //         "@default": "identifier",
                        //     },
                        // }],

                        {include: "@whitespace"},
                        [/[{}()[\]]/, "@brackets"],
                        [/\d*\.\d+([eE][-+]?\d+)?/, "number.float"],
                        [/0[xX][0-9a-fA-F]+/, "number.hex"],
                        [/\d+/, "number"],
                        [/"([^"\\]|\\.)*$/, "string.invalid"],
                        [/"/, {token: "string.quote", bracket: "@open", next: "@string"}],
                        // Identifiers and keywords
                        [/[a-z_$][\w$]*/, {
                            cases: {
                                "@typeKeywords": "keyword.type",
                                "@keywords": "keyword",
                                "@default": "identifier"
                            }
                        }],

                        // Whitespace
                        {include: "@whitespace"},

                        // Delimiters and operators
                        [/[{}()[\]]/, "@brackets"],
                        [/[<>](?!@symbols)/, "@brackets"],
                        [/@symbols/, {
                            cases: {
                                "@operators": "operator",
                                "@default": ""
                            }
                        }],

                        // Numbers
                        [/\d*\.\d+([eE][-+]?\d+)?/, "number.float"],
                        [/0[xX][0-9a-fA-F]+/, "number.hex"],
                        [/\d+/, "number"],

                        // Strings
                        [/"([^"\\]|\\.)*$/, "string.invalid"],
                        [/"/, {token: "string.quote", bracket: "@open", next: "@string"}],
                    ],

                    string: [
                        [/[^\\"$]+/, "string"],
                        [/\$\{([a-zA-Z_]\w*)\}/, ["string", "variable", "string"]],
                        [/""/, "string"],
                        [/"/, {token: "string.quote", bracket: "@close", next: "@pop"}],
                        [/\$/, "string"],

                        [/@escapes/, "string.escape"],
                        [/\\./, "string.escape.invalid"],
                        [/\$\{/, {token: "delimiter.bracket", next: "@bracketCounting"}],
                        [/""/, "string"],
                        [/"/, {token: "string.quote", bracket: "@close", next: "@pop"}],
                        [/\$/, "string"],
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
                        {include: "root"},
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
                triggerCharacters: ["."],
                provideCompletionItems: (model, position) => {
                    // const wordUntilPosition = model.getWordUntilPosition(position);
                    // const range = {
                    //     startLineNumber: position.lineNumber,
                    //     endLineNumber: position.lineNumber,
                    //     startColumn: wordUntilPosition.startColumn,
                    //     endColumn: wordUntilPosition.endColumn,
                    // };
                    //
                    // return {
                    //     suggestions: scriptKeywords.map(key => ({
                    //         label: key,
                    //         kind: monacoInstance.languages.CompletionItemKind.Keyword,
                    //         insertText: key,
                    //         range: range
                    //     }))
                    // };
                    const code = model.getValue() // Get full code
                    let requestStructure = {
                        "path": {
                            "username": "vasanth",
                            "nav": "bar"
                        },
                        "query": {
                            "search": "string"
                        }
                    }

                    try {
                        const requestRegex = /request\s*=\s*(\{[\s\S]*?\})/
                        const match = requestRegex.exec(code)
                        if (match) {
                            requestStructure = JSON.parse(match[1].replace(/(\w+)\s*:/g, '"$1":')) // Convert into valid JSON
                        }
                    } catch (e) {
                        console.error("Error parsing object:", e)
                    }

                    console.log("Extracted object:", requestStructure)

                    const wordUntilPosition = model.getWordUntilPosition(position)
                    const range = {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: wordUntilPosition.startColumn,
                        endColumn: wordUntilPosition.endColumn,
                    }

                    // Extract nested object keys recursively
                    const getObjectKeys = (obj, prefix = "") =>
                        Object.entries(obj).flatMap(([key, value]) =>
                            typeof value === "object"
                                ? [{
                                    label: prefix + key,
                                    insertText: prefix + key,
                                    kind: monacoInstance.languages.CompletionItemKind.Property
                                }, ...getObjectKeys(value, `${prefix}${key}.`)]
                                : [{
                                    label: prefix + key,
                                    insertText: prefix + key,
                                    kind: monacoInstance.languages.CompletionItemKind.Property
                                }]
                        )

                    const suggestions = getObjectKeys(requestStructure, "request.")

                    return {suggestions}
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
                    minimap: {enabled: false},
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
                    editor.onDidFocusEditorWidget(() => setIsFocused(true))
                    editor.onDidBlurEditorWidget(() => setIsFocused(false))

                    // Increase z-index of the suggestion box dynamically
                    setTimeout(() => {
                        const suggestWidget = document.querySelector(".suggest-widget")
                        if (suggestWidget) {
                            (suggestWidget as HTMLElement).style.zIndex = "10000"
                        }
                    }, 500) // Delay to allow Monaco to render first
                }}
                {...props}
            />
        </div>
    );
};