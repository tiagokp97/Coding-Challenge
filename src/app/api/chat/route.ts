import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";


export async function POST(request: Request) {
  const { message } = await request.json();
  const response = await openai.chat.completions.create({
       model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: message }],
  });

  return NextResponse.json(response);
}

