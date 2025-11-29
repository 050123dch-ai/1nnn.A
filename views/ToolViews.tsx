import React, { useState } from 'react';
import { UploadedFile, ToolType, ProcessingState, TableData, IDCardData } from '../types';
import ImageUploader from '../components/ImageUploader';
import ImageEditor from '../components/ImageEditor';
import { Button, Card, Spinner, Alert } from '../components/UIComponents';
import { extractDocumentText, extractTableData, scanIDCard, extractHandwriting, removeHandwritingFromImage } from '../services/geminiService';
import { FileText, Download, Copy, RefreshCw, FileSpreadsheet, Eye, Eraser, Edit2 } from 'lucide-react';
import { jsPDF } from "jspdf";

// Custom save implementation to avoid dependency issues with file-saver in some environments
const saveFile = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// --- Helper Functions for Exports ---

const exportToPDF = (content: string, title = 'Document') => {
  try {
    const doc = new jsPDF();
    // Basic text handling - Note: jsPDF default font doesn't support complex Chinese characters well out of the box without custom fonts.
    // For this demo, we will try to use a basic method, but in production, you'd add a Chinese font.
    const splitText = doc.splitTextToSize(content, 180);
    doc.text(splitText, 15, 20);
    doc.save(`${title}.pdf`);
  } catch (e) {
    console.error(e);
    alert("PDF生成失败");
  }
};

const exportToWord = (content: string, title = 'Document') => {
  const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title></head><body>";
  const footer = "</body></html>";
  const sourceHTML = header + `<pre style="font-family: 'SimSun', 'Arial'; white-space: pre-wrap; color: black;">${content}</pre>` + footer;
  
  const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
  saveFile(blob, `${title}.doc`);
};

const exportTableToCSV = (data: TableData, title = 'Table') => {
  const csvContent = [
    data.headers.join(','),
    ...data.rows.map(row => row.join(','))
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveFile(blob, `${title}.csv`);
};

// --- View Components ---

// Wrapper for common logic (Edit Image)
const ToolWrapper: React.FC<{
  title: string;
  file: UploadedFile | null;
  setFile: (f: UploadedFile | null) => void;
  onProcess: () => void;
  isLoading: boolean;
  actionLabel: string;
  actionIcon: React.ReactNode;
  children?: React.ReactNode;
}> = ({ title, file, setFile, onProcess, isLoading, actionLabel, actionIcon, children }) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleEditSave = (newBase64: string) => {
     if (file) {
       setFile({
         ...file,
         base64: newBase64,
         previewUrl: `data:${file.mimeType};base64,${newBase64}`
       });
     }
     setIsEditing(false);
  };

  if (isEditing && file) {
    return (
      <ImageEditor 
        imageSrc={file.previewUrl} 
        onSave={handleEditSave} 
        onCancel={() => setIsEditing(false)} 
      />
    );
  }

  return (
    <Card title={title}>
      <ImageUploader selectedFile={file} onFileSelected={setFile} />
      
      {file && !isLoading && (
        <div className="mt-4 flex justify-between items-center">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit2 className="w-4 h-4 mr-2" /> 编辑图片
          </Button>
          <Button onClick={onProcess}>
            {actionIcon} {actionLabel}
          </Button>
        </div>
      )}
      
      {isLoading && (
        <div className="mt-8 flex flex-col items-center justify-center text-gray-500">
          <Spinner size="lg" />
          <p className="mt-2 text-sm">正在处理中...</p>
        </div>
      )}
      
      {children}
    </Card>
  );
};


// 1. Converter View (PDF/Word)
export const ConverterView: React.FC = () => {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [state, setState] = useState<ProcessingState>({ isLoading: false, error: null, result: null });

  const handleProcess = async () => {
    if (!file) return;
    setState({ isLoading: true, error: null, result: null });
    try {
      const text = await extractDocumentText(file.base64, file.mimeType);
      setState({ isLoading: false, error: null, result: text });
    } catch (err: any) {
      console.error(err);
      setState({ isLoading: false, error: err.message || "文档转换失败。", result: null });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ToolWrapper 
          title="原始图片" 
          file={file} 
          setFile={(f) => { setFile(f); setState({ isLoading: false, error: null, result: null }); }}
          onProcess={handleProcess}
          isLoading={state.isLoading}
          actionLabel="转换为文本"
          actionIcon={<FileText className="w-4 h-4 mr-2" />}
        />

        {state.result && (
          <Card title="处理结果" className="h-full flex flex-col">
            <div className="flex-1 min-h-[300px] p-4 bg-gray-50 rounded border text-sm font-mono text-gray-900 whitespace-pre-wrap overflow-auto max-h-[500px]">
              {state.result}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => exportToPDF(state.result)}>
                <Download className="w-4 h-4 mr-2" /> PDF
              </Button>
              <Button variant="outline" onClick={() => exportToWord(state.result)}>
                <Download className="w-4 h-4 mr-2" /> Word
              </Button>
              <Button variant="ghost" onClick={() => navigator.clipboard.writeText(state.result)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}
      </div>
      {state.error && <Alert type="error" message={state.error} />}
    </div>
  );
};

// 2. Table Extractor View
export const TableExtractorView: React.FC = () => {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [state, setState] = useState<ProcessingState>({ isLoading: false, error: null, result: null });

  const handleProcess = async () => {
    if (!file) return;
    setState({ isLoading: true, error: null, result: null });
    try {
      const data: TableData = await extractTableData(file.base64, file.mimeType);
      setState({ isLoading: false, error: null, result: data });
    } catch (err: any) {
      console.error(err);
      setState({ isLoading: false, error: err.message || "表格提取失败。", result: null });
    }
  };

  return (
    <div className="space-y-6">
      <ToolWrapper 
          title="提取表格数据" 
          file={file} 
          setFile={(f) => { setFile(f); setState({ isLoading: false, error: null, result: null }); }}
          onProcess={handleProcess}
          isLoading={state.isLoading}
          actionLabel="开始提取"
          actionIcon={<FileSpreadsheet className="w-4 h-4 mr-2" />}
      />

      {state.result && (
        <Card title="提取结果">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {(state.result as TableData).headers.map((h, i) => (
                    <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(state.result as TableData).rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
             <Button variant="outline" onClick={() => exportTableToCSV(state.result)}>
                <Download className="w-4 h-4 mr-2" /> 下载 CSV
              </Button>
          </div>
        </Card>
      )}
      {state.error && <Alert type="error" message={state.error} />}
    </div>
  );
};

// 3. Scanner View (ID/Notes)
export const ScannerView: React.FC<{ mode: 'id' | 'ocr' }> = ({ mode }) => {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [state, setState] = useState<ProcessingState>({ isLoading: false, error: null, result: null });

  const handleProcess = async () => {
    if (!file) return;
    setState({ isLoading: true, error: null, result: null });
    try {
      if (mode === 'id') {
        const data = await scanIDCard(file.base64, file.mimeType);
        setState({ isLoading: false, error: null, result: data });
      } else {
        const text = await extractHandwriting(file.base64, file.mimeType);
        setState({ isLoading: false, error: null, result: text });
      }
    } catch (err: any) {
      console.error(err);
      setState({ isLoading: false, error: err.message || "扫描识别失败。", result: null });
    }
  };

  return (
    <div className="space-y-6">
       <ToolWrapper 
          title={mode === 'id' ? "证件扫描" : "手写笔记识别"}
          file={file} 
          setFile={(f) => { setFile(f); setState({ isLoading: false, error: null, result: null }); }}
          onProcess={handleProcess}
          isLoading={state.isLoading}
          actionLabel={mode === 'id' ? "开始扫描" : "开始识别"}
          actionIcon={mode === 'id' ? <Eye className="w-4 h-4 mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
      />

      {state.result && mode === 'id' && (
        <Card title="扫描详情">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {Object.entries(state.result as IDCardData).map(([key, value]) => {
               if (key === 'rawText' || !value) return null;
               // Simple translation for key names
               const labels: Record<string, string> = {
                 name: '姓名', idNumber: '证件号码', address: '地址', birthDate: '出生日期', gender: '性别', expiryDate: '有效期至'
               };
               const label = labels[key] || key;

               return (
                 <div key={key} className="p-3 bg-gray-50 rounded border">
                   <span className="text-xs text-gray-500 uppercase font-semibold block mb-1">{label}</span>
                   <span className="text-gray-900">{value}</span>
                 </div>
               );
             })}
          </div>
          {(state.result as IDCardData).rawText && (
             <div className="mt-4 p-4 bg-gray-50 rounded border text-sm text-gray-900">
               <div className="font-semibold mb-2 text-xs uppercase text-gray-400">原始文本</div>
               {(state.result as IDCardData).rawText}
             </div>
          )}
        </Card>
      )}

      {state.result && mode === 'ocr' && (
         <Card title="识别结果">
            <div className="whitespace-pre-wrap p-4 bg-yellow-50 font-handwriting text-gray-900 rounded leading-relaxed border border-yellow-200">
              {state.result}
            </div>
            <div className="mt-4 flex justify-end gap-2">
               <Button variant="ghost" onClick={() => navigator.clipboard.writeText(state.result)}>
                <Copy className="w-4 h-4 mr-2" /> 复制
              </Button>
               <Button variant="outline" onClick={() => exportToPDF(state.result, 'Notes')}>
                <Download className="w-4 h-4 mr-2" /> 保存 PDF
              </Button>
            </div>
         </Card>
      )}

      {state.error && <Alert type="error" message={state.error} />}
    </div>
  );
};

// 4. Handwriting Remover View
export const HandwritingRemoverView: React.FC = () => {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [state, setState] = useState<ProcessingState>({ isLoading: false, error: null, result: null });

  const handleProcess = async () => {
    if (!file) return;
    setState({ isLoading: true, error: null, result: null });
    try {
      const base64Image = await removeHandwritingFromImage(file.base64, file.mimeType);
      setState({ isLoading: false, error: null, result: `data:image/png;base64,${base64Image}` });
    } catch (err: any) {
      console.error(err);
      setState({ isLoading: false, error: err.message || "去除手写失败，请重试。", result: null });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ToolWrapper 
          title="原始图片" 
          file={file} 
          setFile={(f) => { setFile(f); setState({ isLoading: false, error: null, result: null }); }}
          onProcess={handleProcess}
          isLoading={state.isLoading}
          actionLabel="去除手写"
          actionIcon={<Eraser className="w-4 h-4 mr-2" />}
        />

        {state.result && (
          <Card title="处理结果" className="h-full flex flex-col">
             <div className="flex-1 flex items-center justify-center bg-gray-50 rounded border overflow-hidden p-2">
               <img src={state.result} alt="Cleaned" className="max-h-[400px] object-contain" />
             </div>
             <div className="mt-4 flex justify-end">
               <a href={state.result} download="cleaned-document.png" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                  <Download className="w-4 h-4 mr-2" /> 下载图片
               </a>
             </div>
          </Card>
        )}
      </div>
       {state.error && <Alert type="error" message={state.error} />}
    </div>
  );
};