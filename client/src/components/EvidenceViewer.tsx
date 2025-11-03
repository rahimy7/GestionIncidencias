import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Download, 
  Eye, 
  FileText, 
  ImageIcon, 
  X, 
  ZoomIn, 
  ZoomOut,
  RotateCw,
  Upload,
  Trash2,
  Plus,
  CheckCircle,
  AlertCircle,
  File
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EvidenceFile {
  id?: string;
  url: string;
  filename?: string;
  uploadedAt?: string;
  uploadedBy?: string;
  size?: number;
}

interface EvidenceViewerProps {
  files: string[] | EvidenceFile[];
  className?: string;
  onFileUpload?: (files: File[]) => Promise<void>;
  onFileDelete?: (fileId: string) => Promise<void>;
  allowUpload?: boolean;
  allowDelete?: boolean;
  maxFileSize?: number; // en MB
  acceptedTypes?: string[];
}

interface ImageViewerProps {
  imageUrl: string;
  filename?: string;
  onClose: () => void;
}

// Componente para viewer de imágenes con zoom y rotación
const ImageViewer: React.FC<ImageViewerProps> = ({ imageUrl, filename, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename || 'evidencia.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-blue-600" />
              <span className="truncate max-w-md">{filename || 'Evidencia'}</span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleZoomOut} className="hover:bg-blue-50">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Badge variant="secondary" className="min-w-[60px] justify-center">
                {Math.round(zoom * 100)}%
              </Badge>
              <Button variant="outline" size="sm" onClick={handleZoomIn} className="hover:bg-blue-50">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleRotate} className="hover:bg-purple-50">
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} className="hover:bg-green-50">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto p-8 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center min-h-[70vh]">
          <img
            src={imageUrl}
            alt={filename || 'Evidencia'}
            className="max-w-full max-h-full object-contain transition-transform duration-300 shadow-2xl rounded-lg"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Funciones helper
const isImageFile = (url: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  return imageExtensions.some(ext => url.toLowerCase().includes(ext));
};

const getFileNameFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.split('/').pop() || 'archivo';
  } catch {
    return url.split('/').pop() || 'archivo';
  }
};

const getFileType = (url: string): { type: 'image' | 'pdf' | 'text' | 'other'; icon: React.ReactNode; color: string } => {
  const urlLower = url.toLowerCase();
  
  if (isImageFile(url)) {
    return { type: 'image', icon: <ImageIcon className="h-5 w-5" />, color: 'text-blue-600' };
  } else if (urlLower.includes('.pdf')) {
    return { type: 'pdf', icon: <FileText className="h-5 w-5" />, color: 'text-red-600' };
  } else if (urlLower.includes('.txt') || urlLower.includes('.doc')) {
    return { type: 'text', icon: <File className="h-5 w-5" />, color: 'text-blue-500' };
  } else {
    return { type: 'other', icon: <File className="h-5 w-5" />, color: 'text-gray-500' };
  }
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const downloadFile = (url: string, filename?: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || getFileNameFromUrl(url);
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({ 
  files, 
  className = "",
  onFileUpload,
  onFileDelete,
  allowUpload = false,
  allowDelete = false,
  maxFileSize = 10,
  acceptedTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.txt']
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const normalizedFiles = files.map(file => 
    typeof file === 'string' 
      ? { url: file, filename: getFileNameFromUrl(file) }
      : file
  );

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (file.size > maxFileSize * 1024 * 1024) {
      return { valid: false, error: `El archivo excede el tamaño máximo de ${maxFileSize}MB` };
    }
    return { valid: true };
  };

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || !onFileUpload) return;

    const filesArray = Array.from(selectedFiles);
    const invalidFiles: string[] = [];

    filesArray.forEach(file => {
      const validation = validateFile(file);
      if (!validation.valid) {
        invalidFiles.push(`${file.name}: ${validation.error}`);
      }
    });

    if (invalidFiles.length > 0) {
      toast({
        title: "Archivos inválidos",
        description: invalidFiles.join('\n'),
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simular progreso
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await onFileUpload(filesArray);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      toast({
        title: "Archivos subidos",
        description: `Se subieron ${filesArray.length} archivo(s) exitosamente`,
      });

      setUploading(false);
      setUploadProgress(0);
    } catch (error) {
      toast({
        title: "Error al subir archivos",
        description: "Ocurrió un error al subir los archivos",
        variant: "destructive"
      });
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (file: EvidenceFile) => {
    if (!onFileDelete || !file.id) return;

    try {
      await onFileDelete(file.id);
      toast({
        title: "Archivo eliminado",
        description: "El archivo se eliminó correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el archivo",
        variant: "destructive"
      });
    }
  };

  const handleFileClick = (file: EvidenceFile) => {
    const { type } = getFileType(file.url);
    
    if (type === 'image') {
      setSelectedImage(file.url);
      setSelectedImageName(file.filename || getFileNameFromUrl(file.url));
    } else {
      downloadFile(file.url, file.filename);
    }
  };

  return (
    <>
      <div className={`space-y-6 ${className}`}>
        {/* Upload Area */}
        {allowUpload && (
          <div className="mb-6">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptedTypes.join(',')}
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            
            <Button 
              variant="outline" 
              className="w-full border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-500 h-auto py-6"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium">Subiendo archivos...</span>
                  <Progress value={uploadProgress} className="w-64" />
                  <span className="text-xs text-gray-600">{uploadProgress}%</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 rounded-full bg-gradient-to-br from-blue-100 to-purple-100">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="font-semibold">Agregar Evidencia</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Imágenes, PDFs y documentos (máx. {maxFileSize}MB)
                  </p>
                </div>
              )}
            </Button>
          </div>
        )}

        {/* Files Grid */}
        {normalizedFiles.length === 0 ? (
          <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
            <div className="p-4 rounded-full bg-gray-200 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <FileText className="h-10 w-10 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium mb-1">No hay evidencias disponibles</p>
            <p className="text-sm text-gray-500">
              {allowUpload ? 'Sube archivos para comenzar' : 'Las evidencias aparecerán aquí'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {normalizedFiles.map((file, index) => {
              const { type, icon, color } = getFileType(file.url);
              const filename = file.filename || getFileNameFromUrl(file.url);
              
              return (
                <div
                  key={file.id || index}
                  className="relative group cursor-pointer border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 bg-white"
                  onClick={() => handleFileClick(file)}
                >
                  {type === 'image' ? (
                    <>
                      <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                        <img
                          src={file.url}
                          alt={filename}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-blue-500/90 backdrop-blur-sm">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            Imagen
                          </Badge>
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm" className="shadow-lg">
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            className="shadow-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(file.url, filename);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {allowDelete && file.id && (
                            <Button 
                              variant="destructive" 
                              size="sm"
                              className="shadow-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(file);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="aspect-square bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col items-center justify-center p-6 relative">
                        <div className={`mb-4 p-4 rounded-full bg-white shadow-lg ${color}`}>
                          {icon}
                        </div>
                        <p className="text-xs text-center text-gray-700 font-medium break-words px-2 line-clamp-2">
                          {filename}
                        </p>
                        {file.size && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            {formatFileSize(file.size)}
                          </Badge>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="flex gap-2">
                            <Button variant="secondary" size="sm" className="shadow-lg">
                              <Download className="h-4 w-4 mr-1" />
                              Descargar
                            </Button>
                            {allowDelete && file.id && (
                              <Button 
                                variant="destructive" 
                                size="sm"
                                className="shadow-lg"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(file);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Filename tooltip */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white text-xs p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="truncate font-medium">{filename}</p>
                    {file.uploadedAt && (
                      <p className="text-gray-300 text-[10px] mt-1">
                        {new Date(file.uploadedAt).toLocaleDateString('es-ES')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedImage && (
        <ImageViewer
          imageUrl={selectedImage}
          filename={selectedImageName}
          onClose={() => {
            setSelectedImage(null);
            setSelectedImageName('');
          }}
        />
      )}
    </>
  );
};

export default EvidenceViewer;