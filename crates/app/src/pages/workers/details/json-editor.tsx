import type React from "react";
import {useState} from "react";
import Editor, {type EditorProps, useMonaco} from "@monaco-editor/react";
import {cn} from "@/lib/utils";
import {useTheme} from "@/components/theme-provider.tsx";

interface MonacoEditorProps extends EditorProps {
    value?: string;
    language?: string;
    height?: string;
    scriptKeys?: string[];
}

export const JsonEditor: React.FC<MonacoEditorProps> = ({
                                                            value,
                                                            onChange,
                                                            className,
                                                            ...props
                                                        }) => {
    const {theme} = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const monacoInstance = useMonaco();


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