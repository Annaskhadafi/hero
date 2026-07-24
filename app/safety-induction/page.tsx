'use client'

import React, { useState, useRef, useEffect } from 'react'
import { submitSafetyInduction } from '@/app/actions/safety-induction'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SignaturePad } from '@/components/signature-pad'
import { toast } from 'sonner'
import { ShieldAlert, CheckCircle2, User, Building, Phone, Target } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'

export default function SafetyInductionPage() {
  const { setTheme } = useTheme()
  
  useEffect(() => {
    setTheme('light')
  }, [setTheme])

  const [hasScrolled, setHasScrolled] = useState(false)
  const [isAgreed, setIsAgreed] = useState(false)
  const [signature, setSignature] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleScroll = () => {
    const element = scrollContainerRef.current
    if (element) {
      const { scrollTop, scrollHeight, clientHeight } = element
      // Threshold 40px handles sub-pixel scrolling and elastic bounce on iOS Safari
      if (scrollHeight <= clientHeight + 20 || scrollHeight - clientHeight - scrollTop <= 40) {
        setHasScrolled(true)
      }
    }
  }

  useEffect(() => {
    handleScroll()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!signature) {
      toast.error('Silakan isi tanda tangan Anda terlebih dahulu')
      return
    }

    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    formData.append('signature', signature)

    const result = await submitSafetyInduction(formData)
    
    if (result.success) {
      setIsSuccess(true)
      toast.success('Data Safety Induction berhasil disubmit')
    } else {
      toast.error(result.error || 'Terjadi kesalahan')
    }
    setIsSubmitting(false)
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-lg border-green-200">
          <CardHeader>
            <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">Terima Kasih</CardTitle>
            <CardDescription className="text-lg">
              Anda telah menyetujui Peraturan Safety Induction PT. Chitra Paratama.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-6">Silakan tunjukkan layar ini kepada petugas keamanan jika diminta.</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
              Kembali
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-8 px-3 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-1 sm:space-y-2 mt-4 sm:mt-0">
          <div className="bg-primary/10 p-3 sm:p-4 rounded-full inline-block mb-1 sm:mb-2">
            <ShieldAlert className="w-8 h-8 sm:w-12 sm:h-12 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Safety Induction</h1>
          <p className="text-slate-500 text-sm sm:text-lg">PT. Chitra Paratama</p>
        </div>

        {/* Document Content */}
        <Card className="border-0 shadow-lg overflow-hidden bg-white">
          <CardHeader className="bg-slate-900 text-white p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">INFORMASI KESELAMATAN KERJA</CardTitle>
            <CardDescription className="text-slate-300">
              Harap dibaca dan dipatuhi sebagai aturan keselamatan ketika berkunjung ke lokasi pabrik agar senantiasa memastikan dan menjaga keselamatan diri Anda sendiri dan perlindungan terhadap: Karyawan, Peralatan kerja, Lingkungan, Mutu dan produk kami.
            </CardDescription>
          </CardHeader>
          
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            onTouchMove={handleScroll}
            style={{ WebkitOverflowScrolling: 'touch' }}
            className="h-[50vh] sm:h-[400px] overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed border-b scrollbar-thin scrollbar-thumb-slate-300"
          >
            {/* Kebijakan K3L */}
            <section>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 sm:mb-3 border-b pb-2">KEBIJAKAN K3L</h3>
              <p className="mb-4">PT. Chitra Paratama akan selalu mengutamakan penerapan system K3L dalam peningkatan Operasional di seluruh wilayah kerjanya. PT. Chitra Paratama akan senantiasa menciptakan, pemberian dan memelihara lingkungan kerja yang aman dan sehat bagi seluruh karyawan, pelanggan serta mitra kerja.</p>
              <p className="mb-2 font-medium">Untuk itu, PT. Chitra Paratama akan:</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Mematuhi semua perundang-undangan, hukum dan peraturan pemerintah serta peraturan/persyaratan yang berlaku.</li>
                <li>Mengutamakan pelaksanaan serta mempertahankan kualitas system K3L di seluruh lokasi kerjanya.</li>
                <li>Mengidentifikasi semua bahaya serta mengelola resiko secara efektif.</li>
                <li>Meyakinkan seluruh karyawan untuk bertanggung jawab penuh terhadap seluruh aspek K3L di lingkungan kerja masing-masing.</li>
                <li>Selalu menciptakan "kepedulian lingkungan hidup".</li>
                <li>Mengelola seluruh aspek dan dampak lingkungan di area kerja secara efektif.</li>
                <li>Mencegah polusi dan mengurangi insiden yang berakibat terhadap penurunan daya dukung lingkungan.</li>
                <li>Memberikan pelatihan dan penyuluhan kepada seluruh karyawan untuk mendukung tujuan kebijakan ini dan persyaratan K3L.</li>
                <li>Memastikan bahwa tujuan dan kebijakan ini akan disosialisasikan kepada seluruh karyawan, pelanggan, mitra kerja serta pihak yang terkait.</li>
              </ol>
            </section>

            {/* Keselamatan dan Kesehatan Kerja */}
            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-3 border-b pb-2">KESELAMATAN DAN KESEHATAN KERJA</h3>
              <p className="mb-4">Kami bertanggung jawab atas keselamatan dan kesehatan Anda selama berada di lokasi pabrik. Harap baca peraturan perusahaan berikut ini secara seksama:</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Membuka kaca jendela pintu mobil ketika memasuki dan keluar area PT. Chitra Paratama.</li>
                <li>Semua Tamu, konsumen, dan Kontraktor yang datang ke lokasi pabrik mengisi buku tamu saat datang dan meninggalkan pabrik.</li>
                <li><strong>Diwajibkan</strong> menggunakan kartu tanda pengenal selama berada di lokasi pabrik.</li>
                <li>Para tamu dan konsumen <strong>HANYA</strong> dapat memasuki lokasi pabrik jika di dampingi oleh security/staff PT. Chitra Paratama.</li>
                <li>Batas Kecepatan yang berlaku di area PT. Chitra Paratama yaitu <strong>20 Km/Jam</strong>.</li>
                <li>Gunakan Alat Pelindung Diri (APD) sesuai dengan persyaratan dalam bekerja.</li>
                <li>Bunyikan klakson dalam keadaan: Maju (2x klakson), Mundur (3x klakson), Terdapat mobilitas forklift dan truk (2-3x klakson).</li>
                <li>Parkirkan kendaraan pada areal parkir yang sudah di tentukan dengan rapi.</li>
                <li>Dilarang mengambil gambar/video dilingkungan PT Chitra Paratama tanpa ijin dan sepengetahuan dari Staff/security PT Chitra Paratama.</li>
                <li>Patuhi semua rambu yang ada di linkungan area kerja PT. Chitra Paratama.</li>
                <li>Area merokok: Kantin, samping pompa Kolam.</li>
                <li>Jam Kerja (08.00 - 17.00): Coffee Break I (10.00 - 10.10), Lunch break (12.00 - 13.00), Coffee Break II (15.00 - 15.10).</li>
              </ol>
            </section>

            {/* Protokol Kesehatan COVID-19 */}
            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-3 border-b pb-2">PROTOKOL KESEHATAN</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Setiap tamu dan karyawan yang masuk ke area PT. Chitra Paratama wajib mengikuti peraturan sebagai berikut:
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
                    <li>Wajib Pengecheckan suhu tubuh di post sekuriti dengan thermogun</li>
                    <li>Suhu tubuh normal 36,5 - 37,5 diperbolehkan masuk</li>
                    <li>Suhu tubuh demam 37,9 - 38 dilarang masuk</li>
                  </ul>
                </li>
                <li>Wajib mencuci tangan</li>
                <li>Wajib menggunakan masker</li>
                <li>Menjaga jarak social distancing</li>
                <li>Jangan Berjabat Tangan</li>
                <li>Tidak Berkumpul di salah satu meja kerja</li>
              </ol>
            </section>

            {/* Lingkungan */}
            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-3 border-b pb-2">LINGKUNGAN</h3>
              <p className="mb-4">Kami berkomitmen untuk mengurangi limbah, menjaga lingkungan dan melakukan kegiatan yang akan melindungi lingkungan kami.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Harap membuang sampah di tempat sampah.</li>
                <li>Membersihkan lokasi kerja harus terpelihara untuk memastikan bahwa lokasi tersebut tetap bersih.</li>
                <li>Mematikan semua peralatan listrik, lampu, penyejuk ruangan, komputer pada saat tidak digunakan.</li>
                <li>Memahami lembar informasi bahan kimia (LIBK) saat menggunakan bahan-bahan kimia.</li>
                <li>Buang limbah yang termasuk limbah B3 pada area yang telah disediakan.</li>
              </ul>
            </section>

            {/* Kontak Darurat */}
            <section className="bg-red-50 p-4 rounded-lg border border-red-100">
              <h3 className="font-bold text-red-900 mb-2">Kontak Keadaan Darurat:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-red-800">
                <div>Safety (Andi Safari): <span className="font-semibold">08125440961</span></div>
                <div>HRD (Muhammad Iqbal): <span className="font-semibold">081253369994</span></div>
                <div>Support Facility Management (Didik Wahyudi): <span className="font-semibold">+62 811-5425-546</span></div>
                <div>Security: <span className="font-semibold">112</span></div>
              </div>
            </section>
            
            {!hasScrolled && (
              <div className="text-center py-4 text-slate-400 italic animate-pulse">
                Scroll ke bawah untuk melanjutkan...
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6 bg-slate-50 border-t">
            <div className={`flex items-start space-x-3 transition-opacity duration-500 ${hasScrolled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <Checkbox 
                id="agree" 
                checked={isAgreed} 
                onCheckedChange={(checked) => setIsAgreed(checked === true)} 
                className="mt-1 h-5 w-5"
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="agree"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-900"
                >
                  Saya telah membaca, mengerti, dan menyetujui semua peraturan keselamatan kerja di atas.
                </label>
                <p className="text-sm text-slate-500">
                  Anda wajib mematuhi seluruh peraturan selama berada di area PT. Chitra Paratama.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Data Pribadi Form - Fades in after agreement */}
        <div className={`transition-all duration-700 ${isAgreed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none hidden'}`}>
          <Card className="border-0 shadow-xl overflow-hidden bg-white ring-1 ring-primary/10">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b p-4 sm:p-6">
              <CardTitle className="flex items-center text-primary text-lg sm:text-xl">
                <User className="w-5 h-5 mr-2" />
                Data Pribadi
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Silakan lengkapi data diri Anda di bawah ini
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="flex items-center text-slate-700">
                      <User className="w-4 h-4 mr-2 text-slate-400" /> Nama Lengkap
                    </Label>
                    <Input id="fullName" name="fullName" placeholder="Masukkan nama lengkap" required className="bg-slate-50" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyOrigin" className="flex items-center text-slate-700">
                      <Building className="w-4 h-4 mr-2 text-slate-400" /> Asal Perusahaan / Instansi
                    </Label>
                    <Input id="companyOrigin" name="companyOrigin" placeholder="Nama perusahaan / instansi" required className="bg-slate-50" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber" className="flex items-center text-slate-700">
                      <Phone className="w-4 h-4 mr-2 text-slate-400" /> No. Telp
                    </Label>
                    <Input id="phoneNumber" name="phoneNumber" type="tel" placeholder="08xxxxxxxxxx" required className="bg-slate-50" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date" className="flex items-center text-slate-700">
                      Tanggal
                    </Label>
                    <Input 
                      id="date" 
                      value={new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} 
                      readOnly 
                      className="bg-slate-100 text-slate-500 font-medium cursor-not-allowed" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose" className="flex items-center text-slate-700">
                    <Target className="w-4 h-4 mr-2 text-slate-400" /> Tujuan Kunjungan
                  </Label>
                  <Textarea id="purpose" name="purpose" placeholder="Jelaskan tujuan kunjungan Anda" required className="bg-slate-50 resize-none" rows={3} />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center text-slate-700">
                    Tanda Tangan Online
                  </Label>
                  <SignaturePad onSignatureChange={setSignature} />
                </div>

                <div className="pt-4 border-t">
                  <Button type="submit" className="w-full h-12 text-lg shadow-md hover:shadow-lg transition-all" disabled={isSubmitting}>
                    {isSubmitting ? 'Menyimpan...' : 'Submit Data'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
