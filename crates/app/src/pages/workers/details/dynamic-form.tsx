import type React from "react"
import {useState} from "react"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Checkbox} from "@/components/ui/checkbox"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {JsonEditor} from "@/pages/workers/details/json-editor.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";

type FieldType = {
    name: string
    typ?: any
    type?: string
}

type FormData = {
    [key: string]: any
}

const schema: FieldType[] = [
    {name: "id", typ: {type: "U64"}},
    {name: "areyouin", typ: {type: "Bool"}},
    {name: "name", typ: {type: "Str"}},
    {name: "looking-for", typ: {cases: ["free", "premium", "vip"], type: "Enum"}},
    {name: "title", typ: {"inner": {"type": "Str"}, "type": "Option"}},
    {
        name: "input",
        typ: {
            type: "Record",
            fields: [
                {name: "title", typ: {type: "Option", inner: {type: "Str"}}},
                {name: "description", typ: {type: "Option", inner: {type: "Str"}}},
                {name: "completed", typ: {type: "Option", inner: {type: "Bool"}}},
                {name: "due-date", typ: {type: "Option", inner: {type: "U64"}}},
            ],
        },
    },
]

const DynamicForm: React.FC = () => {
    const [formData, setFormData] = useState<FormData>({})
    const [errors, setErrors] = useState<string[]>([])

    const handleInputChange = (name: string, value: any) => {
        setFormData((prevData) => ({...prevData, [name]: value}))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const validationErrors = validateForm(formData, schema)
        if (validationErrors.length === 0) {
            console.log("Form data:", formData)
            setErrors([])
        } else {
            setErrors(validationErrors)
        }
    }

    const validateForm = (data: FormData, schema: FieldType[]): string[] => {
        const errors: string[] = []
        schema.forEach((field) => {
            const value = data[field.name]
            if (field.typ.type === "Record") {
                try {
                    JSON.parse(value)
                } catch (e) {
                    errors.push(`${field.name}: Invalid JSON`)
                }
            } else if (value === undefined || value === "") {
                errors.push(`${field.name} is required`)
            } else if (field.typ.type === "U64") {
                if (!Number.isInteger(Number(value)) || Number(value) < 0) {
                    errors.push(`${field.name} must be a non-negative integer`)
                }
            } else if (field.typ.type === "Bool" && typeof value !== "boolean") {
                errors.push(`${field.name} must be a boolean`)
            }
        })
        return errors
    }

    const generateSamplePayload = (field: FieldType): any => {
        const {typ, type} = field
        const fileType = type || typ.type;
        if (fileType === "Record") {
            const sampleRecord: Record<string, any> = {}
            typ.fields.forEach((subField: FieldType) => {
                sampleRecord[subField.name] = generateSamplePayload(subField)
            })
            return sampleRecord
        }

        if (fileType === "Option") {
            return `Option<${generateSamplePayload(typ.inner)}>`
        }

        switch (fileType) {
            case "Str":
                return "<string>"
            case "U64":
                return "<u64>"
            case "Bool":
                return "<bool>"
            case "Enum":
                return `enum <${typ.cases.join(", ")}>`
            default:
                return null
        }
    }

    const generateJsonSchema = (field: FieldType): any => {
        const {typ} = field

        if (typ.type === "Record") {
            const properties: Record<string, any> = {}
            typ.fields.forEach((subField: FieldType) => {
                properties[subField.name] = generateJsonSchema(subField)
            })
            return {type: "object", properties}
        }

        if (typ.type === "Option") {
            return {anyOf: [{type: "null"}, generateJsonSchema({name: field.name, typ: typ.inner})]}
        }

        switch (typ.type) {
            case "Str":
                return {type: "string"}
            case "U64":
                return {type: "integer", minimum: 0}
            case "Bool":
                return {type: "boolean"}
            case "Enum":
                return {type: "string", enum: typ.cases}
            default:
                return {}
        }
    }

    const buildInput = (field: FieldType, index: number) => {
        let {name, typ} = field
        let isOptional = false;
        if (typ.type === "Option") {
            isOptional = true;
        }
        if (isOptional) {
            typ = typ.inner;
        }
        switch (typ.type) {
            case "Str":
            case "U64":
                return (<Input
                    type={typ.type === "Str" ? "text" : "number"}
                    placeholder={name}
                    onChange={(e) => handleInputChange(`input-${index}`, e.target.value)}
                />)
            case "Bool":
                return (<Checkbox
                    id={name}
                    onCheckedChange={(checked) => handleInputChange(`input-${index}`, checked)}
                />)
            case "Enum":
                return (
                    <Select onValueChange={(value) => handleInputChange(`input-${index}`, value)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an option"/>
                        </SelectTrigger>
                        <SelectContent>
                            {(typ.cases || []).map((option: string) => (
                                <SelectItem key={option} value={option}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )
            case "List":
            case "Record": {
                const samplePayload = generateSamplePayload(field)
                return (<JsonEditor
                    value={JSON.stringify(samplePayload, null, 2)}
                    onChange={(value) => handleInputChange(`input-${index}`, value)}
                />)
            }
            default:
                return (<></>)
        }
    }

    const renderField = (field: FieldType, index: number): React.ReactNode => {
        let {name, typ} = field
        let isOptional = false;
        if (typ.type === "Option") {
            isOptional = true;
        }
        if (isOptional) {
            typ = typ.inner;
        }
        const isPrimitive = typ.type === "Str" || typ.type === "Chr" || typ.type === "Bool" || typ.type === "F64" || typ.type === "F32" || typ.type === "U64" || typ.type === "S64" || typ.type === "U32" || typ.type === "S32" || typ.type === "U16" || typ.type === "S16" || typ.type === "U8" || typ.type === "S8";


        let dataType = "String";
        if (typ.type === "Str" || typ.type === "Chr") {
            dataType = "String";
        } else if (typ.type === "Bool") {
            dataType = "Boolean";
        } else if (typ.type === "F64" || typ.type === "F32") {
            dataType = "Float";
        } else if (typ.type === "U64" || typ.type === "S64" || typ.type === "U32" || typ.type === "S32" || typ.type === "U16" || typ.type === "S16" || typ.type === "U8" || typ.type === "S8") {
            dataType = "Unsigned Integer";
        } else if (typ.type === "I32" || typ.type === "I64") {
            dataType = "Signed Integer";
        } else {
            dataType = generateJsonSchema(field);
        }


        return (
            <div key={name} className="mb-4">
                <Label>
                    &nbsp;Args {index + 1} <span
                    className="ml-2 text-zinc-400">{isOptional ? "(Optional)" : ""}</span>: &nbsp;
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button className="text-emerald-400 hover:underline cursor-help inline-flex items-center">
                                {name}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent
                            className="w-[350px] font-mono text-[13px] bg-zinc-900 border-zinc-700 text-zinc-100 p-0"
                            side="right"
                            sideOffset={5}
                        >
                            {!isPrimitive && (<div
                                className="flex items-center justify-between bg-zinc-800 px-4 py-2 border-b border-zinc-700">
                                <span className="font-semibold">Type Details</span>
                            </div>)}
                            <div className="p-4 space-y-1">
                                <div>
                                    <span className="text-purple-400">{dataType}</span>
                                </div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </Label>
                <br/>
                {buildInput(field, index)}
            </div>
        )

        // if (typ.type === "Record") {
        //     const samplePayload = generateSamplePayload(field)
        //     const jsonSchema = generateJsonSchema(field)
        //
        //     return (
        //         <div key={name} className="mb-4">
        //             <Label>{name}</Label>
        //             <JsonEditor
        //                 value={JSON.stringify(samplePayload, null, 2)}
        //                 onChange={(value) => handleInputChange(name, value)}
        //                 // schema={jsonSchema}
        //             />
        //         </div>
        //     )
        // }
        //
        // if (typ.type === "Str" || typ.type === "U64") {
        //     return (
        //         <div key={name} className="mb-4">
        //             <Label htmlFor={name}>{name}</Label>
        //             <Input
        //                 id={name}
        //                 type={typ.type === "Str" ? "text" : "number"}
        //                 value={formData[name] || ""}
        //                 onChange={(e) => handleInputChange(name, e.target.value)}
        //             />
        //         </div>
        //     )
        // }
        //
        // if (typ.type === "Bool") {
        //     return (
        //         <div key={name} className="mb-4 flex items-center space-x-2">
        //             <Checkbox
        //                 id={name}
        //                 checked={formData[name] || false}
        //                 onCheckedChange={(checked) => handleInputChange(name, checked)}
        //             />
        //             <Label htmlFor={name}>{name}</Label>
        //         </div>
        //     )
        // }
        //
        // if (typ.type === "Enum") {
        //     return (
        //         <div key={name} className="mb-4">
        //             <Label htmlFor={name}>{name}</Label>
        //             <Select onValueChange={(value) => handleInputChange(name, value)}>
        //                 <SelectTrigger>
        //                     <SelectValue placeholder="Select an option"/>
        //                 </SelectTrigger>
        //                 <SelectContent>
        //                     {(typ.cases || []).map((option: string) => (
        //                         <SelectItem key={option} value={option}>
        //                             {option}
        //                         </SelectItem>
        //                     ))}
        //                 </SelectContent>
        //             </Select>
        //         </div>
        //     )
        // }
        //
        // console.log(`Unhandled field type: ${typ.type}`)
        // return null
    }

    return (
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle>Dynamic Form</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent>
                    {schema.map((field, index) => renderField(field, index))}
                    {(errors || []).length > 0 && (
                        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
                            {(errors || []).map((error, index) => (
                                <p key={index}>{error}</p>
                            ))}
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button type="submit">Submit</Button>
                </CardFooter>
            </form>
        </Card>
    )
}

export default DynamicForm

