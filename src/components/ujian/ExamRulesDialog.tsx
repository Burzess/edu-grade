import React from "react";

interface ExamRulesDialogProps {
  open: boolean;
  onConfirm: () => void;
}

// Daftar larangan saat ujian
const rules = [
  "Dilarang membuka tab atau aplikasi lain selama ujian berlangsung.",
  "Dilarang melakukan screenshot atau screen recording.",
  "Dilarang bekerja sama atau berdiskusi dengan orang lain.",
  "Dilarang menggunakan perangkat kedua (HP, tablet, dsb).",
  "Pastikan koneksi internet stabil selama ujian."
];

const ExamRulesDialog: React.FC<ExamRulesDialogProps> = ({ open, onConfirm }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background overlay dengan blur */}
      <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md backdrop-saturate-150"></div>
      
      {/* Dialog container */}
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full p-6 mx-4 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4 text-center text-red-600 dark:text-red-400">Perhatian Sebelum Ujian</h2>
        <ul className="list-disc pl-5 space-y-2 mb-6 text-gray-700 dark:text-gray-300">
          {rules.map((rule, idx) => (
            <li key={idx}>{rule}</li>
          ))}
        </ul>
        <button
          className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
          onClick={onConfirm}
        >
          Saya Mengerti & Siap Ujian
        </button>
      </div>
    </div>
  );
};

export default ExamRulesDialog;
