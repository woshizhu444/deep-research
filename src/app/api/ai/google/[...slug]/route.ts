import { NextResponse, type NextRequest } from "next/server";
import { shuffle } from "radash";

export const runtime = "edge";
export const preferredRegion = [
  "cle1",
  "iad1",
  "pdx1",
  "sfo1",
  "sin1",
  "syd1",
  "hnd1",
  "kix1",
];

const GOOGLE_GENERATIVE_AI_API_KEY = process.env
  .GOOGLE_GENERATIVE_AI_API_KEY as string;
const API_PROXY_BASE_URL =
  process.env.API_PROXY_BASE_URL || "https://generativelanguage.googleapis.com";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const searchParams = req.nextUrl.searchParams;
  const path = searchParams.getAll("slug");
  searchParams.delete("slug");
  const params = searchParams.toString();
  // Support multi-key polling,
  const apiKeys = shuffle(GOOGLE_GENERATIVE_AI_API_KEY?.split(",") || []);

  try {
    let url = `${API_PROXY_BASE_URL}/${path.join("/")}`;
    if (params) url += `?${params}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": req.headers.get("Content-Type") || "application/json",
        "x-goog-api-client":
          req.headers.get("x-goog-api-client") || "genai-js/0.24.0",
        "x-goog-api-key": apiKeys[0],
      },
      body: JSON.stringify(body),
    });
    return new NextResponse(response.body, response);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      return NextResponse.json(
        { code: 500, message: error.message },
        { status: 500 }
      );
    }
  }
}
