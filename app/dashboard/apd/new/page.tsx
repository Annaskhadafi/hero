import { AdminPageShell } from "@/components/admin-page-shell";
import { ApdRequestForm } from "./apd-form";

export default function NewApdRequestPage() {
  return (
    <AdminPageShell
      eyebrow="Form Permintaan"
      title="Ajukan APD Baru / Pergantian"
      description="Isi form di bawah ini untuk mengajukan permintaan Alat Pelindung Diri (APD). Jika memilih pergantian, Anda diwajibkan melampirkan foto barang yang rusak/usang."
    >
      <div className="mx-auto max-w-4xl pt-6">
        <ApdRequestForm />
      </div>
    </AdminPageShell>
  );
}
