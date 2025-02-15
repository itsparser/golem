/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input.tsx";
import * as yaml from "js-yaml";
import { Upload } from "lucide-react";
import { useState } from "react";
import { YamlEditor } from "./yaml-editor";

export default function YamlUploader() {
  const [yamlContent, setYamlContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Validate YAML before submitting
      yaml.load(yamlContent);

      const response = await fetch("/api/upload-yaml", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: yamlContent, fileName }),
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

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
