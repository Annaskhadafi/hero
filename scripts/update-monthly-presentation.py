#!/usr/bin/env python3
"""
Automated Monthly Presentation Updater for HERO & ONE-CHITRA
===========================================================
Updates D:\\[01] PROJECT\\HERO\\Monthly presentation with daily progress,
bullet points, and real E2E testing screenshot evidence.
"""

import os
import sys
import argparse
import shutil
import re
from datetime import datetime
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

# Fix Windows console UTF-8 encoding
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

MONTH_NAMES_ID = {
    1: "JANUARI",
    2: "FEBRUARI",
    3: "MARET",
    4: "APRIL",
    5: "MEI",
    6: "JUNI",
    7: "JULI",
    8: "AGUSTUS",
    9: "SEPTEMBER",
    10: "OKTOBER",
    11: "NOVEMBER",
    12: "DESEMBER"
}

MONTH_REGEX_ID = r"(JANUARI|FEBRUARI|MARET|APRIL|MEI|JUNI|JULI|AGUSTUS|SEPTEMBER|OKTOBER|NOVEMBER|DESEMBER)"

def find_planning_slide_index(prs):
    """
    Find the index of the 'Planning on next months' slide.
    Only searches starting from slide index 4 to avoid the table of contents / agenda slide.
    """
    for idx in range(4, len(prs.slides)):
        slide = prs.slides[idx]
        for shape in slide.shapes:
            if shape.has_text_frame and "planning on next month" in shape.text.lower():
                return idx
    # Fallback to third to last slide or end
    return max(len(prs.slides) - 2, 5)

def get_latest_existing_ppt(monthly_dir):
    """Find the newest existing PPT file in the Monthly folder to use as template."""
    files = [
        f for f in os.listdir(monthly_dir)
        if f.lower().endswith(".pptx") and not f.startswith("~$")
    ]
    if not files:
        raise FileNotFoundError(f"No existing PPTX file found in {monthly_dir}")
    
    # Sort files by modification time descending
    files.sort(key=lambda f: os.path.getmtime(os.path.join(monthly_dir, f)), reverse=True)
    return os.path.join(monthly_dir, files[0])

def initialize_new_month_presentation(src_path, dst_path, month_name, year):
    """
    Initializes a new monthly presentation from the previous template:
    - Updates slide 1 cover month and year
    - Updates slide 5 SI gantt title
    - Resets slide 4 bullet points for a fresh start
    - Clears previous month's detail evidence slides
    """
    print(f"[INIT] Creating new monthly presentation for {month_name} {year} from {os.path.basename(src_path)}...")
    shutil.copyfile(src_path, dst_path)
    prs = Presentation(dst_path)

    # 1. Update Cover (Slide 1)
    if len(prs.slides) > 0:
        slide_cover = prs.slides[0]
        for shape in slide_cover.shapes:
            if shape.has_text_frame:
                for p in shape.text_frame.paragraphs:
                    if re.search(MONTH_REGEX_ID, p.text, re.IGNORECASE):
                        p.text = f"{month_name}  {year}"
                        for run in p.runs:
                            run.font.bold = True

    # 2. Update Slide 5 (Gantt SI title)
    if len(prs.slides) > 4:
        slide_gantt = prs.slides[4]
        for shape in slide_gantt.shapes:
            if shape.has_text_frame:
                if "work program or si" in shape.text.lower():
                    for p in shape.text_frame.paragraphs:
                        p.text = re.sub(
                            rf"{MONTH_REGEX_ID}\s*\d{{4}}",
                            f"{month_name.title()} {year}",
                            p.text,
                            flags=re.IGNORECASE
                        )

    # 3. Reset Slide 4 body bullets (keep title 'What We Have Done / List ( Evidance )')
    if len(prs.slides) > 3:
        slide_list = prs.slides[3]
        for shape in slide_list.shapes:
            if (shape.has_text_frame and 
                "hero ecosystem" in shape.text.lower() and 
                "one-chitra ecosystem" in shape.text.lower()):
                tf = shape.text_frame
                tf.clear()
                p1 = tf.paragraphs[0]
                p1.text = "HERO ECOSYSTEM"
                p1.font.bold = True
                p1.font.size = Pt(13)

                p_space = tf.add_paragraph()
                p_space.text = ""

                p2 = tf.add_paragraph()
                p2.text = "ONE-CHITRA ECOSYSTEM"
                p2.font.bold = True
                p2.font.size = Pt(13)

    # 4. Remove previous month's detail evidence slides (between Slide 5 and Planning slide)
    planning_idx = find_planning_slide_index(prs)
    slides_to_remove = list(range(5, planning_idx))

    # Remove in reverse order so indices do not shift unexpectedly
    for idx in reversed(slides_to_remove):
        rId = prs.slides._sldIdLst[idx].rId
        prs.part.drop_rel(rId)
        del prs.slides._sldIdLst[idx]

    prs.save(dst_path)
    print(f"[INIT] New monthly presentation initialized cleanly at {dst_path}")
    return dst_path

def append_to_slide_4(slide, title, system="HERO"):
    """Appends bullet point to Slide 4 under HERO ECOSYSTEM or ONE-CHITRA ECOSYSTEM."""
    target_box = None
    for shape in slide.shapes:
        if (shape.has_text_frame and 
            "hero ecosystem" in shape.text.lower() and 
            "one-chitra ecosystem" in shape.text.lower()):
            target_box = shape
            break

    if not target_box:
        print("[WARN] Slide 4 summary textbox not found, skipping bullet append.")
        return

    tf = target_box.text_frame
    bullet_text = f"\u2022  {title}"

    # Check if bullet already exists to avoid duplicate entries
    for p in tf.paragraphs:
        if title.lower() in p.text.lower():
            print(f"[SKIP] Bullet '{title}' already exists in Slide 4.")
            return

    new_p = tf.add_paragraph()
    new_p.text = bullet_text
    new_p.font.size = Pt(11)

    if system.upper() == "HERO":
        # Insert right after the last HERO bullet, before the empty line and ONE-CHITRA
        last_hero_p = None
        for p in tf.paragraphs:
            if "ONE-CHITRA" in p.text.upper():
                break
            if p.text.strip():
                last_hero_p = p
        if last_hero_p and last_hero_p != new_p:
            last_hero_p._p.addnext(new_p._p)
    else:
        # Appended at end for ONE-CHITRA
        pass

    print(f"[UPDATED] Added bullet to Slide 4 under {system} ECOSYSTEM: '{bullet_text}'")

def add_fitted_screenshot(slide, filename, left, top, width, height):
    picture = slide.shapes.add_picture(filename, left, top)
    image_width, image_height = picture.image.size
    scale = min(width / image_width, height / image_height)
    picture.width, picture.height = int(image_width * scale), int(image_height * scale)
    picture.left = left + (width - picture.width) // 2
    picture.top = top + (height - picture.height) // 2


def add_detail_slide(prs, title, description, screenshots, system="HERO"):
    """
    Creates a new detail slide with HERO Update / ONE-CHITRA Update badge,
    title, description, and 1 or 2 side-by-side screenshots.
    Inserts it right before 'Planning on next months'.
    """
    # Use layout 17 (2_Comparison) or fallback to 0
    layout_idx = 17 if len(prs.slide_layouts) > 17 else 0
    layout = prs.slide_layouts[layout_idx]
    slide = prs.slides.add_slide(layout)

    # Clear placeholders from layout
    for shape in list(slide.shapes):
        if shape.is_placeholder:
            sp = shape._element
            sp.getparent().remove(sp)

    # 1. Badge Top Right: "HERO Update" or "ONE-CHITRA Update"
    badge_box = slide.shapes.add_textbox(10000000, 165539, 1800000, 280000)
    p_badge = badge_box.text_frame.paragraphs[0]
    r_badge = p_badge.add_run()
    r_badge.text = f"{system} Update"
    r_badge.font.bold = True
    r_badge.font.size = Pt(12)
    # HERO Brand Blue #0753e7 or Slate
    r_badge.font.color.rgb = RGBColor(7, 83, 231) if system.upper() == "HERO" else RGBColor(15, 23, 42)

    # 2. Title & Description Box
    header_box = slide.shapes.add_textbox(380000, 680000, 11400000, 1050000)
    tf_header = header_box.text_frame
    tf_header.word_wrap = True

    p_title = tf_header.paragraphs[0]
    r_title = p_title.add_run()
    r_title.text = title
    r_title.font.bold = True
    r_title.font.size = Pt(18)
    r_title.font.color.rgb = RGBColor(15, 23, 42)

    if description:
        p_desc = tf_header.add_paragraph()
        p_desc.space_before = Pt(4)
        r_desc = p_desc.add_run()
        r_desc.text = description
        r_desc.font.size = Pt(11)
        r_desc.font.color.rgb = RGBColor(71, 85, 105)

    # 3. Add Screenshots
    valid_ss = [s for s in screenshots if os.path.exists(s)]
    
    if len(valid_ss) == 1:
        # Single wide screenshot centered
        ss_path = valid_ss[0]
        add_fitted_screenshot(slide,
            ss_path,
            left=2000000,
            top=1850000,
            width=8192000,
            height=4400000
        )
        print(f"[PICTURE] Embedded single wide screenshot: {ss_path}")
    elif len(valid_ss) >= 2:
        # Two screenshots side by side
        ss1 = valid_ss[0]
        ss2 = valid_ss[1]
        add_fitted_screenshot(slide,
            ss1,
            left=500000,
            top=1850000,
            width=5400000,
            height=4400000
        )
        add_fitted_screenshot(slide,
            ss2,
            left=6300000,
            top=1850000,
            width=5400000,
            height=4400000
        )
        print(f"[PICTURE] Embedded 2 screenshots side-by-side:\n  - {ss1}\n  - {ss2}")
    else:
        print("[WARN] No valid screenshot files found on disk to embed.")

    # 4. Reorder: move the newly created slide right before 'Planning on next months'
    planning_idx = find_planning_slide_index(prs)
    new_elem = prs.slides._sldIdLst[-1]
    prs.slides._sldIdLst.remove(new_elem)
    prs.slides._sldIdLst.insert(planning_idx, new_elem)

    actual_slide_num = planning_idx + 1
    print(f"[SLIDE CREATED] Placed '{title}' at Slide #{actual_slide_num} (before Planning slide).")
    return actual_slide_num

def update_monthly_presentation(title, description, screenshots, system="HERO", custom_month=None, custom_year=None):
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    monthly_dir = os.path.join(base_dir, "Monthly")
    os.makedirs(monthly_dir, exist_ok=True)

    now = datetime.now()
    month_num = custom_month if custom_month else now.month
    year_num = custom_year if custom_year else now.year
    month_name = MONTH_NAMES_ID.get(month_num, now.strftime("%B").upper())

    target_filename = f"MONTHLY {month_name} {year_num} SDS.pptx"
    target_path = os.path.join(monthly_dir, target_filename)

    # Initialize if target does not exist
    if not os.path.exists(target_path):
        latest_ppt = get_latest_existing_ppt(monthly_dir)
        initialize_new_month_presentation(latest_ppt, target_path, month_name, year_num)

    import io
    with open(target_path, "rb") as f:
        prs_stream = io.BytesIO(f.read())
    prs = Presentation(prs_stream)

    # Update Slide 4 bullet
    if len(prs.slides) > 3:
        append_to_slide_4(prs.slides[3], title, system=system)

    # Add detail evidence slide
    slide_num = add_detail_slide(prs, title, description, screenshots, system=system)

    prs.save(target_path)
    print(f"[SUCCESS] Monthly presentation successfully updated: {target_path}")
    return target_path, slide_num

def main():
    parser = argparse.ArgumentParser(description="Update HERO Monthly Presentation with Progress & E2E Evidence.")
    parser.add_argument("--title", required=True, help="Feature / Fix Title")
    parser.add_argument("--description", default="", help="Description of the change")
    parser.add_argument("--screenshots", nargs="*", default=[], help="Paths to 1 or 2 screenshots")
    parser.add_argument("--system", default="HERO", choices=["HERO", "ONE-CHITRA"], help="Target Ecosystem")
    parser.add_argument("--month", type=int, default=None, help="Month number (1-12)")
    parser.add_argument("--year", type=int, default=None, help="Year number (e.g. 2026)")

    args = parser.parse_args()

    target_path, slide_num = update_monthly_presentation(
        title=args.title,
        description=args.description,
        screenshots=args.screenshots,
        system=args.system,
        custom_month=args.month,
        custom_year=args.year
    )

    print("\n" + "="*60)
    print("MONTHLY PRESENTATION UPDATE SUMMARY")
    print("="*60)
    print(f"File      : {target_path}")
    print(f"Slide     : Slide #{slide_num}")
    print(f"Title     : {args.title}")
    print(f"Ecosystem : {args.system}")
    print(f"Evidence  : {len(args.screenshots)} screenshot(s)")
    print("="*60)

if __name__ == "__main__":
    main()
