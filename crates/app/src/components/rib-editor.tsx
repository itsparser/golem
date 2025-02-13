import type React from "react"
import {useEffect, useState} from "react"
import Editor, {type EditorProps, useMonaco} from "@monaco-editor/react"
import {cn} from "@/lib/utils"
import {useTheme} from "./theme-provider"


interface MonacoEditorProps extends EditorProps {
    value?: string
    language?: string
    height?: string
    scriptKeys?: string[]
}

export const RibEditor: React.FC<MonacoEditorProps> = ({
                                                           value, onChange, className,
                                                           scriptKeys,
                                                           ...props
                                                       }) => {
    const {theme} = useTheme()
    const [isFocused, setIsFocused] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [scriptKeywords, _] = useState<string[]>(scriptKeys || [])
    const monacoInstance = useMonaco()


    useEffect(() => {
        if (monacoInstance) {
            // Register Rib language
            monacoInstance.languages.register({id: "rib"})

            monacoInstance.languages.registerCompletionItemProvider("rib", {
                triggerCharacters: ["$", "{"], // Trigger suggestions inside strings
                provideCompletionItems: (model, position) => {
                    const wordUntilPosition = model.getWordUntilPosition(position)
                    const range = {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: wordUntilPosition.startColumn,
                        endColumn: wordUntilPosition.endColumn,
                    }

                    const code = model.getValue() // Get entire editor content
                    const variablePattern = /\b(let|const|var)\s+([a-zA-Z_]\w*)/g
                    const variables = [...code.matchAll(variablePattern)].map((match) => match[2]) // Extract variable names

                    // console.log("Extracted local variables:", variables)

                    const suggestions = [
                        ...variables.map((variable) => ({
                            label: variable,
                            kind: monacoInstance.languages.CompletionItemKind.Variable,
                            insertText: variable,
                            range: range,
                        }))
                    ]

                    return {suggestions}
                },
            })

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
            })
            monacoInstance.languages.setMonarchTokensProvider("rib", {
                defaultToken: "",
                tokenPostfix: ".rib",

                keywords: [
                    "let",
                    "const",
                    "fn",
                    "use",
                    "type",
                    "struct",
                    "enum",
                    "trait",
                    "impl",
                    "pub",
                    "mut",
                    "return",
                    "if",
                    "else",
                    "for",
                    "while",
                    "match",
                    "as",
                    "in",
                    "export",
                    "import",
                    "interface",
                    "resource",
                ],

                typeKeywords: [
                    "u8",
                    "u16",
                    "u32",
                    "u64",
                    "i8",
                    "i16",
                    "i32",
                    "i64",
                    "f32",
                    "f64",
                    "bool",
                    "char",
                    "str",
                    "string",
                ],

                operators: [
                    "=",
                    ">",
                    "<",
                    "!",
                    "~",
                    "?",
                    ":",
                    "==",
                    "<=",
                    ">=",
                    "!=",
                    "&&",
                    "||",
                    "++",
                    "--",
                    "+",
                    "-",
                    "*",
                    "/",
                    "&",
                    "|",
                    "^",
                    "%",
                    "<<",
                    ">>",
                    ">>>",
                    "+=",
                    "-=",
                    "*=",
                    "/=",
                    "&=",
                    "|=",
                    "^=",
                    "%=",
                    "<<=",
                    ">>=",
                    ">>>=",
                ],

                symbols: /[=><!~?:&|+\-*/^%]+/,

                escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

                tokenizer: {
                    root: [
                        // Identifiers and keywords
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

                        // Whitespace
                        {include: "@whitespace"},

                        // Delimiters and operators
                        [/[{}()[\]]/, "@brackets"],
                        [/[<>](?!@symbols)/, "@brackets"],
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
            })

            // Add custom completions
            monacoInstance.languages.registerCompletionItemProvider("rib", {
                triggerCharacters: ["."],
                provideCompletionItems: (model: any, position: any) => {
                    const lineContent = model.getLineContent(position.lineNumber)
                    const wordUntilPosition = model.getWordUntilPosition(position)
                    const range = {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: wordUntilPosition.startColumn,
                        endColumn: wordUntilPosition.endColumn,
                    }
                    console.log("Triggered completion", {lineContent, wordUntilPosition})

                    return {
                        suggestions: scriptKeywords.map(key => ({
                            label: key,
                            kind: monacoInstance.languages.CompletionItemKind.Keyword,
                            insertText: key,
                            range: range
                        }))
                    }
                },
            })
        }
    }, [monacoInstance])


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
                    editor.onDidFocusEditorWidget(() => setIsFocused(true))
                    editor.onDidBlurEditorWidget(() => setIsFocused(false))
                }}
                {...props}
            />
        </div>
    )
}

