import { getQuotationById } from "./app/actions/service360";

async function main() {
  const quotation = await getQuotationById(2);
  console.log("Result for 2:", quotation);
}
main();
