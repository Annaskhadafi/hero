import {
  extractCandidateIdentityFromAnswer,
  extractCandidateIdentityFromApplicationFormJson,
} from "@/lib/hc-application-form-identity";

describe("hc application form identity parser", () => {
  it("extracts candidate name and email from application form JSON answer", () => {
    const answer = JSON.stringify({
      fullName: "Budi Santoso",
      email: "BUDI@EXAMPLE.COM",
      handphone: "08123456789",
      positionApplied: "Mechanic",
    });

    expect(extractCandidateIdentityFromApplicationFormJson(answer)).toEqual({
      fullName: "Budi Santoso",
      email: "budi@example.com",
      phone: "08123456789",
    });
  });

  it("does not treat raw JSON as a fallback candidate name", () => {
    const answer = JSON.stringify({ positionApplied: "Mechanic" });

    expect(extractCandidateIdentityFromAnswer("Nama Lengkap", answer)).toEqual({});
  });

  it("keeps compatibility with normal labeled application form questions", () => {
    expect(extractCandidateIdentityFromAnswer("Nama Lengkap (Sesuai KTP)", "Ani Wijaya")).toEqual({
      fullName: "Ani Wijaya",
    });
    expect(extractCandidateIdentityFromAnswer("Alamat Email", "ANI@EXAMPLE.COM")).toEqual({
      email: "ani@example.com",
    });
  });
});
