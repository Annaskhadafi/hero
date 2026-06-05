import ReactQuill, { Quill } from "react-quill-new";
import BlotFormatter from "quill-blot-formatter";

// Register the blot formatter module so images can be resized
if (Quill && !Quill.imports["modules/blotFormatter"]) {
  Quill.register("modules/blotFormatter", BlotFormatter);
}

export default ReactQuill;
