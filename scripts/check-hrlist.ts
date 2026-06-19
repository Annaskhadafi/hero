import { getHrPersonnel } from '@/app/actions/hr-counseling';

async function run() {
  const hrList = await getHrPersonnel();
  console.log("HR List:", hrList);
  process.exit(0);
}
run();
