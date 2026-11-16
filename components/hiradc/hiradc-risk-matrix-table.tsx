import * as React from "react"
import { cn } from "@/lib/utils"

interface HiradcRiskMatrixTableProps {
  className?: string
}

const COLOR_GREEN = "#5dcb50"
const COLOR_YELLOW = "#fffb14"
const COLOR_ORANGE = "#fa8f01"
const COLOR_RED = "#fe0201"

export function HiradcRiskMatrixTable({ className }: HiradcRiskMatrixTableProps) {
  return (
    <div className={cn("w-full bg-white overflow-hidden select-none", className)}>
      <table className="w-full border-collapse border-2 border-black text-black text-center font-sans">
        <thead>
          <tr>
            <th
              rowSpan={2}
              className="border-2 border-black p-1.5 sm:p-2 bg-white w-[26%] align-middle"
            >
              <div className="font-bold text-[11px] sm:text-[13px] leading-tight">
                <span>Kemungkinan</span>
                <br />
                <span className="italic font-bold">(Likelihood)</span>
              </div>
            </th>
            <th
              colSpan={4}
              className="border-2 border-black py-1 px-2 bg-white text-center font-bold text-[12px] sm:text-[14px] leading-tight"
            >
              <span>Dampak </span>
              <span className="italic">(Severity)</span>
            </th>
          </tr>
          <tr>
            <th className="border-2 border-black p-1 bg-white w-[18.5%] align-top">
              <div className="font-bold text-[9px] sm:text-[11px] leading-tight">
                1. Ringan
              </div>
              <div className="text-[7.5px] sm:text-[9px] leading-tight font-normal text-slate-900 mt-0.5">
                (Cedera ringan, kerugian kecil)
              </div>
            </th>
            <th className="border-2 border-black p-1 bg-white w-[18.5%] align-top">
              <div className="font-bold text-[9px] sm:text-[11px] leading-tight">
                2. Sedang
              </div>
              <div className="text-[7.5px] sm:text-[9px] leading-tight font-normal text-slate-900 mt-0.5">
                (Cedera sedang, kerugian sedang)
              </div>
            </th>
            <th className="border-2 border-black p-1 bg-white w-[18.5%] align-top">
              <div className="font-bold text-[9px] sm:text-[11px] leading-tight">
                3. Berat
              </div>
              <div className="text-[7.5px] sm:text-[9px] leading-tight font-normal text-slate-900 mt-0.5">
                (Cedera berat, kerugian besar)
              </div>
            </th>
            <th className="border-2 border-black p-1 bg-white w-[18.5%] align-top">
              <div className="font-bold text-[9px] sm:text-[11px] leading-tight">
                4. Sangat Berat
              </div>
              <div className="text-[7.5px] sm:text-[9px] leading-tight font-normal text-slate-900 mt-0.5">
                (Kematian, kerugian sangat besar)
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Row 5: Sangat Sering */}
          <tr>
            <td className="border-2 border-black p-1 text-left bg-white align-middle">
              <div className="font-bold text-[9px] sm:text-[11px] leading-tight text-center sm:text-left">
                5. Sangat Sering
              </div>
              <div className="text-[7.5px] sm:text-[9px] leading-tight font-normal text-slate-900 text-center sm:text-left mt-0.5">
                (&gt; 1 kali per tahun)
              </div>
            </td>
            <td
              className="border-2 border-black font-bold text-base sm:text-xl align-middle"
              style={{ backgroundColor: COLOR_YELLOW }}
            >
              5
            </td>
            <td
              className="border-2 border-black font-bold text-base sm:text-xl align-middle"
              style={{ backgroundColor: COLOR_ORANGE }}
            >
              10
            </td>
            <td
              className="border-2 border-black font-bold text-base sm:text-xl align-middle"
              style={{ backgroundColor: COLOR_RED }}
            >
              15
            </td>
            <td
              className="border-2 border-black font-bold text-base sm:text-xl align-middle"
              style={{ backgroundColor: COLOR_RED }}
            >
              20
            </td>
          </tr>

          {/* Row 4: Sering */}
          <tr>
            <td className="border-2 border-black p-1 text-left bg-white align-middle">
              <div className="font-bold text-[9px] sm:text-[11px] leading-tight text-center sm:text-left">
                4. Sering
              </div>
              <div className="text-[7.5px] sm:text-[9px] leading-tight font-normal text-slate-900 text-center sm:text-left mt-0.5">
                (1 – 12 kali per tahun)
              </div>
            </td>
            <td
              className="border-2 border-black font-bold text-base sm:text-xl align-middle"
              style={{ backgroundColor: COLOR_YELLOW }}
            >
              4
            </td>
            <td
              className="border-2 border-black font-bold text-base sm:text-xl align-middle"
              style={{ backgroundColor: COLOR_YELLOW }}
            >
              8
            </td>
            <td
              className="border-2 border-black font-bold text-base sm:text-xl align-middle"
              style={{ backgroundColor: COLOR_ORANGE }}
            >
              12
            </td>
            <td
              className="border-2 border-black font-bold text-base sm:text-xl align-middle"
              style={{ backgroundColor: COLOR_RED }}
            >
              16
            </td>
          </tr>

          {/* Row 3: Kadang-kadang */}
          <tr>
            <td className="border-2 border-black p-1 text-left bg-white align-middle">
              <div className="font-bold text-[9px] sm:text-[11px] leading-tight text-center sm:text-left">
                3. Kadang-kadang
              </div>
              <div className="text-[7.5px] sm:text-[9px] leading-tight font-normal text-slate-900 text-center sm:text-left mt-0.5">
                (1 – 12 kali dalam 3 tahun)
              </div>
            </td>
            <td
              className="border-2 border-black font-bold text-base sm:text-xl align-middle"
              style={{ backgroundColor: COLOR_GREEN }}
            >
              3
            </td>
            <td
              className="border-2 border-black font-bold text-base sm:text-xl align-middle"
              style={{ backgroundColor: COLOR_YELLOW }}
            >
              6
            </td>
            <td
              className="border-2 border-black font-bold text-base sm:text-xl align-middle"
              style={{ backgroundColor: COLOR_YELLOW }}
            >
              9
            </td>
            <td
              className="border-2 border-black font-bold text-base sm:text-xl align-middle"
              style={{ backgroundColor: COLOR_ORANGE }}
            >
              12
            </td>
          </tr>

          {/* Row 2: Jarang */}
          <tr>
            <td className="border-2 border-black p-1 text-left bg-white align-middle">
              <div className="font-bold text-[9px] sm:text-[11px] leading-tight text-center sm:text-left">
                2. Jarang
              </div>
              <div className="text-[7.5px] sm:text-[9px] leading-tight font-normal text-slate-900 text-center sm:text-left mt-0.5">
                (1 – 12 kali dalam 5 tahun)
              </div>
            </td>
            <td
              className="border-2 border-black font-bold text-base sm:text-xl align-middle"
              style={{ backgroundColor: COLOR_GREEN }}
            >
              2
            </td>
            <td
              className="border-2 border-black font-bold text-base sm:text-xl align-middle"
              style={{ backgroundColor: COLOR_GREEN }}
            >
              4
            </td>
            <td
              className="border-2 border-black font-bold text-base sm:text-xl align-middle"
              style={{ backgroundColor: COLOR_YELLOW }}
            >
              6
            </td>
            <td
              className="border-2 border-black font-bold text-base sm:text-xl align-middle"
              style={{ backgroundColor: COLOR_YELLOW }}
            >
              8
            </td>
          </tr>

          {/* Row 1: Sangat Jarang */}
          <tr>
            <td className="border-2 border-black p-1 text-left bg-white align-middle">
              <div className="font-bold text-[9px] sm:text-[11px] leading-tight text-center sm:text-left">
                1. Sangat Jarang
              </div>
              <div className="text-[7.5px] sm:text-[9px] leading-tight font-normal text-slate-900 text-center sm:text-left mt-0.5">
                (&lt; 1 kali dalam 5 tahun)
              </div>
            </td>
            <td
              className="border-2 border-black font-bold text-base sm:text-xl align-middle"
              style={{ backgroundColor: COLOR_GREEN }}
            >
              1
            </td>
            <td
              className="border-2 border-black font-bold text-base sm:text-xl align-middle"
              style={{ backgroundColor: COLOR_GREEN }}
            >
              2
            </td>
            <td
              className="border-2 border-black font-bold text-base sm:text-xl align-middle"
              style={{ backgroundColor: COLOR_GREEN }}
            >
              3
            </td>
            <td
              className="border-2 border-black font-bold text-base sm:text-xl align-middle"
              style={{ backgroundColor: COLOR_YELLOW }}
            >
              4
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
