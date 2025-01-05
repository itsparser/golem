import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { API } from "@/service";
import { Api } from "@/types/api";
import { Component } from "@/types/component";
import ErrorBoundary from "@/components/errorBoundary";
import { toast } from "@/hooks/use-toast";

const HTTP_METHODS = [
  "Get",
  "Post",
  "Put",
  "Patch",
  "Delete",
  "Head",
  "Options",
  "Trace",
  "Connect",
] as const;

const routeSchema = z.object({
  method: z.enum(HTTP_METHODS),
  path: z
    .string()
    .min(1, "Path is required")
    .regex(/^\//, "Path must start with /")
    .regex(
      /^[a-zA-Z0-9\/\-_<>{}]+$/,
      "Path can only contain letters, numbers, slashes, hyphens, underscores, and path parameters in <>"
    ),
  componentId: z.string().min(1, "Component is required"),
  version: z.string().min(0, "Version is required"),
  workerName: z
    .string()
    .min(1, "Worker Name is required")
    .max(100, "Worker Name cannot exceed 100 characters"),
  response: z.string().optional(),
});

type RouteFormValues = z.infer<typeof routeSchema>;

const CreateRoute = () => {
  const navigate = useNavigate();
  const { apiName, version } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [componentList, setComponentList] = useState<{
    [key: string]: Component;
  }>({});
  const [isEdit, setIsEdit] = useState(false);
  const [activeApiDetails, setActiveApiDetails] = useState<Api | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [queryParams] = useSearchParams();
  const path = queryParams.get("path");
  const method = queryParams.get("method");

  const form = useForm<RouteFormValues>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      method: "Get",
      path: "",
      componentId: "",
      version: version || "0",
      workerName: "",
      response: "",
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
            (route) => route.path === path && route.method === method
          );
          form.setValue("method", route?.method || "Get");
          form.setValue("path", route?.path || "");
          form.setValue(
            "componentId",
            route?.binding?.componentId?.componentId || ""
          );
          form.setValue("version", route?.binding?.componentId?.version || "");
          form.setValue("workerName", route?.binding?.workerName || "");
          form.setValue("response", route?.binding?.response || "");
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
        });
        return;
      }
      selectedApi.routes = selectedApi.routes.filter(
        (route) =>
          !(route.path === values.path && route.method === values.method)
      );
      selectedApi.routes.push({
        method: values.method,
        path: values.path,
        binding: {
          componentId: {
            componentId: values.componentId,
            version: parseInt(values.version),
          },
          workerName: values.workerName,
          response: values.response,
        },
      });
      console.log("selectedApi", selectedApi);

      await API.putApi(
        activeApiDetails.id,
        activeApiDetails.version,
        selectedApi
      ).then(() => {
        navigate(
          `/apis/${apiName}/version/${version}/routes?path=${values.path}&method=${values.method}`
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
      <div className="overflow-y-auto h-[80vh]">
        <div className="max-w-4xl mx-auto p-8">
          <div className="flex items-center gap-2 mb-8">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/apis/${apiName}/version/${version}`)}
            >
              <ArrowLeft className="mr-2" />
              Back
            </Button>
            <span className="text-lg font-medium">
              {isEdit ? "Edit Route" : "Create New Route"}
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading...</span>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-lg font-medium">HTTP Endpoint</h3>
                  <FormDescription>
                    Each API Route must have a unique Method + Path combination.
                  </FormDescription>
                  <div className="space-y-4 mt-4">
                    <FormField
                      control={form.control}
                      name="method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Method</FormLabel>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {HTTP_METHODS.map((m) => (
                              <Button
                                type="button"
                                key={m}
                                variant={
                                  field.value === m ? "default" : "outline"
                                }
                                size="sm"
                                onClick={() => field.onChange(m)}
                              >
                                {m}
                              </Button>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="path"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Path</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="/api/v1/resource/<param>"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Define path variables with angle brackets (e.g.,
                            /users/id)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Worker Binding</h3>
                  <FormDescription>
                    Bind this endpoint to a specific worker function.
                  </FormDescription>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="componentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Component</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a component" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.values(componentList).map(
                                (data: Component) => (
                                  <SelectItem
                                    value={data.componentId || ""}
                                    key={data.componentName}
                                  >
                                    {data.componentName}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="version"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Version</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={`${field.value}`}
                            disabled={!form.watch("componentId")}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select version" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {form.watch("componentId") &&
                                componentList[
                                  form.watch("componentId")
                                ]?.versionId?.map((v: string) => (
                                  <SelectItem value={v} key={v}>
                                    v{v}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="workerName"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Worker Name</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Interpolate variables into your Worker ID"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Unique identifier for your worker instance
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="response"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Response</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Define the HTTP response template"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Define the HTTP response for this API Route
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Route"
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
