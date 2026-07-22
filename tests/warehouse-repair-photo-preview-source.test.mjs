import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

test("warehouse repair photos use the upload proxy and UI fallback", () => {
  const action = readFileSync("app/actions/warehouse-repair.ts", "utf8")
  const client = readFileSync("app/dashboard/warehouse-repair/_components/warehouse-repair-client.tsx", "utf8")

  assert.match(action, /import \{ resolveUploadUrl \} from "@\/lib\/s3-storage"/)
  assert.match(action, /photoUrl: item\.photoUrl \? resolveUploadUrl\(item\.photoUrl\)/)
  assert.match(client, /resolveClientUploadUrl\(previewUrl \|\| form\.photoUrl\)/)
  assert.match(client, /set\("photoUrl", res\.url\)/)
  assert.match(client, /onError=\{\(\) => setPreviewError\(true\)\}/)
  assert.doesNotMatch(client, /Error loading preview/)
})
