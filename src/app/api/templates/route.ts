import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const templatesFilePath = path.join(process.cwd(), 'src', 'data', 'templates.json')

export async function GET() {
  try {
    const data = await fs.readFile(templatesFilePath, 'utf-8')
    return NextResponse.json(JSON.parse(data))
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Templates must be an array' }, { status: 400 })
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(templatesFilePath), { recursive: true })
    await fs.writeFile(templatesFilePath, JSON.stringify(body, null, 2), 'utf-8')

    return NextResponse.json({ success: true, templates: body })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error saving templates' },
      { status: 500 }
    )
  }
}
