import { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Loader2, Plus } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import ErrorBoundary from "@/components/errorBoundary";
import { API } from "@/service";
import { useNavigate } from "react-router-dom";

// Define API definition type
interface ApiDefinition {
  id: string;
  versions: string[];
}

const formSchema = z.object({
  domain: z
    .string()
    .min(1, "Domain is required")
    .regex(
      /^localhost(:\d{1,5})?$/,
      "Please enter a valid localhost domain (e.g., localhost:3000)"
    )
    .refine(
      (value) => {
        if (value.includes(":")) {
          const port = parseInt(value.split(":")[1]);
          return port >= 1 && port <= 65535;
        }
        return true;
      },
      { message: "Port number must be between 1 and 65535" }
    )
    .transform((value) => value.toLowerCase())
    .refine(
      (value) => !value.startsWith("http://") && !value.startsWith("https://"),
      { message: "Do not include http:// or https://" }
    )
    .refine(
      (value) => {
        if (!value.includes(":")) {
          return false;
        }
        return true;
      },
      { message: "Port number is required (e.g., localhost:3000)" }
    ),
  definitions: z
    .array(
      z.object({
        id: z.string().min(1, "API definition is required"),
        version: z.string().min(1, "Version is required"),
      })
    )
    .min(1, "At least one API definition is required")
    .refine(
      (definitions) => {
        const ids = definitions.map((d) => d.id);
        return new Set(ids).size === ids.length;
      },
      { message: "Each API can only be added once" }
    ),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateDeployment() {
  const [apiDefinitions, setApiDefinitions] = useState<ApiDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      domain: "localhost:3000",
      definitions: [{ id: "", version: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "definitions",
  });

  // Fetch API definitions with retry logic
  useEffect(() => {
    const fetchApiDefinitions = async (retryCount = 0) => {
      try {
        setIsLoading(true);
        setFetchError(null);
        const response = await API.getApiList();
        const transformedData = Object.values(
          response.reduce((acc, api) => {
            if (!acc[api.id]) {
              acc[api.id] = { id: api.id, versions: [] };
            }
            acc[api.id].versions.push(api.version);
            // Sort versions in descending order
            acc[api.id].versions.sort((a, b) =>
              b.localeCompare(a, undefined, { numeric: true })
            );
            return acc;
          }, {} as Record<string, ApiDefinition>)
        ).sort((a, b) => a.id.localeCompare(b.id)); // Sort APIs alphabetically

        setApiDefinitions(transformedData);
      } catch (error) {
        console.error("Failed to fetch API definitions:", error);
        setFetchError("Failed to load API definitions. Please try again.");

        // Retry logic (max 3 attempts)
        if (retryCount < 3) {
          setTimeout(
            () => fetchApiDefinitions(retryCount + 1),
            1000 * (retryCount + 1)
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchApiDefinitions();
  }, []);

  // Memoize getVersionsForApi to prevent unnecessary recalculations
  const getVersionsForApi = useMemo(() => {
    return (apiId: string) => {
      return apiDefinitions.find((api) => api.id === apiId)?.versions || [];
    };
  }, [apiDefinitions]);

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      const payload = {
        site: {
          host: data.domain,
          subdomain: null,
        },
        apiDefinitions: data.definitions,
      };
      await API.createDeployment(payload);
      navigate("/deployments");
    } catch (error) {
      console.error("Failed to create deployment:", error);
      form.setError("root", {
        type: "manual",
        message: "Failed to create deployment. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show error state if API fetch fails
  if (fetchError) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex flex-col items-center justify-center space-y-4 p-8 border rounded-lg bg-destructive/10">
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
      <div className="p-6 max-w-3xl mx-auto">
        <div className="space-y-2 mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Deploy API</h1>
          <p className="text-muted-foreground">
            Create a new deployment with one or more API definitions
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Local Domain
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="localhost:3000"
                        {...field}
                        onChange={(e) => {
                          // Remove any http/https if user pastes them
                          const value = e.target.value
                            .replace(/^https?:\/\//, "")
                            .toLowerCase();
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormDescription className="text-sm text-muted-foreground">
                      Enter localhost with a port number (e.g., localhost:3000).
                      The port must be between 1 and 65535.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-base font-medium">API Definitions</h2>
                  <p className="text-sm text-muted-foreground">
                    Select the APIs and their versions to deploy. Each API can
                    only be added once.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Check if there are any empty definitions before adding new one
                    const hasEmptyDefinition = form
                      .getValues("definitions")
                      .some((def) => !def.id || !def.version);
                    if (!hasEmptyDefinition) {
                      append({ id: "", version: "" });
                    }
                  }}
                  disabled={
                    isLoading ||
                    form
                      .getValues("definitions")
                      .some((def) => !def.id || !def.version)
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add API
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading API definitions...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid gap-4 items-start md:grid-cols-[1fr,1fr,auto] p-4 border rounded-lg"
                    >
                      <FormField
                        control={form.control}
                        name={`definitions.${index}.id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">
                              API Definition
                            </FormLabel>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                form.setValue(
                                  `definitions.${index}.version`,
                                  ""
                                );
                              }}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select API" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {apiDefinitions.map((api) => (
                                  <SelectItem key={api.id} value={api.id}>
                                    {api.id}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`definitions.${index}.version`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">
                              Version
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={!form.watch(`definitions.${index}.id`)}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select version" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {getVersionsForApi(
                                  form.watch(`definitions.${index}.id`)
                                ).map((version) => (
                                  <SelectItem key={version} value={version}>
                                    {version}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={fields.length === 1}
                        className="mt-8 bg-destructive/20 hover:bg-destructive/50"
                        onClick={() => remove(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || isLoading}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  "Deploy"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </ErrorBoundary>
  );
}