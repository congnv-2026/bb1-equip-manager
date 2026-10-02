import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { 
  Upload, ScanSearch, CheckCircle2, XCircle, AlertTriangle, 
  HelpCircle, Settings, FileImage, ShieldAlert, Cpu, Search, Loader, 
  FileText, Printer, FileDown 
} from 'lucide-react';

const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  const words1 = String(str1).toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
  const words2 = String(str2).toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
  if (words1.length === 0 || words2.length === 0) return 0;
  const intersection = words1.filter(w => words2.includes(w));
  return (intersection.length / Math.max(words1.length, words2.length)) * 100;
};

export default function PunchlistAudit() {
  const [tagList, setTagList] = useState([]);
  const [selectedTag, setSelectedTag] = useState('');
  
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [auditResults, setAuditResults] = useState(null);
  const [itrList, setItrList] = useState([]); 
  
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  // THÊM STATE LƯU MODEL ĐANG CHỌN
  const [aiModel, setAiModel] = useState(localStorage.getItem('gemini_model') || 'gemini-3.8-flash');
  const [showSettings, setShowSettings] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    async function fetchTags() {
      const { data, error } = await supabase.from('punchlist_matrix').select('tag_no');
      if (!error && data) {
        const uniqueTags = [...new Set(data.map(item => String(item.tag_no).trim()))].sort();
        setTagList(uniqueTags);
      }
    }
    fetchTags();
  }, []);

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKey.trim());
    localStorage.setItem('gemini_model', aiModel); // LƯU LUÔN MODEL VÀO BỘ NHỚ TRÌNH DUYỆT
    setShowSettings(false);
    alert('Đã lưu cấu hình AI thành công!');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAuditResults(null); 
    }
  };

  const fileToGenerativePart = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({
        inlineData: {
          data: reader.result.split(',')[1],
          mimeType: file.type 
        }
      });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const executeAiAudit = async () => {
    const currentKey = apiKey.trim() || localStorage.getItem('gemini_api_key');
    if (!currentKey) return alert("Vui lòng nhập Gemini API Key trong phần Cài đặt!");
    if (!selectedTag) return alert("Vui lòng nhập hoặc chọn Tag No để đối chiếu!");
    if (!imageFile) return alert("Vui lòng tải lên file Punch Raise Form (Ảnh hoặc PDF)!");

    setIsAnalyzing(true);
    try {
      const { data: dbPunches, error: punchError } = await supabase
        .from('punchlist_matrix')
        .select('*')
        .eq('tag_no', selectedTag.trim());
      if (punchError) throw punchError;

      const { data: dbItrs, error: itrError } = await supabase
        .from('itr_matrix') 
        .select('*')
        .eq('tag_no', selectedTag.trim());
      if (!itrError && dbItrs) {
        setItrList(dbItrs);
      }

      const imagePart = await fileToGenerativePart(imageFile);
      const prompt = `
        You are a strict QC Inspector reading an industrial Punchlist Raise Form document (which might be an image or a multi-page PDF).
        Extract all punch items from the tables across all pages in the document.
        Return ONLY a valid JSON array of objects. Do not include markdown formatting like \`\`\`json.
        The JSON objects must have exactly these two keys:
        - "defect": The description of the punch/defect (string)
        - "category": The category of the punch (string, usually A, B, or C. If empty, return "B")
        If no punch items are found or the document is unreadable, return [].
      `;

      // SỬ DỤNG BIẾN aiModel ĐỂ LINH HOẠT THAY ĐỔI ĐƯỜNG LINK API
      const currentModelName = aiModel || 'gemini-3.8-flash';
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModelName}:generateContent?key=${currentKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, imagePart] }],
          generationConfig: { temperature: 0.1 } 
        })
      });

      const aiData = await response.json();
      if (aiData.error) throw new Error(aiData.error.message);

      if (!aiData.candidates || aiData.candidates.length === 0) {
        throw new Error("AI không trả về kết quả. Hãy đảm bảo file rõ nét.");
      }

      let rawText = aiData.candidates[0].content.parts[0].text;
      rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const aiExtractedPunches = JSON.parse(rawText);

      const results = {
        matched: [],
        mismatch: [],
        missingInSystem: [],
        ghostInSystem: [...dbPunches] 
      };

      aiExtractedPunches.forEach(aiPunch => {
        let bestMatch = null;
        let highestScore = 0;
        let matchIndex = -1;

        results.ghostInSystem.forEach((dbPunch, idx) => {
          const score = calculateSimilarity(aiPunch.defect, dbPunch.defect_description);
          if (score > highestScore) {
            highestScore = score;
            bestMatch = dbPunch;
            matchIndex = idx;
          }
        });

        if (highestScore > 50) {
          results.ghostInSystem.splice(matchIndex, 1); 
          if (String(aiPunch.category).trim().toUpperCase() === String(bestMatch.category).trim().toUpperCase()) {
            results.matched.push({ ai: aiPunch, db: bestMatch, score: highestScore });
          } else {
            results.mismatch.push({ 
              ai: aiPunch, db: bestMatch, 
              issue: `Sai lệch Category (Giấy: ${aiPunch.category} | Form: ${bestMatch.category})`
            });
          }
        } else {
          results.missingInSystem.push({ ai: aiPunch });
        }
      });

      setAuditResults(results);

    } catch (err) {
      alert(`Lỗi phân tích (${aiModel}): ` + err.message);
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportCSV = () => {
    if (!auditResults) return;
    
    let csvContent = "\uFEFF"; 
    csvContent += `PUNCHLIST & ITR AUDIT REPORT\n`;
    csvContent += `TAG NO:,${selectedTag}\n`;
    csvContent += `Thời gian xuất:,${new Date().toLocaleString('vi-VN')}\n\n`;

    csvContent += `TÌNH TRẠNG ITR\n`;
    csvContent += `Mã ITR,Trạng thái\n`;
    if (itrList.length > 0) {
      itrList.forEach(itr => {
        const itrNo = itr.itr_no || itr.itr_name || itr.itr_code || 'Không xác định';
        const itrStatus = itr.status || itr.itr_status || 'Chưa làm';
        csvContent += `"${itrNo}","${itrStatus}"\n`;
      });
    } else {
      csvContent += `Không có dữ liệu ITR cho Tag này,-\n`;
    }
    csvContent += `\n`;

    csvContent += `ĐỐI CHIẾU PUNCHLIST (GỐC: FORM GIẤY CHỮ KÝ -> PHẦN MỀM)\n`;
    csvContent += `Lỗi ghi trên giấy (Baseline),Category giấy,Tình trạng đối chiếu,Lỗi đang nhập trên hệ thống,Category hệ thống\n`;

    auditResults.matched.forEach(item => {
      csvContent += `"${item.ai.defect}","${item.ai.category}","Khớp hoàn toàn","${item.db.defect_description}","${item.db.category}"\n`;
    });

    auditResults.mismatch.forEach(item => {
      csvContent += `"${item.ai.defect}","${item.ai.category}","Sai lệch dữ liệu","${item.db.defect_description}","${item.db.category}"\n`;
    });

    auditResults.missingInSystem.forEach(item => {
      csvContent += `"${item.ai.defect}","${item.ai.category}","Chưa nhập lên hệ thống","-","-"\n`;
    });

    csvContent += `\nLỖI ẢO (CÓ TRÊN HỆ THỐNG NHƯNG KHÔNG TÌM THẤY TRÊN TỜ GIẤY NÀY)\n`;
    csvContent += `Mã Lỗi Hệ thống,Mô tả trên hệ thống,Category\n`;
    auditResults.ghostInSystem.forEach(item => {
      csvContent += `"${item.punch_id || ''}","${item.defect_description}","${item.category}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Audit_Report_${selectedTag}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    if (!auditResults) return;
    const printWindow = window.open('', '', 'width=900,height=700');
    
    let itrTableRows = '<tr><td colspan="2">Không có dữ liệu ITR cho Tag này</td></tr>';
    if (itrList.length > 0) {
      itrTableRows = itrList.map(itr => {
        const itrNo = itr.itr_no || itr.itr_name || 'N/A';
        const itrStatus = itr.status || itr.itr_status || 'N/A';
        return `<tr><td>${itrNo}</td><td><b>${itrStatus}</b></td></tr>`;
      }).join('');
    }

    const matchedRows = auditResults.matched.map(item => `
      <tr>
        <td>${item.ai.defect}</td><td>${item.ai.category}</td>
        <td class="tag-done">KHỚP</td>
        <td>${item.db.defect_description}</td>
      </tr>
    `).join('');

    const missingRows = auditResults.missingInSystem.map(item => `
      <tr>
        <td>${item.ai.defect}</td><td>${item.ai.category}</td>
        <td class="tag-missing">CHƯA NHẬP</td>
        <td>-</td>
      </tr>
    `).join('');

    const mismatchRows = auditResults.mismatch.map(item => `
      <tr>
        <td>${item.ai.defect}</td><td>${item.ai.category}</td>
        <td class="tag-mismatch">SAI LỆCH</td>
        <td>${item.db.defect_description} (Cat ${item.db.category})</td>
      </tr>
    `).join('');

    const ghostRows = auditResults.ghostInSystem.length > 0 
      ? auditResults.ghostInSystem.map(item => `
        <tr>
          <td>${item.punch_id || ''}</td>
          <td>${item.defect_description}</td>
          <td>${item.category}</td>
        </tr>
      `).join('') 
      : '<tr><td colspan="3">Không có lỗi ảo dư thừa.</td></tr>';

    let htmlContent = `
      <html>
        <head>
          <title>Punchlist Audit Report - ${selectedTag}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; font-size: 12px; }
            h2 { text-align: center; color: #1e293b; margin-bottom: 5px; }
            .subtitle { text-align: center; color: #64748b; font-weight: bold; margin-bottom: 30px; }
            .section-title { background: #f1f5f9; padding: 8px; font-weight: bold; border-left: 4px solid #3b82f6; margin-top: 20px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background-color: #f8fafc; color: #334155; }
            .tag-done { color: #15803d; font-weight: bold; }
            .tag-missing { color: #b91c1c; font-weight: bold; }
            .tag-mismatch { color: #c2410c; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>PUNCHLIST & ITR AUDIT REPORT</h2>
          <div class="subtitle">Dữ liệu gốc (Baseline): Hardcopy Form (Đã ký)</div>
          
          <table style="width:50%; margin-bottom: 30px;">
            <tr><th width="30%">TAG NO</th><td><strong>${selectedTag}</strong></td></tr>
            <tr><th>DATE AUDIT</th><td>${new Date().toLocaleDateString('vi-VN')}</td></tr>
          </table>

          <div class="section-title">1. TÌNH TRẠNG ITR (INSPECTION TEST RECORD)</div>
          <table>
            <tr><th>Mã ITR</th><th>Trạng thái</th></tr>
            ${itrTableRows}
          </table>

          <div class="section-title">2. KẾT QUẢ ĐỐI CHIẾU PUNCHLIST</div>
          <table>
            <tr><th width="40%">Lỗi trên Form giấy (Gốc)</th><th width="10%">Cat</th><th width="15%">Đánh giá</th><th width="35%">Thông tin trên hệ thống</th></tr>
            ${matchedRows}
            ${missingRows}
            ${mismatchRows}
          </table>

          <div class="section-title">3. LỖI DƯ THỪA TRÊN HỆ THỐNG (GHOST PUNCHES)</div>
          <p style="font-style: italic; color: #64748b;">* Các lỗi có trong phần mềm nhưng không thấy ghi trên tờ giấy này.</p>
          <table>
            <tr><th width="20%">Punch ID</th><th width="70%">Mô tả lỗi trên hệ thống</th><th width="10%">Cat</th></tr>
            ${ghostRows}
          </table>
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
      <div className="flex-none bg-white border-b border-slate-200 shadow-sm z-20 px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <ScanSearch className="text-blue-600" /> PUNCHLIST AI AUDIT
          </h2>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">AI Verification & Baseline Audit</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <input 
              type="text" 
              list="tags-datalist"
              value={selectedTag} 
              onChange={(e) => setSelectedTag(e.target.value.toUpperCase())} 
              placeholder="Gõ tìm hoặc chọn Tag No..." 
              className="h-10 px-4 pr-10 border border-slate-300 rounded-lg font-bold text-blue-600 outline-none w-72 bg-slate-50 focus:bg-white focus:border-blue-400 transition-colors uppercase"
            />
            <Search className="absolute right-3 text-slate-400" size={16} />
            <datalist id="tags-datalist">
              {tagList.map(tag => <option key={tag} value={tag} />)}
            </datalist>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className={`p-2.5 rounded-lg border transition-colors ${showSettings ? 'bg-slate-200 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            <Settings size={18} />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-slate-800 text-white p-4 px-6 shadow-inner shrink-0 flex flex-col gap-4">
          <div className="flex items-end gap-6 w-full">
            <div className="flex-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Google Gemini API Key</label>
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Nhập API Key bắt đầu bằng AIza..." className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors" />
            </div>
            <div className="w-1/3">
              <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Chọn Mô Hình AI (AI Model)</label>
              <select value={aiModel} onChange={(e) => setAiModel(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2.5 text-sm outline-none focus:border-blue-400 cursor-pointer">
                <option value="gemini-3.8-flash">Gemini 3.8 Flash (Mới nhất, Đa nhiệm)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Xử lý kỹ, Chậm nhưng chuẩn)</option>
                <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash (Ổn định, Nhanh)</option>
              </select>
            </div>
            <button onClick={handleSaveApiKey} className="bg-blue-600 hover:bg-blue-500 h-10 px-6 rounded font-bold text-sm shadow-sm transition-colors mb-[2px]">Lưu Cấu Hình</button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        
        {/* NỬA TRÁI: UPLOAD FILE */}
        <div className="w-5/12 bg-slate-100 border-r border-slate-200 p-6 flex flex-col">
          <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl flex-1 flex flex-col items-center justify-center relative overflow-hidden group hover:border-blue-400 transition-colors">
            {/* INPUT HỖ TRỢ CẢ ẢNH VÀ PDF */}
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*, application/pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
            
            {previewUrl ? (
              // HỖ TRỢ VIEW PDF TRỰC TIẾP
              imageFile?.type.includes('pdf') ? (
                <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-full" title="PDF Preview" />
              ) : (
                <img src={previewUrl} alt="Punch Form" className="w-full h-full object-contain p-2" />
              )
            ) : (
              <div className="text-center p-6 flex flex-col items-center">
                <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileText size={32} />
                </div>
                <h3 className="font-black text-slate-700 text-lg">Tải Form (Ảnh hoặc PDF) lên đây</h3>
                <p className="text-xs font-bold text-slate-400 mt-2">AI tự động quét toàn bộ chữ và bảng biểu.</p>
              </div>
            )}
          </div>
          
          <button onClick={executeAiAudit} disabled={isAnalyzing || !previewUrl} className={`mt-4 w-full h-14 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${isAnalyzing ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : (!previewUrl ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5')}`}>
            {isAnalyzing ? <><Loader size={20} className="animate-spin"/> ĐANG PHÂN TÍCH ({aiModel})...</> : <><Cpu size={20}/> KÍCH HOẠT KIỂM TRA CHÉO</>}
          </button>
        </div>

        {/* NỬA PHẢI: KẾT QUẢ ĐỐI CHIẾU */}
        <div className="w-7/12 bg-white flex flex-col overflow-hidden relative">
          {!auditResults ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
              <ScanSearch size={64} strokeWidth={1} className="mb-4 opacity-50" />
              <p className="font-bold text-sm">Kết quả bóc tách và đối chiếu sẽ hiển thị tại đây.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* THANH CÔNG CỤ XUẤT BÁO CÁO KÉP */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="font-black text-lg text-slate-800">BÁO CÁO AUDIT</h3>
                <div className="flex gap-2">
                  <button onClick={handleExportCSV} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors">
                    <FileDown size={14}/> XUẤT EXCEL (CSV)
                  </button>
                  <button onClick={handlePrintPDF} className="flex items-center gap-2 bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors">
                    <Printer size={14}/> LƯU PDF / IN
                  </button>
                </div>
              </div>

              {/* KHU VỰC THÔNG TIN ITR */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <h4 className="font-bold text-xs text-slate-500 uppercase tracking-widest mb-3">Tình trạng ITR (Inspection Test Record)</h4>
                <div className="flex gap-2 flex-wrap">
                  {itrList.length > 0 ? (
                    itrList.map((itr, i) => {
                      const isDone = String(itr.status).toLowerCase().includes('done') || String(itr.status).toLowerCase() === 'signed';
                      return (
                        <span key={i} className={`px-3 py-1.5 rounded-md border text-xs font-bold flex items-center gap-1 ${isDone ? 'bg-emerald-100 border-emerald-200 text-emerald-800' : 'bg-slate-200 border-slate-300 text-slate-700'}`}>
                          {isDone ? <CheckCircle2 size={12}/> : <ShieldAlert size={12}/>}
                          {itr.itr_no || itr.itr_name || 'ITR'} - {itr.status || 'Chưa thực hiện'}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-sm font-bold text-slate-400">Không tìm thấy mã ITR nào gắn với Tag No này.</span>
                  )}
                </div>
              </div>

              {/* TỔNG QUAN PUNCHLIST */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center">
                  <span className="text-3xl font-black text-emerald-600 block">{auditResults.matched.length}</span>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Khớp Dữ Liệu</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center">
                  <span className="text-3xl font-black text-amber-600 block">{auditResults.mismatch.length}</span>
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Sai Lệch Nhỏ</span>
                </div>
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
                  <span className="text-3xl font-black text-red-600 block">{auditResults.missingInSystem.length}</span>
                  <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest">Quên Nhập</span>
                </div>
                <div className="bg-slate-100 border border-slate-300 p-4 rounded-xl text-center">
                  <span className="text-3xl font-black text-slate-600 block">{auditResults.ghostInSystem.length}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lỗi Ảo (Ghost)</span>
                </div>
              </div>

              <div className="space-y-6">
                {auditResults.missingInSystem.length > 0 && (
                  <div className="border border-red-200 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                    <div className="bg-red-50 px-4 py-2 border-b border-red-200 flex items-center gap-2">
                      <XCircle size={16} className="text-red-600"/> <span className="font-black text-xs text-red-800">CẢNH BÁO: LỖI CÓ TRÊN GIẤY NHƯNG CHƯA ĐƯỢC NHẬP LÊN HỆ THỐNG</span>
                    </div>
                    <div className="divide-y divide-red-100">
                      {auditResults.missingInSystem.map((item, i) => (
                        <div key={i} className="p-4 bg-white flex items-start gap-4">
                          <span className="bg-red-100 text-red-700 font-black text-[10px] px-2 py-1 rounded">Cat {item.ai.category || '?'}</span>
                          <div className="flex-1 text-sm font-bold text-red-600">{item.ai.defect}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {auditResults.mismatch.length > 0 && (
                  <div className="border border-amber-200 rounded-xl overflow-hidden">
                    <div className="bg-amber-50 px-4 py-2 border-b border-amber-200 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-amber-600"/> <span className="font-black text-xs text-amber-800">LƯU Ý: CÁC LỖI BỊ NHẬP SAI LỆCH THÔNG TIN</span>
                    </div>
                    <div className="divide-y divide-amber-100">
                      {auditResults.mismatch.map((item, i) => (
                        <div key={i} className="p-4 bg-white flex flex-col gap-2">
                          <div className="flex items-start gap-4">
                            <span className="bg-amber-100 text-amber-700 font-black text-[10px] px-2 py-1 rounded border border-amber-200">Giấy: Cat {item.ai.category}</span>
                            <div className="flex-1 text-sm font-bold text-slate-700">{item.ai.defect}</div>
                          </div>
                          <div className="text-xs font-bold text-red-500 bg-red-50 p-2 rounded-lg ml-12 border border-red-100 border-l-4 border-l-red-500">
                            Chi tiết sai lệch: {item.issue}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {auditResults.matched.length > 0 && (
                  <div className="border border-emerald-200 rounded-xl overflow-hidden">
                    <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200 flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600"/> <span className="font-black text-xs text-emerald-800">CÁC LỖI KHỚP HOÀN TOÀN GIỮA GIẤY VÀ HỆ THỐNG</span>
                    </div>
                    <div className="divide-y divide-emerald-100">
                      {auditResults.matched.map((item, i) => (
                        <div key={i} className="p-4 bg-white flex items-start gap-4">
                          <span className="bg-emerald-100 text-emerald-700 font-black text-[10px] px-2 py-1 rounded">Cat {item.ai.category}</span>
                          <div className="flex-1 text-sm font-bold text-slate-700">{item.ai.defect}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {auditResults.ghostInSystem.length > 0 && (
                  <div className="border border-slate-300 rounded-xl overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 flex items-center gap-2">
                      <ShieldAlert size={16} className="text-slate-600"/> <span className="font-black text-xs text-slate-700">LỖI ẢO (CÓ TRÊN HỆ THỐNG NHƯNG KHÔNG CÓ TRONG TỜ GIẤY NÀY)</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {auditResults.ghostInSystem.map((item, i) => (
                        <div key={i} className="p-4 bg-white flex items-start gap-4 opacity-70">
                          <span className="bg-slate-200 text-slate-600 font-black text-[10px] px-2 py-1 rounded">{item.punch_id || '?'}</span>
                          <span className="bg-slate-200 text-slate-600 font-black text-[10px] px-2 py-1 rounded">Cat {item.category}</span>
                          <div className="flex-1 text-sm font-bold text-slate-600 line-through decoration-slate-300">{item.defect_description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}