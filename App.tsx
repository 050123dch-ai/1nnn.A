import React, { useState } from 'react';
import { ToolType } from './types';
import { FileText, Table, Scan, Edit3, Eraser, Menu, X } from 'lucide-react';
import { ConverterView, TableExtractorView, ScannerView, HandwritingRemoverView } from './views/ToolViews';

// Sidebar Component defined locally for simplicity
const Sidebar: React.FC<{ 
  activeTool: ToolType; 
  onSelect: (t: ToolType) => void; 
  isOpen: boolean; 
  onClose: () => void 
}> = ({ activeTool, onSelect, isOpen, onClose }) => {
  const tools = [
    { id: ToolType.CONVERTER, label: '文档转换 (PDF/Word)', icon: FileText, desc: 'OCR 文字识别与转换' },
    { id: ToolType.TABLE_EXTRACTOR, label: '智能表格提取', icon: Table, desc: '图片转 Excel/CSV' },
    { id: ToolType.ID_SCANNER, label: '证件扫描识别', icon: Scan, desc: '自动提取证件信息' },
    { id: ToolType.HANDWRITING_OCR, label: '手写笔记识别', icon: Edit3, desc: '手写体转印刷体' },
    { id: ToolType.HANDWRITING_REMOVER, label: '手写痕迹擦除', icon: Eraser, desc: '还原清洁文档' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-800/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar Content */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                 <Scan className="text-white w-5 h-5" />
               </div>
               <h1 className="text-xl font-bold text-gray-900 tracking-tight">全能扫描<span className="text-indigo-600">Pro</span></h1>
            </div>
            <button onClick={onClose} className="lg:hidden text-gray-500">
              <X />
            </button>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => { onSelect(tool.id); onClose(); }}
                  className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 group ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className={`p-2 rounded-md mr-3 transition-colors ${isActive ? 'bg-white text-indigo-600 shadow-sm' : 'bg-gray-100 text-gray-500 group-hover:bg-white'}`}>
                    <Icon size={20} />
                  </div>
                  <div className="text-left">
                    <p className={`font-medium ${isActive ? 'text-indigo-900' : 'text-gray-900'}`}>{tool.label}</p>
                    <p className={`text-xs ${isActive ? 'text-indigo-500' : 'text-gray-400'}`}>{tool.desc}</p>
                  </div>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100">
             <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500">
               <p className="font-semibold text-gray-700 mb-1">隐私安全保护</p>
               <p>所有图片处理均通过 Google Gemini API 安全进行。</p>
             </div>
          </div>
        </div>
      </div>
    </>
  );
};

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.CONVERTER);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (activeTool) {
      case ToolType.CONVERTER: return <ConverterView />;
      case ToolType.TABLE_EXTRACTOR: return <TableExtractorView />;
      case ToolType.ID_SCANNER: return <ScannerView mode="id" />;
      case ToolType.HANDWRITING_OCR: return <ScannerView mode="ocr" />;
      case ToolType.HANDWRITING_REMOVER: return <HandwritingRemoverView />;
      default: return <ConverterView />;
    }
  };

  const getTitle = () => {
     switch (activeTool) {
      case ToolType.CONVERTER: return '文档转换 (PDF/Word)';
      case ToolType.TABLE_EXTRACTOR: return '智能表格提取';
      case ToolType.ID_SCANNER: return '证件扫描识别';
      case ToolType.HANDWRITING_OCR: return '手写笔记识别';
      case ToolType.HANDWRITING_REMOVER: return '手写痕迹擦除';
      default: return '';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        activeTool={activeTool} 
        onSelect={setActiveTool} 
        isOpen={isSidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header Mobile */}
        <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between lg:justify-end">
           <div className="flex items-center gap-3 lg:hidden">
             <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md">
               <Menu />
             </button>
             <span className="font-bold text-gray-900">全能扫描 Pro</span>
           </div>
           
           <div className="flex items-center gap-4">
             <span className="text-xs text-gray-400 hidden sm:inline-block">Powered by Gemini 2.5 Flash</span>
           </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
               <h2 className="text-2xl font-bold text-gray-900">{getTitle()}</h2>
               <p className="text-gray-500 mt-1">上传图片以开始处理</p>
            </div>
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;