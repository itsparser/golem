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

                    comment: [
                        [/[^/*]+/, "comment"],
                        [/\/\*/, "comment", "@push"],
                        ["\\*/", "comment", "@pop"],
                        [/[/*]/, "comment"],
                    ],

                    string: [
                        [/[^\\"$]+/, "string"],
                        [/@escapes/, "string.escape"],
                        [/\\./, "string.escape.invalid"],
                        [/\$\{/, {token: "delimiter.bracket", next: "@bracketCounting"}],
                        [/""/, "string"],
                        [/"/, {token: "string.quote", bracket: "@close", next: "@pop"}],
                        [/\$/, "string"],
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
                provideCompletionItems: (model: any, position: any) => {
                    const lineContent = model.getLineContent(position.lineNumber);
                    const wordUntilPosition = model.getWordUntilPosition(position);
                    const range = {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: wordUntilPosition.startColumn,
                        endColumn: wordUntilPosition.endColumn,
                    };
                    console.log("Triggered completion", {lineContent, wordUntilPosition});

                    return {
                        suggestions: scriptKeywords.map(key => ({
                            label: key,
                            kind: monacoInstance.languages.CompletionItemKind.Keyword,
                            insertText: key,
                            range: range
                        }))
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
                    minimap: {enabled: false},
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: "off",
                    folding: false,
                    lineDecorationsWidth: 0,
                    lineNumbersMinChars: 0,
                    glyphMargin: false,
                    scrollbar: {
                        vertical: "hidden",
                        horizontal: "hidden",
                    },
                }}
                onMount={(editor) => {
                    editor.onDidFocusEditorWidget(() => setIsFocused(true));
                    editor.onDidBlurEditorWidget(() => setIsFocused(false));
                }}
                {...props}
            />
        </div>
    );
};