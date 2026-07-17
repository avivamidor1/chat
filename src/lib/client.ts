import { treaty } from "@elysia/eden"
import type { App } from "../app/api/[[...slugs]]/route"

export const client = treaty<App>("localhost:3001").api