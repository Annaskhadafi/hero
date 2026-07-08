import { db } from './db';
import { chitraLearningCourses } from './db/schema/hero';

async function check() {
  const courses = await db.select().from(chitraLearningCourses);
  console.log(courses);
  process.exit(0);
}

check();
