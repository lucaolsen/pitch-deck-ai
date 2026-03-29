import { NextResponse } from "next/server";
import { getDecksHistory, saveDecksHistory } from "@/lib/redis";

export async function GET() {
  try {
    const history = await getDecksHistory();
    return NextResponse.json({ success: true, history });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { history } = await req.json();
    if (!Array.isArray(history)) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }
    await saveDecksHistory(history);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
