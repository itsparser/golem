import type React from "react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CircleSlash2, Info, Play, TimerReset } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  parseToJsonEditor,
  parseTooltipTypesData,
  safeFormatJSON,
} from "@/lib/worker";
import { CodeBlock, dracula } from "react-code-blocks";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type FieldType = {
  name: string;
  typ?: any;
  type?: string;
};

type FormData = {
  [key: string]: any;
};

export const DynamicForm = ({ functionDetails }) => {
  const [formData, setFormData] = useState<FormData>({});
  const [errors, setErrors] = useState({});

  const handleInputChange = (name: string, value: any) => {
    setFormData((prevData) => ({ ...prevData, [name]: value }));
    setErrors((prevErrors) => ({ ...prevErrors, [name]: undefined }));
  };

  const handleSubmit = () => {
    const validationErrors = validateForm();
    setErrors(validationErrors);
  };

  const validateForm = (): string[] => {
    const errors = {};
    functionDetails.parameters.forEach((field) => {
      const value = formData[field.name];
      if (
        [
          "S64",
          "S32",
          "S16",
          "S8",
          "U64",
          "U32",
          "U16",
          "U8",
          "bool",
          "enum",
        ].includes(field.typ.type) &&
        value === undefined
      ) {
        errors[field.name] = `${field.name} is required`;
      }
    });
    return errors;
  };

  console.log(formData, "formData");

  const buildInput = (field: FieldType, index: number, isOptional: boolean) => {
    let { name, typ } = field;
    if (isOptional) {
      typ = typ.inner;
    }
    const value = formData[name] ?? "";
    switch (typ.type) {
      case "S64":
      case "S32":
      case "S16":
      case "S8":
        return (
          <Input
            type={"number"}
            step="1"
            value={value}
            className={errors[name] ? "border-red-500" : ""}
            onChange={(e) => handleInputChange(name, e.target.value)}
          />
        );
      case "U64":
      case "U32":
      case "U16":
      case "U8":
        return (
          <Input
            type={"number"}
            min="0"
            value={value}
            className={errors[name] ? "border-red-500" : ""}
            onChange={(e) => handleInputChange(name, e.target.value)}
          />
        );
      case "Str":
      case "Chr":
        return (
          <Input
            type={"text"}
            value={value}
            className={errors[name] ? "border-red-500" : ""}
            onChange={(e) => handleInputChange(name, e.target.value)}
          />
        );
      case "Bool":
        return (
          <RadioGroup
            value={value}
            onValueChange={(checked) => handleInputChange(name, checked)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id="r1" />
              <Label htmlFor="r1">True</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id="r2" />
              <Label htmlFor="r2">False</Label>
            </div>
          </RadioGroup>
        );
      case "Enum":
        return (
          <Select
            value={value}
            onValueChange={(value) => handleInputChange(name, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {(typ.cases || []).map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default: {
        const samplePayload = JSON.stringify(
          parseToJsonEditor({ parameters: [{ ...field }] })?.[0],
          null,
          2
        );
        return (
          <Textarea
            value={value || samplePayload}
            onChange={(e) => {
              const newValue = safeFormatJSON(e.target.value);
              console.log(newValue, "newValue");
              handleInputChange(name, newValue);
            }}
            className={`min-h-[400px] font-mono text-sm mt-2 ${
              errors[name] ? "border-red-500" : ""
            }`}
          />
        );
      }
    }
  };

  const renderField = (field: FieldType, index: number): React.ReactNode => {
    let { name, typ } = field;
    let isOptional = false;
    let isPrimitive = true;
    if (typ.type === "Option") {
      isOptional = true;
    }
    let dataType = "";
    if (typ.type === "Str" || typ.type === "Chr") {
      dataType = "String";
    } else if (typ.type === "Bool") {
      dataType = "Boolean";
    } else if (typ.type === "F64" || typ.type === "F32") {
      dataType = "Float";
    } else if (
      typ.type === "U64" ||
      typ.type === "U32" ||
      typ.type === "U16" ||
      typ.type === "U8" ||
      typ.type === "S8"
    ) {
      dataType = "Unsigned Integer";
    } else if (typ.type === "S64" || typ.type === "S32" || typ.type === "S16") {
      dataType = "Signed Integer";
    } else {
      isPrimitive = false;
      dataType = typ.type;
    }

    const parsedType = parseTooltipTypesData({ parameters: [{ ...field }] });

    return (
      <div key={name} className="mb-4">
        <Label>
          <div className="items-center text-center flex">
            <div>{name}</div>
            <div className="ml-2 text-zinc-400">
              {isOptional ? "(Optional)" : ""}
            </div>

            <div className="text-emerald-400 inline-flex items-center mr-2">
              : &nbsp; {dataType}
            </div>
            {!isPrimitive && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="p-1 hover:bg-muted rounded-full transition-colors"
                    aria-label="Show interpolation info"
                  >
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[500px] font-mono text-[13px] bg-zinc-900 border-zinc-700 text-zinc-100 p-0 max-h-[500px] overflow-scroll"
                  side="right"
                  sideOffset={5}
                >
                  <CodeBlock
                    text={JSON.stringify(parsedType?.[0], null, 2)}
                    language="json"
                    theme={dracula}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </Label>
        <div className="py-2">
          <div>{buildInput(field, index, isOptional)}</div>
          {errors[field.name] && (
            <div className="text-red-500 text-sm mt-2">
              {errors[field.name]}
            </div>
          )}
        </div>
      </div>
    );
  };

  console.log(functionDetails, "functionDetails.parameters");
  return (
    <div>
      <Card className="w-full">
        <form>
          <CardContent className="p-6">
            {functionDetails.parameters.length > 0 ? (
              functionDetails.parameters.map((field, index) =>
                renderField(field, index)
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-center gap-4">
                <div>
                  <CircleSlash2 className="h-12 w-12 text-muted-foreground" />
                </div>
                <div>No Parameters</div>
                <div className="text-muted-foreground">
                  This function has no parameters. You can invoke it without any
                  arguments.
                </div>
              </div>
            )}
            {(errors || []).length > 0 && (
              <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
                {(errors || []).map((error, index) => (
                  <p key={index}>{error}</p>
                ))}
              </div>
            )}
          </CardContent>
        </form>
      </Card>
      <div className="flex gap-4 justify-end mt-4">
        <Button
          variant="outline"
          onClick={() => setFormData({})}
          className="text-primary hover:bg-primary/10 hover:text-primary"
        >
          <TimerReset className="h-4 w-4 mr-1" />
          Reset
        </Button>
        <Button
          onClick={() => {
            handleSubmit();
          }}
        >
          <Play className="h-4 w-4 mr-1" />
          Invoke
        </Button>
      </div>
    </div>
  );
};
