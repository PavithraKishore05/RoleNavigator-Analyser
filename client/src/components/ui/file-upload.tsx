import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CloudUpload, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  error?: string;
}

export function FileUpload({ onFileSelect, isUploading, uploadProgress, error }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  const hasFileError = fileRejections.length > 0;
  const fileError = fileRejections[0]?.errors[0]?.message;

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={cn(
          "relative bg-white rounded-xl shadow-sm border-2 border-dashed p-12 text-center transition-all duration-200 cursor-pointer",
          isDragActive || dragActive
            ? "border-primary bg-blue-50"
            : "border-gray-300 hover:border-gray-400",
          hasFileError && "border-red-300 bg-red-50",
          isUploading && "pointer-events-none opacity-60"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors",
            isDragActive || dragActive ? "bg-primary/20" : "bg-primary/10",
            hasFileError && "bg-red-100"
          )}>
            {hasFileError ? (
              <AlertCircle className="h-8 w-8 text-red-500" />
            ) : (
              <CloudUpload className={cn(
                "h-8 w-8",
                isDragActive || dragActive ? "text-primary" : "text-primary"
              )} />
            )}
          </div>

          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {isUploading ? "Analyzing Resume..." : "Upload Your Resume"}
          </h3>

          {isUploading ? (
            <div className="w-full max-w-xs mb-4">
              <Progress value={uploadProgress || 0} className="mb-2" />
              <p className="text-sm text-gray-600">Processing your resume...</p>
            </div>
          ) : (
            <>
              <p className="text-gray-600 mb-4">
                {isDragActive
                  ? "Drop your PDF file here"
                  : "Drag and drop your PDF file here, or click to browse"
                }
              </p>
              <p className="text-sm text-gray-500 mb-6">
                For best results, use a text-based PDF resume (not scanned images). 
                Try our sample resumes below if you encounter upload issues.
              </p>

              <Button 
                type="button"
                disabled={isUploading}
                className="bg-primary hover:bg-blue-700 text-white px-6 py-3"
              >
                Choose File
              </Button>
            </>
          )}

          <p className="text-sm text-gray-500 mt-4">
            Supports PDF files up to 10MB
          </p>

          {(hasFileError || error) && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-sm text-red-600">
                  {error || fileError || "Please upload a valid PDF file"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
