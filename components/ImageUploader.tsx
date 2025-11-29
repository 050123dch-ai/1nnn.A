import React, { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon, Camera } from 'lucide-react';
import { UploadedFile } from '../types';
import { Button } from './UIComponents';

interface ImageUploaderProps {
  onFileSelected: (file: UploadedFile | null) => void;
  selectedFile: UploadedFile | null;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onFileSelected, selectedFile }) => {
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64 = result.split(',')[1];
      onFileSelected({
        file,
        previewUrl: result,
        base64,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [onFileSelected]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const clearFile = () => onFileSelected(null);

  if (selectedFile) {
    return (
      <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
        <img 
          src={selectedFile.previewUrl} 
          alt="Preview" 
          className="w-full h-64 object-contain mix-blend-multiply" 
        />
        <div className="absolute top-2 right-2">
           <button 
            onClick={clearFile}
            className="p-1.5 bg-white/90 backdrop-blur rounded-full shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors"
           >
             <X size={20} />
           </button>
        </div>
        <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur p-2 text-xs text-center text-gray-500 border-t">
          {selectedFile.file.name} ({(selectedFile.file.size / 1024).toFixed(1)} KB)
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 text-center ${
        isDragging 
          ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' 
          : 'border-gray-300 hover:border-gray-400 bg-gray-50/30'
      }`}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      
      <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
        <div className="p-4 bg-indigo-50 rounded-full text-indigo-600">
          <Upload size={32} />
        </div>
        <div>
          <p className="text-lg font-medium text-gray-900">
            点击或拖拽上传图片
          </p>
          <p className="text-sm text-gray-500 mt-1">
            支持 JPG, PNG, WEBP 格式
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;