'use server'

import { getLmsUserCourseCurriculum } from "@/lib/lms-mysql";

export async function getLmsCourseDetailsAction(courseId: number, email: string, sn: string) {
  try {
    const curriculum = await getLmsUserCourseCurriculum(courseId, email, sn);
    return { success: true, curriculum };
  } catch (error) {
    console.error("[LMS Action] Error getting course details:", error);
    return { success: false, error: String(error) };
  }
}
