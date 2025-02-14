import {useEffect, useState} from "react";
import {useNavigate, useParams, useSearchParams} from "react-router-dom";
import {Info, Loader2} from "lucide-react";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover";

import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,} from "@/components/ui/form";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {API} from "@/service";
import {Api} from "@/types/api";
import type {Component, ComponentList} from "@/types/component";
import ErrorBoundary from "@/components/errorBoundary";
import {toast} from "@/hooks/use-toast";
import {RibEditor} from "@/components/rib-editor.tsx";

const MethodPattern = z.enum([
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
    "HEAD",
    "OPTIONS",
    "TRACE",
    "CONNECT",
]);

const GatewayBindingType = z.enum(["default", "file-server", "cors-preflight"]);

const GatewayBindingData = z.object({
    bindingType: GatewayBindingType,
    componentId: z
        .object({
            componentId: z.string(),
            version: z.number(),
        })
        .optional(),
    workerName: z.string().optional(),
    idempotencyKey: z.string().optional(),
    response: z.string().optional(),
});

const HttpCors = z.object({
    allowOrigin: z.string(),
    allowMethods: z.string(),
    allowHeaders: z.string(),
    exposeHeaders: z.string().optional(),
    maxAge: z.number().optional(),
    allowCredentials: z.boolean().optional(),
});

const RouteRequestData = z.object({
    method: MethodPattern,
    path: z.string(),
    binding: GatewayBindingData,
    cors: HttpCors.optional(),
    security: z.string().optional(),
});

function filterMethod(type: string) {
    if (type === "default") {
        return ["GET", "POST", "PUT", "DELETE", "PATCH"];
    } else if (type === "cors-preflight") {
        return ["OPTIONS", "HEAD", "TRACE", "CONNECT"];
    }
    return [];
}

type RouteFormValues = z.infer<typeof RouteRequestData>;

const interpolations = [
    {label: "Path Parameters", expression: "${request.path.<PATH_PARAM_NAME>}"},
    {
        label: "Query Parameters",
        expression: "${request.path.<QUERY_PARAM_NAME>}",
    },
    {label: "Request Body", expression: "${request.body}"},
    {label: "Request Body Field", expression: "${request.body.<FIELD_NAME>}"},
    {label: "Request Headers", expression: "${request.header.<HEADER_NAME>}"},
];

const CreateRoute = () => {
    const {apiName, version} = useParams();
    const navigate = useNavigate();
    const [componentList, setComponentList] = useState<{
        [key: string]: ComponentList;
    }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [queryParams] = useSearchParams();
    const path = queryParams.get("path");
    const method = queryParams.get("method");

    const [isEdit, setIsEdit] = useState(false);
    const [activeApiDetails, setActiveApiDetails] = useState<Api | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [responseSuggestions, setResponseSuggestions] = useState(
        [] as string[],
    );
    const [variableSuggestions, setVariableSuggestions] = useState(
        {} as Record<string, any>,
    );

    const extractDynamicParams = (path: string) => {
        const pathParamRegex = /{([^}]+)}/g; // Matches {param} in path
        const queryParamRegex = /[?&]([^=]+)={([^}]+)}/g; // Matches ?key={param} or &key={param}

        const pathParams: Record<string, string> = {};
        const queryParams: Record<string, string> = {};
        let match;

        // Extract path parameters
        while ((match = pathParamRegex.exec(path)) !== null) {
            pathParams[match[1]] = match[1];
        }

        // Extract query parameters (key-value pair)
        while ((match = queryParamRegex.exec(path)) !== null) {
            queryParams[match[1]] = match[2]; // key -> param
        }
        setVariableSuggestions({
            path: pathParams,
            query: queryParams,
        });
    };

    const form = useForm<RouteFormValues>({
        resolver: zodResolver(RouteRequestData),
        defaultValues: {
            path: "/",
            binding: {
                bindingType: "default",
                componentId: {
                    componentId: "",
                    version: 0,
                },
                workerName: "",
                idempotencyKey: "",
                response: "",
            },
            security: "",
        },
    });
    // Fetch API details
    useEffect(() => {
        const fetchData = async () => {
            if (!apiName) return;
            try {
                setIsLoading(true);
                const [apiResponse, componentResponse] = await Promise.all([
                    API.getApi(apiName),
                    API.getComponentByIdAsKey(),
                ]);
                const selectedApi = apiResponse.find((api) => api.version === version);
                setActiveApiDetails(selectedApi!);
                setComponentList(componentResponse);
                if (path && method) {
                    setIsEdit(true);
                    const route = selectedApi?.routes.find(
                        (route) => route.path === path && route.method === method,
                    );
                    if (route) {
                        // @ts-ignore
                        form.reset(route);
                        if (!route.binding.bindingType) {
                            form.setValue("binding.bindingType", "default");
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
                setFetchError("Failed to load required data. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [apiName, version, path, method]);

    const onSubmit = async (values: RouteFormValues) => {
        if (!activeApiDetails) return;

        try {
            setIsSubmitting(true);

            const apiResponse = await API.getApi(apiName!);
            const selectedApi = apiResponse.find((api) => api.version === version);
            if (!selectedApi) {
                toast({
                    title: "API not found",
                    description: "Please try again.",
                    variant: "destructive",
                    duration: Number.POSITIVE_INFINITY,
                });
                return;
            }
            selectedApi.routes = selectedApi.routes.filter(
                (route) => !(route.path === path && route.method === method),
            );
            selectedApi.routes.push(values);
            await API.putApi(
                activeApiDetails.id,
                activeApiDetails.version,
                selectedApi,
            ).then(() => {
                navigate(
                    `/apis/${apiName}/version/${version}/routes?path=${values.path}&method=${values.method}`,
                );
            });
        } catch (error) {
            console.error("Failed to create route:", error);
            form.setError("root", {
                type: "manual",
                message: "Failed to create route. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        form.setValue("path", value);
        extractDynamicParams(value);
    };

    //
    // const handleSuggestionClick = (suggestion: string) => {
    //     const currentValue = form.getValues("workerName");
    //     const textBeforeCursor = currentValue.slice(0, cursorPosition);
    //     const pattern = "request.path.";
    //     const startIndex = textBeforeCursor.lastIndexOf(pattern);
    //
    //     let newValue: string;
    //     let newCursorPosition: number;
    //
    //     if (startIndex !== -1) {
    //         // Replace any text after "request.path." with the suggestion
    //         newValue =
    //             currentValue.slice(0, startIndex) +
    //             pattern +
    //             suggestion +
    //             currentValue.slice(cursorPosition);
    //         newCursorPosition = startIndex + pattern.length + suggestion.length;
    //     } else {
    //         // If the pattern isn't found, insert it along with the suggestion at the cursor position
    //         newValue =
    //             currentValue.slice(0, cursorPosition) +
    //             pattern +
    //             suggestion +
    //             currentValue.slice(cursorPosition);
    //         newCursorPosition = cursorPosition + pattern.length + suggestion.length;
    //     }
    //
    //     form.setValue("workerName", newValue);
    //     // setShowSuggestions(false);
    //
    //     if (textareaRef.current) {
    //         textareaRef.current.focus();
    //         textareaRef.current.setSelectionRange(
    //             newCursorPosition,
    //             newCursorPosition,
    //         );
    //         setCursorPosition(newCursorPosition);
    //     }
    // };

    const onVersionChange = (version: string) => {
        form.setValue("binding.componentId.version", Number(version));
        const componentId = form.getValues("binding.componentId.componentId");
        // @ts-ignore
        const exportedFunctions = componentList?.[componentId]?.versions?.find(
            (data: Component) =>
                data.versionedComponentId?.version?.toString() === version,
        );
        const data = exportedFunctions?.metadata?.exports || [];
        const output = data.flatMap((item) =>
            item.functions.map((func) => `${item.name}.{${func.name}}`),
        );
        setResponseSuggestions(output);
    };

    // const handleWorkerNameChange = (
    //     e: React.ChangeEvent<HTMLTextAreaElement>,
    // ) => {
    //     const value = e.target.value;
    //     form.setValue("workerName", value);
    //     const cursorPos = e.target.selectionStart || 0;
    //     setCursorPosition(cursorPos);
    //
    //     const textBeforeCursor = value.slice(0, cursorPos);
    //     // Look for the last occurrence of "request.path."
    //     const pattern = "request.path.";
    //     const startIndex = textBeforeCursor.lastIndexOf(pattern);
    //
    //     // if (startIndex !== -1) {
    //     //     // Extract the token typed after "request.path."
    //     //     const token = textBeforeCursor.slice(startIndex + pattern.length);
    //     //     // Retrieve the dynamic parameters (or suggestion candidates)
    //     //     const dynamicParams = extractDynamicParams(form.getValues("path"));
    //     //
    //     //     // If token is empty, show all dynamicParams; otherwise filter them
    //     //     // const filteredSuggestions =
    //     //     //     token.trim().length > 0
    //     //     //         ? dynamicParams.filter((param) =>
    //     //     //             param.toLowerCase().startsWith(token.toLowerCase()),
    //     //     //         )
    //     //     //         : dynamicParams;
    //     //
    //     //     // if (filteredSuggestions.length > 0) {
    //     //     //     // setSuggestions(filteredSuggestions);
    //     //     //     // updateMenuPosition();
    //     //     //     // setShowSuggestions(true);
    //     //     // } else {
    //     //     //     setShowSuggestions(false);
    //     //     // }
    //     // } else {
    //     //     // setShowSuggestions(false);
    //     // }
    // };

    // const updateMenuPosition = () => {
    //     if (textareaRef.current) {
    //         const {selectionStart} = textareaRef.current;
    //         const coords = getCaretCoordinates(textareaRef.current, selectionStart);
    //         // setMenuPosition({
    //         //     top: coords.top + coords.height - textareaRef.current.scrollTop,
    //         //     left: coords.left - textareaRef.current.scrollLeft,
    //         // });
    //     }
    // };

    // const handleResponseSuggestionClick = (suggestion: string) => {
    //     const currentValue = form.getValues("response") ?? "";
    //     // Get text before the current cursor position.
    //     const textBeforeCursor = currentValue.slice(0, responseCursorPosition);
    //     // Find the last contiguous non-space token
    //     const tokenMatch = textBeforeCursor.match(/(\S+)$/);
    //     let tokenStart = responseCursorPosition;
    //     if (tokenMatch) {
    //         tokenStart = responseCursorPosition - tokenMatch[1].length;
    //     }
    //     // Replace the token with the suggestion.
    //     const newValue =
    //         currentValue.slice(0, tokenStart) +
    //         suggestion +
    //         currentValue.slice(responseCursorPosition);
    //     form.setValue("response", newValue);
    //     // setShowResponseSuggestions(false);
    //
    //     if (responseTextareaRef.current) {
    //         responseTextareaRef.current.focus();
    //         const newCursorPosition = tokenStart + suggestion.length;
    //         responseTextareaRef.current.setSelectionRange(
    //             newCursorPosition,
    //             newCursorPosition,
    //         );
    //         setResponseCursorPosition(newCursorPosition);
    //     }
    // };

    // const handleResponseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    //     const value = e.target.value;
    //     form.setValue("response", value);
    //     const cursorPos = e.target.selectionStart || 0;
    //     setResponseCursorPosition(cursorPos);
    //
    //     // Extract the last "word" (non-whitespace sequence) before the cursor.
    //     const textBeforeCursor = value.slice(0, cursorPos);
    //     const match = textBeforeCursor.match(/(\S+)$/); // captures last token
    //     const token = match ? match[1] : "";
    //
    //     // Filter responseSuggestions to only those that match the token (case-insensitive)
    //     // const filtered = responseSuggestions.filter((item) =>
    //     //     item.toLowerCase().startsWith(token.toLowerCase()),
    //     // );
    //     //
    //     // // If there are any matches and the token is not empty, show the dropdown.
    //     // if (filtered.length > 0 && token.length > 0) {
    //     //     // updateResponseMenuPosition();
    //     //     // setFilteredResponseSuggestions(filtered);
    //     //     // setShowResponseSuggestions(true);
    //     // } else {
    //     //     // setShowResponseSuggestions(false);
    //     // }
    // };

    const togglePopover = () => {
        setIsPopoverOpen((prev) => !prev);
    };

    if (fetchError) {
        return (
            <div className="p-6 max-w-3xl mx-auto">
                <div
                    className="flex flex-col items-center justify-center space-y-4 p-8 border rounded-lg bg-destructive/10">
                    <p className="text-destructive font-medium">{fetchError}</p>
                    <Button variant="outline" onClick={() => window.location.reload()}>
                        Retry
                    </Button>
                </div>
            </div>
        );
    }
    return (
        <ErrorBoundary>
            <div className="overflow-y-auto h-[80vh]">
                <div className="max-w-4xl mx-auto p-8">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin"/>
                            <span className="ml-2">Loading...</span>
                        </div>
                    ) : (
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-8"
                            >
                                <div>
                                    <h3 className="text-lg font-medium">Worker Binding</h3>
                                    <FormDescription>
                                        Bind this endpoint to a specific worker function.
                                    </FormDescription>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <FormField
                                            control={form.control}
                                            name="binding.componentId.componentId"
                                            render={({field}) => (
                                                <FormItem>
                                                    <FormLabel required>Component</FormLabel>
                                                    <Select
                                                        onValueChange={(componentId) =>
                                                            form.setValue(
                                                                "binding.componentId.componentId",
                                                                componentId,
                                                            )
                                                        }
                                                        value={field.value}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select a component"/>
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {Object.values(componentList).map(
                                                                (data: ComponentList) => (
                                                                    <SelectItem
                                                                        value={data.componentId || ""}
                                                                        key={data.componentName}
                                                                    >
                                                                        {data.componentName}
                                                                    </SelectItem>
                                                                ),
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="binding.componentId.version"
                                            render={({field}) => (
                                                <FormItem>
                                                    <FormLabel required>Version</FormLabel>
                                                    <Select
                                                        onValueChange={onVersionChange}
                                                        value={String(field.value)}
                                                        disabled={
                                                            !form.watch("binding.componentId.componentId")
                                                        }
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select version">
                                                                    {" "}
                                                                    v{field.value}{" "}
                                                                </SelectValue>
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {form.watch("binding.componentId") &&
                                                                componentList[
                                                                    form.watch("binding.componentId.componentId")
                                                                    ]?.versionList?.map((v: number) => (
                                                                    <SelectItem value={String(v)} key={v}>
                                                                        v{v}
                                                                    </SelectItem>
                                                                ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-medium">HTTP Endpoint</h3>
                                    <FormDescription>
                                        Each API Route must have a unique Method + Path combination.
                                    </FormDescription>
                                    <div className="space-y-4 mt-4">
                                        <FormField
                                            control={form.control}
                                            name="binding.bindingType"
                                            render={({field}) => (
                                                <FormItem>
                                                    <FormLabel required>Bind type</FormLabel>
                                                    <Select
                                                        onValueChange={(v) =>
                                                            form.setValue("binding.bindingType", v)
                                                        }
                                                        value={field.value}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select a component"/>
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {GatewayBindingType.options.map(
                                                                (data: string) => (
                                                                    <SelectItem value={data} key={data}>
                                                                        {data}
                                                                    </SelectItem>
                                                                ),
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    {filterMethod(form.watch("binding.bindingType")).length >
                                        0 && (
                                            <div className="grid grid-cols-3 gap-4 mt-4">
                                                <FormField
                                                    control={form.control}
                                                    name="method"
                                                    render={({field}) => (
                                                        <FormItem>
                                                            <FormLabel required>Method</FormLabel>
                                                            <Select
                                                                onValueChange={(v) => form.setValue("method", v)}
                                                                value={
                                                                    field.value ||
                                                                    filterMethod(
                                                                        form.watch("binding.bindingType"),
                                                                    )[0]
                                                                }
                                                                disabled={
                                                                    !(
                                                                        form.watch("binding.bindingType") &&
                                                                        filterMethod(
                                                                            form.watch("binding.bindingType"),
                                                                        ).length > 0
                                                                    )
                                                                }
                                                            >
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select Method">
                                                                            {" "}
                                                                            {field.value}{" "}
                                                                        </SelectValue>
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    {form.watch("binding.bindingType") &&
                                                                        filterMethod(
                                                                            form.watch("binding.bindingType"),
                                                                        ).map((v: string) => (
                                                                            <SelectItem value={v} key={v}>
                                                                                {v}
                                                                            </SelectItem>
                                                                        ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage/>
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name="path"
                                                    render={({field}) => (
                                                        <FormItem className="col-span-2">
                                                            <FormLabel required>Path</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    placeholder="/api/v1/resource/<param>"
                                                                    {...field}
                                                                    onChange={(e) => handlePathChange(e)}
                                                                />
                                                            </FormControl>
                                                            {/*<FormDescription>*/}
                                                            {/*    Define path variables with angle brackets (e.g.,*/}
                                                            {/*    /users/id)*/}
                                                            {/*</FormDescription>*/}
                                                            <FormMessage/>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        )}
                                </div>
                                {form.watch("binding.bindingType") != "cors-preflight" && (
                                    <div>
                                        <FormField
                                            control={form.control}
                                            name="binding.workerName"
                                            render={({field}) => (
                                                <FormItem className="mt-4">
                                                    <FormLabel required>Worker Name</FormLabel>
                                                    <FormControl>
                                                        <RibEditor {...field} />
                                                    </FormControl>
                                                    <FormDescription>
                                                        <div className="flex gap-1 items-center">
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <button
                                                                        className="p-1 hover:bg-muted rounded-full transition-colors"
                                                                        aria-label="Show interpolation info"
                                                                    >
                                                                        <Info
                                                                            className="w-4 h-4 text-muted-foreground"/>
                                                                    </button>
                                                                </PopoverTrigger>
                                                                <PopoverContent
                                                                    className="w-[450px] p-4"
                                                                    align="start"
                                                                    sideOffset={5}
                                                                >
                                                                    <h3 className="text-[13px] font-medium text-card-foreground mb-4 border-b pb-2">
                                                                        Common Interpolation Expressions
                                                                    </h3>
                                                                    <div className="space-y-3">
                                                                        {interpolations.map((row) => (
                                                                            <div
                                                                                key={row.label}
                                                                                className="flex items-center justify-between"
                                                                            >
                                        <span
                                            className="text-[12px] px-2.5 py-0.5 bg-secondary rounded-full text-secondary-foreground font-medium">
                                          {row.label}
                                        </span>
                                                                                <code
                                                                                    className="text-[12px] font-mono text-muted-foreground">
                                                                                    {row.expression}
                                                                                </code>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                            Interpolate variables into your Worker ID
                                                        </div>
                                                    </FormDescription>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="binding.response"
                                            render={({field}) => (
                                                <FormItem className="mt-4">
                                                    <FormLabel required>
                            <span className="">
                              Response
                              <Popover
                                  open={isPopoverOpen}
                                  onOpenChange={setIsPopoverOpen}
                              >
                                <PopoverTrigger asChild>
                                  <button
                                      className="p-1 hover:bg-muted rounded-full transition-colors"
                                      aria-label="Show interpolation info"
                                      onClick={togglePopover}
                                  >
                                    <Info className="w-4 h-4 text-muted-foreground"/>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className={`${
                                        responseSuggestions.length === 0
                                            ? "max-w-[450px]"
                                            : "w-[450px]"
                                    }  p-4`}
                                    align="start"
                                    sideOffset={5}
                                >
                                  {responseSuggestions.length > 0 ? (
                                      <div>
                                          <h3 className="text-[13px] font-medium text-card-foreground mb-4 border-b pb-2">
                                              Available Functions
                                          </h3>
                                          <div className="space-y-3 overflow-y-auto max-h-[300px]">
                                              {responseSuggestions.map((row) => (
                                                  <div
                                                      key={row}
                                                      className="flex items-center justify-between"
                                                      onClick={(e) => {
                                                          e.stopPropagation();
                                                          navigator.clipboard.writeText(
                                                              `${row} `,
                                                          );
                                                          toast({
                                                              title: "Copied to clipboard",
                                                              duration: 3000,
                                                          });
                                                          setIsPopoverOpen(false);
                                                      }}
                                                  >
                                            <span
                                                className="text-[12px] min-h-[20px] font-mono text-muted-foreground hover:border-b cursor-pointer">
                                              {row}
                                            </span>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="text-center text-muted-foreground">
                                          No component version selected
                                      </div>
                                  )}
                                </PopoverContent>
                              </Popover>
                            </span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <RibEditor
                                                            {...field}
                                                            scriptKeys={responseSuggestions}
                                                        />
                                                    </FormControl>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />
                                        {/*<FormField*/}
                                        {/*  control={form.control}*/}
                                        {/*  name="response"*/}
                                        {/*  render={({ field }) => (*/}
                                        {/*    <FormItem>*/}
                                        {/*      <FormLabel required>*/}
                                        {/*        <span className="">*/}
                                        {/*          Response*/}
                                        {/*          <Popover*/}
                                        {/*            open={isPopoverOpen}*/}
                                        {/*            onOpenChange={setIsPopoverOpen}*/}
                                        {/*          >*/}
                                        {/*            <PopoverTrigger asChild>*/}
                                        {/*              <button*/}
                                        {/*                className="p-1 hover:bg-muted rounded-full transition-colors"*/}
                                        {/*                aria-label="Show interpolation info"*/}
                                        {/*                onClick={togglePopover}*/}
                                        {/*              >*/}
                                        {/*                <Info className="w-4 h-4 text-muted-foreground" />*/}
                                        {/*              </button>*/}
                                        {/*            </PopoverTrigger>*/}
                                        {/*            <PopoverContent*/}
                                        {/*              className={`${*/}
                                        {/*                responseSuggestions.length === 0*/}
                                        {/*                  ? "max-w-[450px]"*/}
                                        {/*                  : "w-[450px]"*/}
                                        {/*              }  p-4`}*/}
                                        {/*              align="start"*/}
                                        {/*              sideOffset={5}*/}
                                        {/*            >*/}
                                        {/*              {responseSuggestions.length > 0 ? (*/}
                                        {/*                <div>*/}
                                        {/*                  <h3 className="text-[13px] font-medium text-card-foreground mb-4 border-b pb-2">*/}
                                        {/*                    Available Functions*/}
                                        {/*                  </h3>*/}
                                        {/*                  <div className="space-y-3 overflow-y-auto max-h-[300px]">*/}
                                        {/*                    {responseSuggestions.map((row) => (*/}
                                        {/*                      <div*/}
                                        {/*                        key={row}*/}
                                        {/*                        className="flex items-center justify-between"*/}
                                        {/*                        onClick={(e) => {*/}
                                        {/*                          e.stopPropagation();*/}
                                        {/*                          navigator.clipboard.writeText(*/}
                                        {/*                            `${row} `,*/}
                                        {/*                          );*/}
                                        {/*                          toast({*/}
                                        {/*                            title: "Copied to clipboard",*/}
                                        {/*                            duration: 3000,*/}
                                        {/*                          });*/}
                                        {/*                          setIsPopoverOpen(false);*/}
                                        {/*                        }}*/}
                                        {/*                      >*/}
                                        {/*                        <span className="text-[12px] min-h-[20px] font-mono text-muted-foreground hover:border-b cursor-pointer">*/}
                                        {/*                          {row}*/}
                                        {/*                        </span>*/}
                                        {/*                      </div>*/}
                                        {/*                    ))}*/}
                                        {/*                  </div>*/}
                                        {/*                </div>*/}
                                        {/*              ) : (*/}
                                        {/*                <div className="text-center text-muted-foreground">*/}
                                        {/*                  No component version selected*/}
                                        {/*                </div>*/}
                                        {/*              )}*/}
                                        {/*            </PopoverContent>*/}
                                        {/*          </Popover>*/}
                                        {/*        </span>*/}
                                        {/*      </FormLabel>*/}
                                        {/*      <FormControl>*/}
                                        {/*        <div className="relative">*/}
                                        {/*          <Textarea*/}
                                        {/*            placeholder="Define the HTTP response template"*/}
                                        {/*            className="min-h-[130px]"*/}
                                        {/*            {...field}*/}
                                        {/*            onChange={handleResponseChange}*/}
                                        {/*            ref={responseTextareaRef}*/}
                                        {/*          />*/}
                                        {/*          {showResponseSuggestions && (*/}
                                        {/*            <Card*/}
                                        {/*              className="absolute z-10 p-1 space-y-1 shadow-lg min-w-[200px]"*/}
                                        {/*              style={{*/}
                                        {/*                top: `${responseMenuPosition.top}px`,*/}
                                        {/*                left: `${responseMenuPosition.left}px`,*/}
                                        {/*                width: "max-content",*/}
                                        {/*              }}*/}
                                        {/*            >*/}
                                        {/*              {filteredResponseSuggestions.map(*/}
                                        {/*                (suggestion) => (*/}
                                        {/*                  <div*/}
                                        {/*                    key={suggestion}*/}
                                        {/*                    className="px-2 py-1 text-sm cursor-pointer hover:bg-accent"*/}
                                        {/*                    onClick={() =>*/}
                                        {/*                      handleResponseSuggestionClick(*/}
                                        {/*                        suggestion,*/}
                                        {/*                      )*/}
                                        {/*                    }*/}
                                        {/*                  >*/}
                                        {/*                    {suggestion}*/}
                                        {/*                  </div>*/}
                                        {/*                ),*/}
                                        {/*              )}*/}
                                        {/*            </Card>*/}
                                        {/*          )}*/}
                                        {/*        </div>*/}
                                        {/*      </FormControl>*/}
                                        {/*      <FormMessage />*/}
                                        {/*    </FormItem>*/}
                                        {/*  )}*/}
                                        {/*/>*/}
                                    </div>
                                )}

                                {/*<FormField*/}
                                {/*    control={form.control}*/}
                                {/*    name="allowOrigin"*/}
                                {/*    render={({field}) => (*/}
                                {/*        <FormItem>*/}
                                {/*            <FormLabel>Allow Origin</FormLabel>*/}
                                {/*            <FormControl>*/}
                                {/*                <Input*/}
                                {/*                    placeholder="*"*/}
                                {/*                    {...field}*/}
                                {/*                />*/}
                                {/*            </FormControl>*/}
                                {/*            <FormDescription>*/}
                                {/*                Value of the Access-Control-Allow-Origin header. Defaults to "*" if not*/}
                                {/*                provided.*/}
                                {/*            </FormDescription>*/}
                                {/*            <FormMessage/>*/}
                                {/*        </FormItem>*/}
                                {/*    )}*/}
                                {/*/>*/}
                                {/*<FormField*/}
                                {/*    control={form.control}*/}
                                {/*    name="allowMethods"*/}
                                {/*    render={({field}) => (*/}
                                {/*        <FormItem>*/}
                                {/*            <FormLabel>Allow Methods</FormLabel>*/}
                                {/*            <FormControl>*/}
                                {/*                <Input*/}
                                {/*                    placeholder="GET, POST, PUT, DELETE, OPTIONS"*/}
                                {/*                    {...field}*/}
                                {/*                />*/}
                                {/*            </FormControl>*/}
                                {/*            <FormDescription>*/}
                                {/*                Value of the Access-Control-Allow-Methods header. Defaults to "GET,*/}
                                {/*                POST, PUT, DELETE, OPTIONS" if not provided.*/}
                                {/*            </FormDescription>*/}
                                {/*            <FormMessage/>*/}
                                {/*        </FormItem>*/}
                                {/*    )}*/}
                                {/*/>*/}
                                {/*<FormField*/}
                                {/*    control={form.control}*/}
                                {/*    name="allowHeaders"*/}
                                {/*    render={({field}) => (*/}
                                {/*        <FormItem>*/}
                                {/*            <FormLabel>Allow Methods</FormLabel>*/}
                                {/*            <FormControl>*/}
                                {/*                <Input*/}
                                {/*                    placeholder="Content-Type, Authorization"*/}
                                {/*                    {...field}*/}
                                {/*                />*/}
                                {/*            </FormControl>*/}
                                {/*            <FormDescription>*/}
                                {/*                Value of the Access-Control-Allow-Headers header. Defaults to*/}
                                {/*                "Content-Type, Authorization" if not provided.*/}
                                {/*            </FormDescription>*/}
                                {/*            <FormMessage/>*/}
                                {/*        </FormItem>*/}
                                {/*    )}*/}
                                {/*/>*/}

                                <div className="flex justify-end space-x-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => form.reset()}
                                        disabled={isSubmitting}
                                    >
                                        Clear
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                                Creating...
                                            </>
                                        ) : (
                                            <div>{isEdit ? "Edit Route" : "Create Route"}</div>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    )}
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default CreateRoute;
