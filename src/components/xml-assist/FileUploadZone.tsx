import { useState, useRef, useCallback } from 'react'
import { Upload, FileCode2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface FileUploadZoneProps {
  onFileSelected: (file: File) => void
  uploading: boolean
}

export default function FileUploadZone({ onFileSelected, uploading }: FileUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith('.xml')) {
        toast.error('Please select an XML file')
        return
      }
      onFileSelected(file)
    },
    [onFileSelected],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        disabled={uploading}
        className={cn(
          'group relative flex w-full max-w-lg flex-col items-center justify-center gap-4',
          'rounded-2xl border-2 border-dashed p-12 transition-all duration-200',
          'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          dragOver
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border hover:border-primary/50 hover:bg-accent/50',
          uploading && 'pointer-events-none opacity-60',
        )}
      >
        <div
          className={cn(
            'flex size-16 items-center justify-center rounded-2xl transition-colors',
            dragOver ? 'bg-primary/15' : 'bg-primary/10 group-hover:bg-primary/15',
          )}
        >
          {uploading ? (
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : dragOver ? (
            <Upload className="size-8 text-primary" />
          ) : (
            <FileCode2 className="size-8 text-primary" />
          )}
        </div>

        <div className="text-center space-y-1.5">
          <h3 className="text-lg font-semibold text-foreground">
            {uploading ? 'Uploading...' : 'Upload XML File'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {dragOver
              ? 'Drop your file here'
              : 'Drag and drop an XML file here, or click to browse'}
          </p>
          <p className="text-xs text-muted-foreground/60">Supports .xml files</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xml"
          onChange={handleInputChange}
          className="hidden"
        />
      </button>
    </div>
  )
}
