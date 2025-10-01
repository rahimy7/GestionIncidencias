import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Eye, 
  FileText, 
  ImageIcon, 
  X, 
  ZoomIn, 
  ZoomOut,
  RotateCw,
  Maximize2
} from "lucide-react";

interface EvidenceFile {
  url: string;
  filename?: string;
  uploadedAt?: string;
  uploadedBy?: string;
}

interface EvidenceViewerProps {
  files: string[] | EvidenceFile[];
  className?: string;
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
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              {filename || 'Evidencia'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Badge variant="secondary">{Math.round(zoom * 100)}%</Badge>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleRotate}>
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto p-4 bg-gray-50 flex items-center justify-center min-h-[60vh]">
          <img
            src={imageUrl}
            alt={filename || 'Evidencia'}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Función para determinar si un archivo es una imagen
const isImageFile = (url: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const urlLower = url.toLowerCase();
  return imageExtensions.some(ext => urlLower.includes(ext));
};

// Función para obtener el nombre del archivo desde la URL
const getFileNameFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return pathname.split('/').pop() || 'archivo';
  } catch {
    return url.split('/').pop() || 'archivo';
  }
};

// Función para obtener el tipo de archivo
const getFileType = (url: string): { type: 'image' | 'pdf' | 'text' | 'other'; icon: React.ReactNode } => {
  const urlLower = url.toLowerCase();
  
  if (isImageFile(url)) {
    return { type: 'image', icon: <ImageIcon className="h-4 w-4" /> };
  } else if (urlLower.includes('.pdf')) {
    return { type: 'pdf', icon: <FileText className="h-4 w-4 text-red-500" /> };
  } else if (urlLower.includes('.txt') || urlLower.includes('.doc')) {
    return { type: 'text', icon: <FileText className="h-4 w-4 text-blue-500" /> };
  } else {
    return { type: 'other', icon: <FileText className="h-4 w-4 text-gray-500" /> };
  }
};

// Función para descargar archivos
const downloadFile = (url: string, filename?: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || getFileNameFromUrl(url);
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({ files, className = "" }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string>('');

  // Normalizar archivos a un formato consistente
  const normalizedFiles = files.map(file => 
    typeof file === 'string' 
      ? { url: file, filename: getFileNameFromUrl(file) }
      : file
  );

  const handleFileClick = (file: { url: string; filename?: string }) => {
    const { type } = getFileType(file.url);
    
    if (type === 'image') {
      // Para imágenes: abrir en modal
      setSelectedImage(file.url);
      setSelectedImageName(file.filename || getFileNameFromUrl(file.url));
    } else {
      // Para otros archivos: descargar directamente
      downloadFile(file.url, file.filename);
    }
  };

  if (normalizedFiles.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
        <p>No hay evidencias disponibles</p>
      </div>
    );
  }

  return (
    <>
      <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 ${className}`}>
        {normalizedFiles.map((file, index) => {
          const { type, icon } = getFileType(file.url);
          const filename = file.filename || getFileNameFromUrl(file.url);
          
          return (
            <div
              key={index}
              className="relative group cursor-pointer border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200"
              onClick={() => handleFileClick(file)}
            >
              {type === 'image' ? (
                // Preview para imágenes
                <>
                  <div className="aspect-square bg-gray-100">
                    <img
                      src={file.url}
                      alt={filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(file.url, filename);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                // Preview para archivos no imagen
                <div className="aspect-square bg-gray-50 flex flex-col items-center justify-center p-4">
                  <div className="mb-3">
                    {icon}
                  </div>
                  <p className="text-xs text-center text-gray-600 break-words">
                    {filename}
                  </p>
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="secondary" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Descargar
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Tooltip con nombre del archivo */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="truncate">{filename}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal para visualizar imágenes */}
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

// Exportación por defecto
export default EvidenceViewer;