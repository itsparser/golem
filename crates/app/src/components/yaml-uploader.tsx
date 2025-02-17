/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input.tsx";
import * as yaml from "js-yaml";
import {Upload} from "lucide-react";
import {useEffect, useState} from "react";
import {YamlEditor} from "./yaml-editor";
import {API} from "@/service";
import {Api} from "@/types/api.ts";
import {useNavigate, useParams, useSearchParams} from "react-router-dom";
import {ENDPOINT} from "@/service/endpoints.ts";

export default function YamlUploader() {
  const { apiName, version } = useParams();
  const navigate = useNavigate();
  const [queryParams] = useSearchParams();
  const path = queryParams.get("path");
  const method = queryParams.get("method");
  const [isLoading, setIsLoading] = useState(false);
  const [yamlContent, setYamlContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeApiDetails, setActiveApiDetails] = useState<Api | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!apiName) return;
      try {
        setIsLoading(true);
        const [apiResponse, componentResponse] = await Promise.all([
          API.getApi(apiName),
          API.getComponentByIdAsKey(),
        ]);
        const selectedApi = apiResponse.find(api => api.version === version);
        setActiveApiDetails(selectedApi!);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setFetchError("Failed to load required data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [apiName, version, path, method]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setFileName(file.name);
      const content = await file.text();

      // Validate YAML before setting content
      yaml.load(content);
      setYamlContent(content);
    } catch (error) {
      console.error("Invalid YAML file:", error);
      // You might want to show an error toast or message here
    }
  };

  const onSubmit = async (payload: any) => {
    console.log("selectedApi", payload);
    try {
      setIsSubmitting(true);

      const apiResponse = await API.getApi(apiName!);
      const selectedApi = apiResponse.find(api => api.version === version);
      console.log("selectedApi", apiName, version, payload);
      const r = await API.callApi(
        ENDPOINT.putApi(apiName, version),
        "PUT",
        payload,
        { "Content-Type": "application/yaml" },
      ).then(() => {
        window.location.reload();
      });
    } catch (error) {
      console.error("Failed to create route:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Validate YAML before submitting
      yaml.load(yamlContent);

      onSubmit(yamlContent);

      // Reset state and close dialog
      setYamlContent("");
      setFileName("");
      setIsOpen(false);
    } catch (error) {
      console.error("Error uploading YAML:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Upload YAML
        </Button>
      </DialogTrigger>
      <DialogContent className="min-h-[30vh] min-w-[50vw]">
        <DialogHeader>
          <DialogTitle>Upload and Edit YAML</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid w-full items-center gap-1.5">
            <Input
              type="file"
              accept=".yaml,.yml"
              onChange={handleFileChange}
              className="cursor-pointer file:cursor-pointer file:border-0"
            />
          </div>
          <>
            <YamlEditor value={yamlContent} onChange={setYamlContent} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </>
        </div>
      </DialogContent>
    </Dialog>
  );
}
