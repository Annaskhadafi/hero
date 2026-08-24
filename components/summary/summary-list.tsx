'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateSummaryAction } from '@/app/dashboard/summary/actions';

type SectionWithSummary = {
  id: number;
  name: string;
  code: string;
  departmentId: number;
  headEmployeeId: number | null;
  approvedCount: number;
  summaryStatus: string | null;
  summaryId: number | null;
};

export function SummaryList({ sections }: { sections: SectionWithSummary[] }) {
  const router = useRouter();
  const [generating, setGenerating] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const handleGenerate = async (sectionId: number) => {
    setGenerating(sectionId);
    try {
      const employeeId = 5;
      const result = await generateSummaryAction(sectionId, employeeId);
      if (result.success && result.summaryId) {
        router.push(`/dashboard/summary?preview=${result.summaryId}`);
      } else {
        alert(result.error || 'Gagal generate summary');
      }
    } finally {
      setGenerating(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">-</span>;
    const colors: Record<string, string> = {
      draft: 'bg-yellow-100 text-yellow-700',
      pending: 'bg-blue-100 text-blue-700',
      approved: 'bg-green-100 text-green-700',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[status] || 'bg-gray-100'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  // Filter: hanya tampilkan section yang punya approved request
  const visibleSections = sections
    .filter((s) => s.approvedCount > 0)
    .filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Cari section..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <span className="text-sm text-gray-500 whitespace-nowrap">
            {visibleSections.length} section dengan request
          </span>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Section</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Approved Request</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status Summary</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visibleSections.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                {search ? 'Tidak ada section yang cocok' : 'Belum ada section dengan approved request'}
              </td></tr>
            )}
            {visibleSections.map((section) => (
              <tr key={section.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{section.name}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {section.approvedCount} request
                </td>
                <td className="px-4 py-3">
                  {getStatusBadge(section.summaryStatus)}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    {section.approvedCount > 0 && !section.summaryStatus && (
                      <button
                        onClick={() => handleGenerate(section.id)}
                        disabled={generating === section.id}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {generating === section.id ? 'Generating...' : 'Generate'}
                      </button>
                    )}
                    {section.summaryId && (
                      <button
                        onClick={() => router.push(`/dashboard/summary?preview=${section.summaryId}`)}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        Lihat
                      </button>
                    )}
                    {section.summaryId && section.summaryStatus === 'approved' && (
                      <a
                        href={`/print/summary/${section.summaryId}`}
                        target="_blank"
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Print
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
