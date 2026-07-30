"use client";

import React from "react";

export interface EvaluationItem {
  id: number;
  panelistName: string;
  panelistRole: string;
  stageName?: string;
  dayaTangkapScore: number;
  dayaTangkapComment: string;
  problemSolvingScore: number;
  problemSolvingComment: string;
  motivationalFitScore: number;
  motivationalFitComment: string;
  adaptabilityScore: number;
  adaptabilityComment: string;
  interpersonalSkillsScore: number;
  interpersonalSkillsComment: string;
  communicationSkillScore: number;
  communicationSkillComment: string;
  fundamentalUnderstandingScore: number;
  fundamentalUnderstandingComment: string;
  experienceRelatedScore: number;
  experienceRelatedComment: string;
  technicalSkillScore: number;
  technicalSkillComment: string;
  managerialSkillsScore: number;
  managerialSkillsComment: string;
  leadershipScore: number;
  leadershipComment: string;
  teamWorkScore: number;
  teamWorkComment: string;
  overallRecommendation: string;
  jobMatchComment: string;
  recommendationOtherPosition: string;
  submittedAt?: Date | string;
}

interface InterviewFormPdfProps {
  candidateName: string;
  age: string;
  education: string;
  positionAppliedFor: string;
  evaluations: EvaluationItem[];
  stageName?: string;
}

export function InterviewFormPdf({
  candidateName,
  age,
  education,
  positionAppliedFor,
  evaluations,
  stageName = "Interview 1",
}: InterviewFormPdfProps) {
  // Primary evaluation or fallback
  const primaryEval = evaluations[0] || ({} as EvaluationItem);

  const getScoreCell = (score: number, target: number) => {
    return score === target ? "✓" : "";
  };

  const interviewers = evaluations.slice(0, 3);
  while (interviewers.length < 3) {
    interviewers.push({
      panelistName: "-",
      panelistRole: "-",
    } as any);
  }

  const dimensions = [
    {
      category: "PERSONNAL QUALITIES",
      items: [
        {
          title: "DAYA TANGKAP",
          desc: "Kemampuan menangkap dan memahami informasi dengan cepat dan tepat",
          score: primaryEval.dayaTangkapScore || 0,
          comment: primaryEval.dayaTangkapComment || "",
        },
        {
          title: "PROBLEM SOLVING / ANALYTICAL ABILITY",
          desc: "Kemampuan menganalisa permasalahan yang dihadapi dan mencari alternatif solusi yang tepat",
          score: primaryEval.problemSolvingScore || 0,
          comment: primaryEval.problemSolvingComment || "",
        },
        {
          title: "MOTIVATIONAL FIT",
          desc: "Memiliki kemauan untuk maju dan berkembang",
          score: primaryEval.motivationalFitScore || 0,
          comment: primaryEval.motivationalFitComment || "",
        },
        {
          title: "ADAPTABILITY",
          desc: "Mampu menyesuaikan diri dan memberikan kontribusi positif di dalam lingkungan kerja dengan berbagai situasi, kondisi perubahan yang terjadi",
          score: primaryEval.adaptabilityScore || 0,
          comment: primaryEval.adaptabilityComment || "",
        },
        {
          title: "INTERPERSONAL SKILLS",
          desc: "Kemampuan untuk membina hubungan dengan orang lain, bekerjasama, luwes, memenuhi & memahami nilai-nilai sosial yang berlaku",
          score: primaryEval.interpersonalSkillsScore || 0,
          comment: primaryEval.interpersonalSkillsComment || "",
        },
        {
          title: "COMMUNICATION SKILL",
          desc: "Mampu menjelaskan ide atau memberikan informasi secara jelas dan sistematis",
          score: primaryEval.communicationSkillScore || 0,
          comment: primaryEval.communicationSkillComment || "",
        },
      ],
    },
    {
      category: "PROFESIONAL SKILL & KNOWLEDGE",
      items: [
        {
          title: "FUNDAMENTAL UNDERSTANDING ABOUT JOB FUNCTION FOR THIS POSITION",
          desc: "Memiliki pemahaman tentang posisi kerja yang dilamarnya",
          score: primaryEval.fundamentalUnderstandingScore || 0,
          comment: primaryEval.fundamentalUnderstandingComment || "",
        },
        {
          title: "EXPERIENCE IN THE RELATED FIELD",
          desc: "Pengalaman yang sesuai dengan bidang kerja",
          score: primaryEval.experienceRelatedScore || 0,
          comment: primaryEval.experienceRelatedComment || "",
        },
        {
          title: "TECHNICAL SKILL IN THE RELATED FIELD",
          desc: "Kemampuan teknis yang berhubungan dengan bidang kerja",
          score: primaryEval.technicalSkillScore || 0,
          comment: primaryEval.technicalSkillComment || "",
        },
      ],
    },
    {
      category: "MANAGERIAL & LEADERSHIP",
      items: [
        {
          title: "MANAGERIAL SKILLS",
          desc: "Kemampuan untuk mengelola atau melakukan pengaturan pekerjaan",
          score: primaryEval.managerialSkillsScore || 0,
          comment: primaryEval.managerialSkillsComment || "",
        },
        {
          title: "LEADERSHIP",
          desc: "Kemampuan untuk menciptakan dan memelihara kesamaan visi dan misi organisasi dengan memberikan arahan dan prioritas yang jelas",
          score: primaryEval.leadershipScore || 0,
          comment: primaryEval.leadershipComment || "",
        },
        {
          title: "TEAM WORK",
          desc: "Kemampuan membangun dan memelihara kerjasama kelompok secara efektif dan melibatkan pihak terkait dalam mengatasi masalah serta memiliki komitmen terhadap pencapaian tujuan bersama",
          score: primaryEval.teamWorkScore || 0,
          comment: primaryEval.teamWorkComment || "",
        },
      ],
    },
  ];

  return (
    <div className="pdf-wrapper bg-white text-black p-6 rounded-md border text-xs print:p-0 print:border-none print:shadow-none max-w-[210mm] mx-auto font-sans leading-tight">
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-600 flex items-center justify-center font-bold text-cyan-600 text-sm">
            CP
          </div>
          <div>
            <h1 className="font-bold text-sm text-cyan-800 tracking-wide">Chitra Paratama</h1>
            <p className="text-[10px] text-gray-500">Human Capital Management System</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-base font-bold tracking-wider uppercase">INTERVIEW FORM</h2>
          <p className="text-[10px] text-gray-600 font-semibold">{stageName.toUpperCase()}</p>
        </div>
      </div>

      {/* Applicant Meta */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-4 border border-black p-2 text-[11px]">
        <div className="flex">
          <span className="w-36 font-semibold uppercase">APLICANT'S NAME</span>
          <span>: {candidateName}</span>
        </div>
        <div className="flex">
          <span className="w-36 font-semibold uppercase">AGE</span>
          <span>: {age}</span>
        </div>
        <div className="flex">
          <span className="w-36 font-semibold uppercase">EDUCATION</span>
          <span>: {education}</span>
        </div>
        <div className="flex">
          <span className="w-36 font-semibold uppercase">POSITION APPLIED FOR</span>
          <span>: {positionAppliedFor}</span>
        </div>
      </div>

      {/* Main Dimension Table */}
      <table className="w-full border-collapse border border-black text-[10px] mb-4">
        <thead>
          <tr className="bg-gray-200 text-center font-bold border-b border-black">
            <th className="border border-black p-1 text-left w-2/5">DIMENSION</th>
            <th className="border border-black p-1 w-[4%]">Very Weak<br/>1</th>
            <th className="border border-black p-1 w-[4%]">Weak<br/>2</th>
            <th className="border border-black p-1 w-[4%]">Capable<br/>3</th>
            <th className="border border-black p-1 w-[4%]">Strong<br/>4</th>
            <th className="border border-black p-1 w-[4%]">Very Strong<br/>5</th>
            <th className="border border-black p-1 w-2/5 text-left">EVIDENCE COMMENTS</th>
          </tr>
        </thead>
        <tbody>
          {dimensions.map((cat, cIdx) => (
            <React.Fragment key={cIdx}>
              <tr className="bg-gray-300 font-bold border-t border-b border-black">
                <td colSpan={7} className="p-1 uppercase tracking-wide border border-black">
                  {cat.category}
                </td>
              </tr>
              {cat.items.map((item, iIdx) => (
                <tr key={iIdx} className="border-b border-gray-400">
                  <td className="border border-black p-1.5 align-top">
                    <div className="font-bold text-[10.5px] uppercase">{item.title}</div>
                    <div className="text-[9.5px] text-gray-700 mt-0.5 leading-snug">{item.desc}</div>
                  </td>
                  <td className="border border-black p-1 text-center align-middle font-bold text-sm">
                    {getScoreCell(item.score, 1)}
                  </td>
                  <td className="border border-black p-1 text-center align-middle font-bold text-sm">
                    {getScoreCell(item.score, 2)}
                  </td>
                  <td className="border border-black p-1 text-center align-middle font-bold text-sm">
                    {getScoreCell(item.score, 3)}
                  </td>
                  <td className="border border-black p-1 text-center align-middle font-bold text-sm">
                    {getScoreCell(item.score, 4)}
                  </td>
                  <td className="border border-black p-1 text-center align-middle font-bold text-sm">
                    {getScoreCell(item.score, 5)}
                  </td>
                  <td className="border border-black p-1.5 align-top text-[10px] italic text-gray-800">
                    {item.comment || "-"}
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}

          {/* Job Match Row */}
          <tr className="border-t-2 border-black">
            <td className="border border-black p-1.5 font-bold uppercase align-middle">
              JOB MATCH BETWEEN EXPERIENCE, KNOWLEDGE CANDIDATE WITH JOB REQUIREMENT
            </td>
            <td colSpan={6} className="border border-black p-2 align-middle text-[10.5px]">
              <div className="grid grid-cols-2 text-center font-bold mb-1 border-b pb-1">
                <div className={primaryEval.overallRecommendation === "RECOMMENDED" ? "bg-green-100 p-1 border border-green-600 text-green-800 rounded" : "p-1"}>
                  {primaryEval.overallRecommendation === "RECOMMENDED" ? "✓ RECOMMENDED" : "RECOMMENDED"}
                </div>
                <div className={primaryEval.overallRecommendation === "NOT_RECOMMENDED" ? "bg-red-100 p-1 border border-red-600 text-red-800 rounded" : "p-1"}>
                  {primaryEval.overallRecommendation === "NOT_RECOMMENDED" ? "✓ NOT RECOMMENDED" : "NOT RECOMMENDED"}
                </div>
              </div>
              <div className="text-[10px] text-gray-700 italic mt-1">
                Catatan: {primaryEval.jobMatchComment || "-"}
              </div>
            </td>
          </tr>

          {/* Recommendation for Other Position */}
          <tr>
            <td className="border border-black p-1.5 font-bold uppercase align-middle">
              RECOMMENDATION FOR OTHER POSITION :
            </td>
            <td colSpan={6} className="border border-black p-2 align-middle text-[10.5px] italic">
              {primaryEval.recommendationOtherPosition || "-"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Form Code */}
      <div className="text-right text-[9px] font-mono font-bold mb-6">
        F.HR.STD.010.00
      </div>

      {/* Interviewers Signatures */}
      <div className="grid grid-cols-3 gap-4 border-t pt-4">
        {interviewers.map((intv, idx) => (
          <div key={idx} className="border p-2 rounded text-center">
            <div className="font-bold text-[10px] uppercase text-gray-700">
              INTERVIEWER {idx + 1}
            </div>
            <div className="h-12 flex items-end justify-center pb-1">
              <span className="font-semibold border-b border-black text-[11px] px-4 min-w-[120px]">
                {intv.panelistName || "........................"}
              </span>
            </div>
            <div className="text-[9px] text-gray-500 mt-1">
              NAME : {intv.panelistRole ? `(${intv.panelistRole})` : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
