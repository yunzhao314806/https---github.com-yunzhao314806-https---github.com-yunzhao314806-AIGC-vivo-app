
import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "./input"
import { FileUp } from "lucide-react"

interface FileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: React.ReactNode
  error?: string
  hint?: string
}

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({ className, label, icon, error, hint, id, ...props }, ref) => {
    const [fileName, setFileName] = React.useState<string>("")
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        setFileName(e.target.files[0].name)
      } else {
        setFileName("")
      }
      
      // Call the original onChange handler if provided
      if (props.onChange) {
        props.onChange(e)
      }
    }
    
    return (
      <div className="field-container">
        {label && (
          <label htmlFor={id} className="field-label">
            {label}
          </label>
        )}
        
        <div className="relative">
          {icon && (
            <div className="field-icon">
              {icon}
            </div>
          )}
          
          <div className={cn(
            "form-input flex items-center justify-between cursor-pointer",
            icon && "input-with-icon",
            error && "border-red-500",
            className
          )}>
            <span className={cn(
              "truncate flex-1",
              fileName ? "text-gray-900" : "text-gray-400"
            )}>
              {fileName || props.placeholder || "Choisir un fichier..."}
            </span>
            
            <button
              type="button"
              className="ml-2 px-3 py-1 bg-stages-blue text-white rounded-md text-sm hover:bg-opacity-90 transition-all inline-flex items-center"
              onClick={() => document.getElementById(id as string)?.click()}
            >
              <FileUp size={16} className="mr-1" />
              Parcourir
            </button>
            
            <Input
              id={id}
              type="file"
              className="sr-only"
              onChange={handleChange}
              ref={ref}
              {...props}
            />
          </div>
        </div>
        
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
      </div>
    )
  }
)

FileInput.displayName = "FileInput"

export { FileInput }
